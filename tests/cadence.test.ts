import { describe, expect, test } from "vitest";
import { buildDay, CADENCE, computeCadence, nextBusinessDay, stepLabel } from "../src/lib/cadence";

let n = 0;
function p(over: Record<string, unknown> = {}) {
  n++;
  return {
    _id: `id${n}`, _creationTime: 0, business: `Biz ${n}`, industry: "Plumbing", town: "Monroe", county: "Union County",
    fit: "Strong", sheetStatus: "Not contacted", dateSent: "", followUpDue: "", firstChannel: "", switchChannelOn: "",
    secondChannel: "", email: "owner@biz.com", phone: "(704) 555-0100", facebook: "https://facebook.com/biz", website: "biz.com",
    builtWith: "Wix", whatToMention: "", googleRating: "", reviews: "", lastReview: "", sheetNotes: "", importKey: "",
    ownerName: "", conceptBuilt: false, conceptUrl: "", callNotes: "", callStatus: "new", attempts: 0, nextCallAt: 0, updatedAt: 0,
    ...over,
  } as any;
}
const at = (day: number, h = 10) => new Date(2026, 10, day, h).getTime(); // November 2026
const email = (id: string, day: number, step?: number) => ({ _id: `t${day}${step ?? ""}`, prospectId: id, at: at(day, 9), channel: "Email", kind: step ? "followup" : "first", step }) as any;
const fb = (id: string, day: number) => ({ _id: `f${day}`, prospectId: id, at: at(day, 9), channel: "Facebook", kind: "first" }) as any;
const call = (id: string, day: number) => ({ prospectId: id, at: at(day, 15), outcome: "no_answer" }) as any;

describe("ABAB cadence", () => {
  test("a full round alternates email and call, one business day apart", () => {
    const x = p();
    const steps: string[] = [];
    const touches: any[] = [];
    const calls: any[] = [];
    // Mon Nov 23 .. walk the round, doing whatever is next on the day it's due
    let day = new Date(2026, 10, 23, 8);
    for (let i = 0; i < 9; i++) {
      const c = computeCadence(x, touches, calls, day);
      if (!c.next) break;
      expect(new Date(c.next.due).toDateString()).toBe(new Date(day).toDateString());
      steps.push(`${day.toDateString().slice(0, 10)} ${stepLabel(c.next)}`);
      const t = day.getTime();
      if (c.next.kind === "email") touches.push({ _id: `t${i}`, prospectId: x._id, at: t + 3600000, channel: "Email", kind: c.next.step ? "followup" : "first", step: c.next.step || undefined });
      else calls.push({ prospectId: x._id, at: t + 7 * 3600000, outcome: "no_answer" });
      day = new Date(nextBusinessDay(day.getTime()) + 8 * 3600000);
    }
    expect(steps).toEqual([
      "Mon Nov 23 First email",
      "Tue Nov 24 Call 1 of 3",
      "Wed Nov 25 Email follow-up 1 · Value add",
      "Mon Nov 30 Call 2 of 3", // Thanksgiving and the Friday after are skipped
      "Tue Dec 01 Email follow-up 2 · Direct request",
      "Wed Dec 02 Call 3 of 3",
      "Thu Dec 03 Email follow-up 3 · Close the loop",
    ]);
    const done = computeCadence(x, touches, calls, new Date(2026, 11, 4, 9));
    expect(done.state).toBe("resting");
    expect(new Date(done.restUntil!).toDateString()).toBe("Thu Jan 07 2027");
    // About 5 weeks later they come back for round 2
    const back = computeCadence(x, touches, calls, new Date(2027, 0, 7, 9));
    expect([back.state, back.round, back.next?.kind, back.next && stepLabel(back.next)]).toEqual(["new", 2, "email", "First email"]);
  });

  test("after an email, nothing else goes out until you've called", () => {
    const x = p();
    const c = computeCadence(x, [email(x._id, 20)], [], new Date(2026, 11, 10, 9));
    expect(c.next?.kind).toBe("call");
  });

  test("Facebook-only so far: email them next; no email on file: Facebook fills the email slots", () => {
    const a = p();
    const ca = computeCadence(a, [fb(a._id, 20)], [], new Date(2026, 10, 23, 9));
    expect([ca.next?.kind, ca.next && stepLabel(ca.next), ca.next?.reason]).toEqual(["email", "First email", "Messaged on Facebook Friday"]);

    const b = p({ email: "" });
    const cb = computeCadence(b, [fb(b._id, 20)], [], new Date(2026, 10, 23, 9));
    expect(cb.next?.kind).toBe("call");
    const cb2 = computeCadence(b, [fb(b._id, 20)], [call(b._id, 23)], new Date(2026, 10, 24, 9));
    expect(cb2.next && stepLabel(cb2.next)).toBe("Facebook follow-up");

    // Older prospects from the sheets count too
    const legacy = p({ sheetStatus: "Emailed", dateSent: "Nov 18, 2026", firstChannel: "Email" });
    expect(computeCadence(legacy, [], [], new Date(2026, 10, 23, 9)).next?.kind).toBe("call");
  });

  test("callbacks win, and replies or bookings stop everything", () => {
    const a = p({ callStatus: "callback", nextCallAt: at(24, 14) });
    const c = computeCadence(a, [email(a._id, 20)], [call(a._id, 23)], new Date(2026, 10, 23, 16));
    expect(c.next).toMatchObject({ kind: "call", callback: true, due: at(24, 14) });
    expect(computeCadence(p({ callStatus: "booked" }), [], [], new Date()).next).toBeNull();
    expect(computeCadence(p({ sheetStatus: "Replied" }), [], [], new Date()).next).toBeNull();
    expect(computeCadence(p({ callStatus: "bad_number", email: "", facebook: "" }), [], [], new Date()).next).toBeNull();
  });

  test("the day: call list, follow-ups due, and new prospects capped per day", () => {
    const now = new Date(2026, 10, 24, 8); // Tue
    const emailedYesterday = p({ business: "Emailed Mon" });
    const calledYesterday = p({ business: "Called Mon" });
    const callback = p({ business: "Callback", callStatus: "callback", nextCallAt: at(24, 11) });
    const later = p({ business: "Not yet", callStatus: "callback", nextCallAt: at(26, 11) });
    const phoneOnly = p({ business: "Phone only", email: "", facebook: "" });
    const fresh = Array.from({ length: 12 }, (_, i) => p({ business: `Fresh ${String(i).padStart(2, "0")}`, industry: `Trade ${i}` }));
    const prospects = [emailedYesterday, calledYesterday, callback, later, phoneOnly, ...fresh];
    const touches = [email(emailedYesterday._id, 23), email(calledYesterday._id, 20)];
    const calls = [call(calledYesterday._id, 23)];
    const day = buildDay(prospects, touches, calls, now, { dialGoal: 15, dialsToday: 0 });
    expect(day.calls.map((c) => c.p.business)).toEqual(["Callback", "Emailed Mon"]);
    expect(day.freshCalls.map((c) => c.p.business)).toEqual(["Phone only"]);
    const followUps = day.writes.filter((w) => !w.isNew);
    expect(followUps.map((w) => [w.p.business, stepLabel(w.c.next!)])).toEqual([["Called Mon", "Email follow-up 1 · Value add"]]);
    expect(day.writes.filter((w) => w.isNew)).toHaveLength(CADENCE.newPerDay);

    // Starting some today shrinks what's left
    const started = [email(fresh[0]._id, 24), email(fresh[1]._id, 24)];
    const day2 = buildDay(prospects, [...touches, ...started], calls, new Date(2026, 10, 24, 12));
    expect(day2.newStartedToday).toBe(2);
    expect(day2.writes.filter((w) => w.isNew)).toHaveLength(CADENCE.newPerDay - 2);
  });

  test("their reply ends the round; not right now comes back in about 2 months", () => {
    const a = p({ sheetStatus: "Not interested", callStatus: "not_interested" });
    const reply = { _id: "r1", prospectId: a._id, at: at(23, 6), channel: "Facebook", kind: "reply", outcome: "Not interested" } as any;
    expect(computeCadence(a, [fb(a._id, 20), reply], [], new Date(2026, 10, 24)).state).toBe("closed");

    const b = p({ sheetStatus: "Not right now" });
    const r2 = { ...reply, prospectId: b._id, outcome: "Not right now" };
    const resting = computeCadence(b, [fb(b._id, 20), r2], [], new Date(2026, 10, 24));
    expect(resting.state).toBe("resting");
    expect(new Date(resting.restUntil!).toDateString()).toBe("Fri Jan 22 2027");
    const back = computeCadence(b, [fb(b._id, 20), r2], [], new Date(2027, 0, 22, 9));
    expect([back.state, back.round, back.next?.kind]).toEqual(["new", 2, "email"]);
  });
});
