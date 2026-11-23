import { convexTest } from "convex-test";
import { beforeEach, describe, expect, test, vi } from "vitest";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";

const modules = import.meta.glob("../convex/**/*.ts");
const key = "test-code";

const blank = {
  business: "", industry: "Plumbing", town: "Monroe", fit: "Strong", sheetStatus: "Not contacted",
  dateSent: "", followUpDue: "", firstChannel: "", switchChannelOn: "", secondChannel: "",
  email: "", phone: "", facebook: "", website: "", builtWith: "", whatToMention: "",
  googleRating: "", reviews: "", lastReview: "", sheetNotes: "",
};

beforeEach(() => {
  vi.stubEnv("APP_PASSCODE", key);
});

describe("access code", () => {
  test("wrong code is rejected", async () => {
    const t = convexTest(schema, modules);
    await expect(t.query(api.prospects.list, { key: "nope" })).rejects.toThrow(/Wrong access code/);
    expect(await t.query(api.settings.check, { key: "nope" })).toEqual({ ok: false, configured: true });
    expect(await t.query(api.settings.check, { key })).toEqual({ ok: true, configured: true });
  });
});

describe("import", () => {
  test("adds new rows, updates existing ones without touching call data", async () => {
    const t = convexTest(schema, modules);
    const rows = [
      { ...blank, business: "Master Tech Plumbing", phone: "(704) 776-4922" },
      { ...blank, business: "Harvey's Plumbing", phone: "(704) 843-4783", sheetStatus: "Emailed", dateSent: "Nov 17, 2026" },
      { ...blank, business: "" },
    ];
    expect(await t.mutation(api.importer.importRows, { key, county: "Union County", rows })).toEqual({ added: 2, updated: 0, skipped: 1 });
    const [first] = await t.query(api.prospects.list, { key });
    await t.mutation(api.prospects.update, { key, id: first._id, patch: { ownerName: "Ricky", conceptUrl: "https://example.com" } });
    const again = await t.mutation(api.importer.importRows, {
      key, county: "Union County",
      rows: [{ ...rows[0], sheetNotes: "new note" }, { ...rows[1], business: "Harvey’s Plumbing" }],
    });
    expect(again).toEqual({ added: 0, updated: 2, skipped: 0 });
    const all = await t.query(api.prospects.list, { key });
    expect(all).toHaveLength(2);
    const mt = all.find((p) => p.business === "Master Tech Plumbing")!;
    expect(mt.sheetNotes).toBe("new note");
    expect(mt.ownerName).toBe("Ricky");
    expect(mt.conceptBuilt).toBe(true);
  });
});

describe("outreach logging", () => {
  test("first touch sets dates, a different channel later becomes the second channel", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.importer.importRows, { key, county: "Union County", rows: [{ ...blank, business: "New Co", phone: "7045559999" }] });
    const [p] = await t.query(api.prospects.list, { key });
    await t.mutation(api.prospects.logOutreach, { key, id: p._id, channel: "Email", followUpDue: "Nov 24, 2026" });
    let after = await t.query(api.prospects.get, { key, id: p._id });
    expect(after!.sheetStatus).toBe("Emailed");
    expect(after!.followUpDue).toBe("Nov 24, 2026");
    let touches = await t.query(api.prospects.touches, { key, id: p._id });
    expect(touches.map((x: any) => [x.channel, x.kind])).toEqual([["Email", "first"]]);
    await t.mutation(api.prospects.logFollowUp, { key, id: p._id, channel: "Email", step: 1, sheetStatus: "Email F1 sent", followUpDue: "Nov 26, 2026" });
    touches = await t.query(api.prospects.touches, { key, id: p._id });
    expect(touches[0]).toMatchObject({ channel: "Email", kind: "followup", step: 1 });
    expect((await t.query(api.prospects.get, { key, id: p._id }))!.sheetStatus).toBe("Email F1 sent");
    // Their response closes it out
    await t.mutation(api.prospects.logResponse, { key, id: p._id, channel: "Facebook", outcome: "Not interested", note: "Went with someone else" });
    const closed = await t.query(api.prospects.get, { key, id: p._id });
    expect([closed!.sheetStatus, closed!.callStatus]).toEqual(["Not interested", "not_interested"]);
    expect((await t.query(api.prospects.touches, { key, id: p._id }))[0]).toMatchObject({ kind: "reply", outcome: "Not interested", note: "Went with someone else" });
    expect(after!.firstChannel).toBe("Email");
    expect(after!.dateSent).toMatch(/^[A-Z][a-z]{2} \d{1,2}, \d{4}$/);
    expect(after!.followUpDue).not.toBe("");
    await t.mutation(api.prospects.logOutreach, { key, id: p._id, channel: "Facebook", note: "template C" });
    after = await t.query(api.prospects.get, { key, id: p._id });
    expect(after!.sheetStatus).toBe("Messaged on Facebook");
    expect(after!.firstChannel).toBe("Email");
    expect(after!.secondChannel).toMatch(/^Facebook \(/);
    // Notes stay yours; the send goes in the history instead
    expect(after!.sheetNotes).toBe("");
    const latest = (await t.query(api.prospects.touches, { key, id: p._id }))[0];
    expect(latest).toMatchObject({ channel: "Facebook", kind: "switch", note: "template C" });
    await t.mutation(api.prospects.update, { key, id: p._id, patch: { sheetNotes: "edited", dateSent: "Nov 1, 2026" } });
    after = await t.query(api.prospects.get, { key, id: p._id });
    expect(after!.sheetNotes).toBe("edited");
  });
});

describe("queue and call logging", () => {
  async function seed() {
    const t = convexTest(schema, modules);
    await t.mutation(api.importer.importRows, {
      key, county: "Union County",
      rows: [
        { ...blank, business: "Lower Fit Co", phone: "7045550001", fit: "Lower" },
        { ...blank, business: "Skip Me", phone: "7045550002", fit: "Skip" },
        { ...blank, business: "No Phone", phone: "" },
        { ...blank, business: "Good Fit Co", phone: "7045550003", fit: "Good" },
        { ...blank, business: "Emailed Strong", phone: "7045550004", sheetStatus: "Emailed", dateSent: "Nov 18, 2026" },
        { ...blank, business: "Cabarrus Co", phone: "7045550005", fit: "Good" },
      ],
    });
    return t;
  }

  test("orders by prior touch and fit, hides Skip, Lower and missing phones", async () => {
    const t = await seed();
    const now = Date.now();
    const q = await t.query(api.queue.next, { key, now, includeLower: false, conceptOnly: false, excludeIds: [] });
    expect(q.current?.business).toBe("Emailed Strong");
    expect(q.remaining).toBe(3);
    const withLower = await t.query(api.queue.next, { key, now, includeLower: true, conceptOnly: false, excludeIds: [] });
    expect(withLower.remaining).toBe(4);
  });

  test("concept built jumps the line, and excludeIds skips for the session", async () => {
    const t = await seed();
    const list = await t.query(api.prospects.list, { key });
    const good = list.find((p) => p.business === "Good Fit Co")!;
    await t.mutation(api.prospects.update, { key, id: good._id, patch: { conceptBuilt: true } });
    const now = Date.now();
    let q = await t.query(api.queue.next, { key, now, includeLower: false, conceptOnly: false, excludeIds: [] });
    expect(q.current?.business).toBe("Good Fit Co");
    q = await t.query(api.queue.next, { key, now, includeLower: false, conceptOnly: false, excludeIds: [good._id] });
    expect(q.current?.business).toBe("Emailed Strong");
    const only = await t.query(api.queue.next, { key, now, includeLower: false, conceptOnly: true, excludeIds: [] });
    expect(only.remaining).toBe(1);
  });

  test("no answer pushes to tomorrow, callback lands at the chosen time, undo restores", async () => {
    const t = await seed();
    const now = Date.now();
    let q = await t.query(api.queue.next, { key, now, includeLower: false, conceptOnly: false, excludeIds: [] });
    const id = q.current!._id;
    const { callId } = await t.mutation(api.calls.log, { key, prospectId: id, outcome: "no_answer", note: "" });
    let p = await t.query(api.prospects.get, { key, id });
    expect(p!.attempts).toBe(1);
    expect(p!.callStatus).toBe("calling");
    expect(p!.nextCallAt).toBeGreaterThan(now + 20 * 3600e3);
    q = await t.query(api.queue.next, { key, now: Date.now(), includeLower: false, conceptOnly: false, excludeIds: [] });
    expect(q.current?._id).not.toBe(id);

    await t.mutation(api.calls.undo, { key, callId });
    p = await t.query(api.prospects.get, { key, id });
    expect(p!.attempts).toBe(0);
    expect(p!.callStatus).toBe("new");

    const at = now + 3 * 3600e3;
    await t.mutation(api.calls.log, { key, prospectId: id, outcome: "front_desk", note: "Ask for Leo", callbackAt: at });
    p = await t.query(api.prospects.get, { key, id });
    expect(p!.callStatus).toBe("callback");
    expect(p!.nextCallAt).toBe(at);
    q = await t.query(api.queue.next, { key, now: at + 1000, includeLower: false, conceptOnly: false, excludeIds: [] });
    expect(q.current?._id).toBe(id); // due callbacks come first
    expect(q.history[0].note).toBe("Ask for Leo");
  });

  test("sixth missed call retires the prospect", async () => {
    const t = await seed();
    const id = (await t.query(api.queue.next, { key, now: Date.now(), includeLower: false, conceptOnly: false, excludeIds: [] })).current!._id;
    for (let i = 0; i < 6; i++) {
      await t.mutation(api.calls.log, { key, prospectId: id, outcome: i % 2 ? "voicemail" : "no_answer", note: "" });
    }
    const p = await t.query(api.prospects.get, { key, id });
    expect(p!.callStatus).toBe("no_contact");
  });

  test("booking creates a meeting, undo removes it, no-show puts them back in the queue", async () => {
    const t = await seed();
    const id = (await t.query(api.queue.next, { key, now: Date.now(), includeLower: false, conceptOnly: false, excludeIds: [] })).current!._id;
    const meeting = { startsAt: Date.now() + 86400e3, durationMin: 15, format: "video" as const, email: "a@b.com", inviteSent: true, accepted: false };
    await expect(t.mutation(api.calls.log, { key, prospectId: id, outcome: "booked", note: "" })).rejects.toThrow(/meeting details/);
    const { callId } = await t.mutation(api.calls.log, { key, prospectId: id, outcome: "booked", note: "", meeting });
    let meetings = await t.query(api.meetings.list, { key });
    expect(meetings).toHaveLength(1);
    expect(await t.query(api.meetings.forProspect, { key, prospectId: id })).toHaveLength(1);
    expect(meetings[0].prospect?.callStatus).toBe("booked");
    await t.mutation(api.calls.undo, { key, callId });
    expect(await t.query(api.meetings.list, { key })).toHaveLength(0);

    await t.mutation(api.calls.log, { key, prospectId: id, outcome: "booked", note: "", meeting });
    meetings = await t.query(api.meetings.list, { key });
    await t.mutation(api.meetings.update, { key, id: meetings[0]._id, patch: { status: "no_show" } });
    const p = await t.query(api.prospects.get, { key, id });
    expect(p!.callStatus).toBe("callback");
  });

  test("do not call never comes back", async () => {
    const t = await seed();
    const id = (await t.query(api.queue.next, { key, now: Date.now(), includeLower: false, conceptOnly: false, excludeIds: [] })).current!._id;
    await t.mutation(api.calls.log, { key, prospectId: id, outcome: "do_not_call", note: "" });
    const later = await t.query(api.queue.next, { key, now: Date.now() + 400 * 86400e3, includeLower: true, conceptOnly: false, excludeIds: [] });
    expect([later.current, ...later.upNext].map((x) => x?._id)).not.toContain(id);
    const stats = await t.query(api.calls.since, { key, since: 0 });
    expect(stats).toHaveLength(1);
  });
});

describe("scripts", () => {
  test("save overrides by key, remove resets", async () => {
    const t = convexTest(schema, modules);
    const s = { key: "facebook.A", category: "facebook", title: "Template A", body: "Hey {business}", order: 1, custom: false };
    await t.mutation(api.scripts.save, { key, script: s });
    await t.mutation(api.scripts.save, { key, script: { ...s, body: "Edited" } });
    let rows = await t.query(api.scripts.list, { key });
    expect(rows).toHaveLength(1);
    expect(rows[0].body).toBe("Edited");
    await expect(t.mutation(api.scripts.save, { key, script: { ...s, body: " " } })).rejects.toThrow(/empty/);
    await t.mutation(api.scripts.remove, { key, scriptKey: "facebook.A" });
    rows = await t.query(api.scripts.list, { key });
    expect(rows).toHaveLength(0);
  });
});

describe("call reviews", () => {
  test("no-answers aren't kept; a finished review adds notes and the owner's name to the profile", async () => {
    vi.useFakeTimers();
    const t = convexTest(schema, modules);
    await t.mutation(api.importer.importRows, { key, county: "Union County", rows: [{ ...blank, business: "Review Me Plumbing", phone: "(704) 555-0100" }] });
    const [p] = await t.query(api.prospects.list, { key });
    const store = () => t.run(async (ctx) => ctx.storage.store(new Blob(["audio"], { type: "audio/webm" })));

    // No answer: audio is thrown away
    const { callId: c1 } = await t.mutation(api.calls.log, { key, prospectId: p._id, outcome: "no_answer", note: "" });
    expect(await t.mutation(api.reviews.attach, { key, callId: c1, mine: await store(), theirs: await store(), durationSec: 40, scriptText: "" })).toEqual({ started: false });
    expect(await t.run((ctx) => ctx.db.query("recordings").collect())).toHaveLength(0);

    // A real conversation starts a review (no API keys here, so it fails with a clear message)
    const { callId: c2 } = await t.mutation(api.calls.log, { key, prospectId: p._id, outcome: "not_now", note: "" });
    expect(await t.mutation(api.reviews.attach, { key, callId: c2, mine: await store(), theirs: await store(), durationSec: 95, scriptText: "Hey" })).toEqual({ started: true });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    let call = await t.run((ctx) => ctx.db.get(c2));
    expect(call!.reviewStatus).toBe("error");
    expect(call!.reviewError).toMatch(/OPENAI_API_KEY/);

    // Saving a review writes the notes to the profile
    await t.mutation(internal.reviews.save, {
      callId: c2,
      transcript: [{ who: "me", start: 0, text: "Hey Mike" }, { who: "them", start: 2, text: "Yeah" }],
      review: { summary: "Short call.", notes: ["Owner is Mike.", "Nephew built the site."], ownerName: "Mike", score: 7 },
    });
    call = await t.run((ctx) => ctx.db.get(c2));
    expect(call!.reviewStatus).toBe("done");
    const after = await t.query(api.prospects.get, { key, id: p._id });
    expect(after!.ownerName).toBe("Mike");
    expect(after!.callNotes).toMatch(/call: Owner is Mike\. Nephew built the site\.$/);

    // Undoing the call deletes its audio
    await t.mutation(api.calls.undo, { key, callId: c2 });
    expect(await t.run((ctx) => ctx.db.query("recordings").collect())).toHaveLength(0);
    vi.useRealTimers();
  });
});
