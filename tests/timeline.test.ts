import { describe, expect, test } from "vitest";
import { buildTimeline, dayLabel, freeNotes, type NextUp } from "../src/lib/timeline";
import { computeCadence, stepLabel } from "../src/lib/cadence";

function nextFor(prospect: any, touches: any[], calls: any[], now: Date): NextUp {
  const c = computeCadence(prospect, touches, calls, now);
  if (!c.next) return c.state === "resting" && c.restUntil ? { kind: "rest", until: c.restUntil, round: c.round } : null;
  return { kind: c.next.kind, title: stepLabel(c.next), reason: c.next.reason, due: c.next.due, callback: c.next.kind === "call" ? c.next.callback : undefined };
}

function p(over: Record<string, unknown> = {}) {
  return {
    _id: "p1", _creationTime: 0, business: "Harvey's Plumbing", industry: "Plumbing", town: "Monroe", county: "Union County",
    fit: "Strong", sheetStatus: "Not contacted", dateSent: "", followUpDue: "", firstChannel: "", switchChannelOn: "",
    secondChannel: "", email: "h@h.com", phone: "", facebook: "", website: "h.com", builtWith: "Wix", whatToMention: "",
    googleRating: "", reviews: "", lastReview: "", sheetNotes: "", importKey: "", ownerName: "", conceptBuilt: false,
    conceptUrl: "", callNotes: "", callStatus: "new", attempts: 0, nextCallAt: 0, updatedAt: 0, ...over,
  } as any;
}
const now = new Date(2026, 10, 21, 21, 0); // Sat Nov 21, 2026
const at = (d: number, h = 10) => new Date(2026, 10, d, h).getTime();

describe("history timeline", () => {
  test("older outreach comes from the sheet fields, with the coming-up items", () => {
    const prospect = p({
      sheetStatus: "Messaged on Facebook", dateSent: "Nov 20, 2026", firstChannel: "Facebook",
      followUpDue: "Nov 27, 2026", switchChannelOn: "Dec 4, 2026",
      sheetNotes: "Added Nov 19. Facebook message sent Nov 20, template B (no-website version).",
    });
    const t = buildTimeline(prospect, [], [], [], now, nextFor(prospect, [], [], now));
    expect(t.past.map((i) => [i.lane, i.title])).toEqual([["Facebook", "First Facebook message"]]);
    expect(t.past[0].timeKnown).toBe(false);
    // Messaged on Facebook only, so the next touch is an email on the next business day
    expect(t.upcoming.map((i) => [i.lane, i.title, i.detail, dayLabel(i.at, now)])).toEqual([
      ["Email", "First email", "Messaged on Facebook yesterday", "Mon, Nov 23"],
    ]);
    // Freeform notes stay in the notes box
    expect(freeNotes(prospect.sheetNotes)).toBe(prospect.sheetNotes);
  });

  test("logged touches, calls, meetings and the old dated note lines merge without duplicates", () => {
    const prospect = p({
      sheetStatus: "Email F1 sent", dateSent: "Nov 17, 2026", firstChannel: "Email", followUpDue: "Nov 20, 2026",
      switchChannelOn: "Dec 1, 2026", secondChannel: "Facebook (Nov 19, 2026)", callStatus: "callback", nextCallAt: at(23, 9), phone: "(704) 555-0100",
      sheetNotes: "Owner is Harvey.\nNov 17, 2026: Email sent. email 1A\nNov 19, 2026: Followed up by Facebook.",
    });
    const touches = [
      { _id: "t1", _creationTime: 0, prospectId: "p1", at: at(19, 15), channel: "Email", kind: "followup", step: 1 },
      { _id: "t2", _creationTime: 0, prospectId: "p1", at: at(19, 9), channel: "Facebook", kind: "switch" },
    ] as any;
    const calls = [{ _id: "c1", prospectId: "p1", outcome: "no_answer", note: "Rang out", at: at(20, 11), day: "", prev: {} }] as any;
    const meetings = [{ _id: "m1", prospectId: "p1", startsAt: at(24, 14), durationMin: 15, format: "video", email: "", inviteSent: true, accepted: true, prepCallDone: false, status: "scheduled", note: "", createdAt: 0 }] as any;
    const t = buildTimeline(prospect, touches, calls, meetings, now, nextFor(prospect, touches, calls, now));
    expect(t.past.map((i) => i.title)).toEqual([
      "No answer",
      "Email follow-up 1",
      "Facebook follow-up",
      "Switched to Facebook",
      "First email",
    ]);
    expect(t.past.find((i) => i.title === "First email")!.detail).toBe("email 1A");
    expect(t.past.find((i) => i.title === "Email follow-up 1")!.detail).toBe("Value add");
    // A callback time beats the cadence
    expect(t.upcoming.map((i) => [i.title, !!i.overdue])).toEqual([
      ["Callback", false],
      ["Meeting", false],
    ]);
    expect(freeNotes(prospect.sheetNotes)).toBe("Owner is Harvey.");
  });

  test("closed prospects have nothing coming up", () => {
    const prospect = p({ sheetStatus: "Emailed", dateSent: "Nov 17, 2026", firstChannel: "Email", followUpDue: "Nov 20, 2026", switchChannelOn: "Dec 1, 2026", callStatus: "not_interested" });
    expect(buildTimeline(prospect, [], [], [], now, nextFor(prospect, [], [], now)).upcoming).toEqual([]);
  });

  test("day labels", () => {
    expect(dayLabel(at(21), now)).toBe("Today");
    expect(dayLabel(at(20), now)).toBe("Yesterday");
    expect(dayLabel(at(22), now)).toBe("Tomorrow");
    expect(dayLabel(new Date(2025, 11, 1).getTime(), now)).toBe("Mon, Dec 1, 2025");
  });

  test("their reply is the last line of the history", () => {
    const prospect = p({ sheetStatus: "Not interested", callStatus: "not_interested", dateSent: "Nov 20, 2026", firstChannel: "Facebook" });
    const touches = [{ _id: "r", _creationTime: 0, prospectId: "p1", at: at(23, 5), channel: "Facebook", kind: "reply", outcome: "Not interested", note: "Signed with someone else" }] as any;
    const t = buildTimeline(prospect, touches, [], [], new Date(2026, 10, 23, 9), nextFor(prospect, touches, [], new Date(2026, 10, 23, 9)));
    expect(t.past.map((i) => [i.title, i.detail, !!i.reply])).toEqual([
      ["They replied on Facebook", "Not interested · Signed with someone else", true],
      ["First Facebook message", undefined, false],
    ]);
    expect(t.upcoming).toEqual([]);
  });
});
