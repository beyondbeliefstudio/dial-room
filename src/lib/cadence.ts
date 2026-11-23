// Connor Murray's ABAB cadence, one prospect at a time.
//
// Each round alternates written touches and calls, one business day apart:
//   email, call, follow-up 1, call, follow-up 2, call, follow-up 3   (4 emails + 3 calls)
// After an email you call before anything else goes out. Someone you've only messaged on
// Facebook gets an email next. Prospects with no email get Facebook messages instead
// (first message + one follow-up), and prospects with neither just get calls.
// A round ends after its last touch, and anyone who never replied comes back for a new
// round about five weeks later. Replies, bookings and no's stop everything.
import type { Doc } from "../../convex/_generated/dataModel";
import { addDays, isBusinessDay, startOfDay } from "./dates";
import { emails, phoneDigits, toUrl } from "./links";
import { writtenEvents, type WrittenEvent } from "./timeline";

type P = Doc<"prospects">;
type Touch = Pick<Doc<"touches">, "_id" | "at" | "channel" | "kind" | "step" | "note" | "prospectId"> & { outcome?: string };
type Call = { prospectId: string; at: number; outcome: Doc<"calls">["outcome"] };

export const CADENCE = {
  emailsPerRound: 4, // first email + 3 follow-ups
  facebookPerRound: 2, // first message + 1 follow-up, when there's no email
  callsPerRound: 3,
  roundGapDays: 21, // a quiet gap this long starts a new round
  recycleDays: 35, // non-responders come back after about 5 weeks
  notNowDays: 60, // "not right now" comes back after about 2 months
  newPerDay: 8, // new prospects started each day
  countyOrder: ["Union County", "Cabarrus County", "Lancaster County", "Stanly County"],
};

const NO_FB_MESSAGES = /(doesn'?t|does not|won'?t|can'?t|cannot)\s+(accept|take|receive)\s+messages|messages\s+(can'?t|cannot)\s+be\s+sent|can'?t\s+be\s+messaged|save (it|them) for email/i;
const CONFIRM_ACTIVE = /confirm\s+(they'?re|they are|it'?s|still)\s*(still\s+)?(active|open|in business)/i;
const CLOSED_CALL = new Set(["booked", "won", "not_interested", "do_not_call"]);
const CLOSED_SHEET = new Set(["Replied", "Call booked", "Won", "Not interested"]);
export const NOT_NOW = "Not right now";

export const canEmail = (p: P) => emails(p.email).length > 0;
export const canFacebook = (p: P) => !!toUrl(p.facebook) && !NO_FB_MESSAGES.test(p.sheetNotes);
export const canCall = (p: P) => phoneDigits(p.phone).length >= 10 && p.callStatus !== "bad_number" && p.callStatus !== "do_not_call";

export function isClosed(p: P): boolean {
  return CLOSED_CALL.has(p.callStatus) || CLOSED_SHEET.has(p.sheetStatus) || p.fit === "Skip";
}

/** Start of the next business day after `ms` (skips weekends and holidays). */
export function nextBusinessDay(ms: number, count = 1): number {
  let d = startOfDay(new Date(ms));
  let n = 0;
  while (n < count) {
    d = addDays(d, 1);
    if (isBusinessDay(d)) n++;
  }
  return d.getTime();
}

export type Step =
  | { kind: "email"; step: 0 | 1 | 2 | 3 } // 0 = first email, 1-3 = follow-ups
  | { kind: "facebook"; step: 0 | 1 } // 0 = first message, 1 = follow-up
  | { kind: "call"; number: number; callback?: boolean };

export type Cadence = {
  round: number; // 1 for the first pass, 2+ for recycled prospects
  state: "new" | "active" | "resting" | "closed" | "stuck";
  next: (Step & { due: number; reason: string }) | null;
  emails: number;
  facebook: number;
  calls: number;
  lastAt?: number;
  roundStart?: number;
  restUntil?: number;
};

type Ev = { at: number; kind: "Email" | "Facebook" | "Other" | "Call" };

function stepLabel(s: Step): string {
  if (s.kind === "call") return s.callback ? "Callback" : `Call ${s.number} of ${CADENCE.callsPerRound}`;
  if (s.kind === "facebook") return s.step === 0 ? "First Facebook message" : "Facebook follow-up";
  return ["First email", "Email follow-up 1 · Value add", "Email follow-up 2 · Direct request", "Email follow-up 3 · Close the loop"][s.step];
}
export { stepLabel };

function weekdayWord(ms: number, now: Date): string {
  const days = Math.round((startOfDay(now).getTime() - startOfDay(new Date(ms)).getTime()) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return new Date(ms).toLocaleDateString("en-US", { weekday: "long" });
  return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** The first written touch for a fresh round, or a cold call when there's no way to write. */
function firstStep(p: P, now: Date, round: number): Cadence["next"] {
  const due = startOfDay(now).getTime();
  const again = round > 1 ? ` (round ${round})` : "";
  if (canEmail(p)) return { kind: "email", step: 0, due, reason: `New${again}` };
  if (canFacebook(p)) return { kind: "facebook", step: 0, due, reason: `New${again}, no email on file` };
  if (canCall(p)) return { kind: "call", number: 1, due, reason: `New${again}, no email or Facebook` };
  return null;
}

export function computeCadence(p: P, touches: Touch[], calls: Call[], now = new Date()): Cadence {
  const all: WrittenEvent[] = writtenEvents(p, touches as Doc<"touches">[]);
  const replies = all.filter((w) => w.kind === "reply");
  const written = all.filter((w) => w.kind !== "reply");
  const events: Ev[] = [
    ...written.map((w) => ({ at: w.at, kind: w.channel === "Email" ? "Email" : w.channel === "Facebook" ? "Facebook" : "Other" }) as Ev),
    ...calls.map((c) => ({ at: c.at, kind: "Call" as const })),
  ].sort((a, b) => a.at - b.at);

  // Split into rounds on long quiet gaps
  const rounds: Ev[][] = [];
  for (const e of events) {
    const cur = rounds[rounds.length - 1];
    if (cur && e.at - cur[cur.length - 1].at < CADENCE.roundGapDays * 86400000) cur.push(e);
    else rounds.push([e]);
  }
  const current = rounds[rounds.length - 1] ?? [];
  const nE = current.filter((e) => e.kind === "Email").length;
  const nF = current.filter((e) => e.kind === "Facebook" || e.kind === "Other").length;
  const nC = current.filter((e) => e.kind === "Call").length;
  const last = current[current.length - 1];
  const base = { emails: nE, facebook: nF, calls: nC, lastAt: last?.at, roundStart: current[0]?.at };

  if (isClosed(p)) return { round: Math.max(1, rounds.length), state: "closed", next: null, ...base };

  // "Not right now": rest a couple of months from their reply, then a fresh round
  const replyAt = replies.length ? replies[replies.length - 1].at : (last?.at ?? now.getTime());
  const notNowUntil = startOfDay(new Date(replyAt + CADENCE.notNowDays * 86400000)).getTime();
  if (p.sheetStatus === NOT_NOW && !(last && last.at >= notNowUntil)) {
    const restUntil = notNowUntil;
    if (now.getTime() < restUntil) return { round: Math.max(1, rounds.length), state: "resting", next: null, restUntil, ...base };
    const nextRound = rounds.length + 1;
    return { round: nextRound, state: "new", next: firstStep(p, now, nextRound), ...base, emails: 0, facebook: 0, calls: 0 };
  }

  // A callback time always wins
  if (p.callStatus === "callback" && p.nextCallAt && canCall(p)) {
    return {
      round: Math.max(1, rounds.length),
      state: "active",
      next: { kind: "call", number: nC + 1, callback: true, due: p.nextCallAt, reason: "Asked for a callback" },
      ...base,
    };
  }

  if (!last) return { round: 1, state: "new", next: firstStep(p, now, 1), ...base };

  const writtenLeft = canEmail(p) ? nE < CADENCE.emailsPerRound : canFacebook(p) ? nF < CADENCE.facebookPerRound : false;
  const callsLeft = canCall(p) && nC < CADENCE.callsPerRound;
  const writtenStep = (): Step =>
    canEmail(p) ? { kind: "email", step: Math.min(nE, 3) as 0 | 1 | 2 | 3 } : { kind: "facebook", step: Math.min(nF, 1) as 0 | 1 };
  const when = weekdayWord(last.at, now);

  let next: Cadence["next"] = null;
  if (last.kind === "Email") {
    if (callsLeft) next = { kind: "call", number: nC + 1, due: nextBusinessDay(last.at), reason: `Emailed ${when}` };
    else if (writtenLeft) next = { ...writtenStep(), due: nextBusinessDay(last.at, 2), reason: `Emailed ${when}` };
  } else if (last.kind === "Facebook" || last.kind === "Other") {
    if (canEmail(p) && nE === 0) next = { kind: "email", step: 0, due: nextBusinessDay(last.at), reason: `Messaged on Facebook ${when}` };
    else if (callsLeft) next = { kind: "call", number: nC + 1, due: nextBusinessDay(last.at), reason: `Messaged on Facebook ${when}` };
    else if (writtenLeft) next = { ...writtenStep(), due: nextBusinessDay(last.at, 2), reason: `Messaged on Facebook ${when}` };
  } else {
    if (writtenLeft) next = { ...writtenStep(), due: nextBusinessDay(last.at), reason: `Called ${when}` };
    else if (callsLeft) next = { kind: "call", number: nC + 1, due: nextBusinessDay(last.at, 2), reason: `Called ${when}` };
  }

  if (next) return { round: rounds.length, state: "active", next, ...base };

  // Round finished with no reply: rest, then start a new round
  const restUntil = startOfDay(new Date(last.at + CADENCE.recycleDays * 86400000)).getTime();
  if (now.getTime() >= restUntil) {
    const nextRound = rounds.length + 1;
    return { round: nextRound, state: "new", next: firstStep(p, now, nextRound), ...base, emails: 0, facebook: 0, calls: 0 };
  }
  return { round: rounds.length, state: "resting", next: null, restUntil, ...base };
}

export type CallItem = { p: P; c: Cadence; fresh?: boolean };
export type WriteItem = { p: P; c: Cadence; isNew: boolean };

export type DayPlan = {
  calls: CallItem[];
  freshCalls: CallItem[];
  writes: WriteItem[];
  newStartedToday: number;
  newLeft: number;
  cadences: Map<string, Cadence>;
};

const countyRank = (c: string) => {
  const i = CADENCE.countyOrder.indexOf(c);
  return i === -1 ? CADENCE.countyOrder.length : i;
};
const fitRank = (p: P) => (p.fit === "Strong" ? 0 : p.fit === "Good" ? 1 : 2);

/**
 * Today's lists: who to call, and who to email or message.
 * Calls: callbacks first, then everyone whose next touch is a call. Fresh call-only prospects
 * fill the list up to the dial goal. Writes: follow-ups due, then up to `newPerDay` new prospects
 * (county order, Strong first, one per industry per county per day).
 */
export function buildDay(
  prospects: P[],
  touches: Touch[],
  calls: Call[],
  now = new Date(),
  opts: { skipped?: Set<string>; dialGoal?: number; dialsToday?: number } = {},
): DayPlan {
  const skipped = opts.skipped ?? new Set<string>();
  const endOfToday = startOfDay(now).getTime() + 86400000 - 1;
  const today = startOfDay(now).getTime();
  const touchesBy = new Map<string, Touch[]>();
  for (const t of touches) touchesBy.set(t.prospectId, [...(touchesBy.get(t.prospectId) ?? []), t]);
  const callsBy = new Map<string, Call[]>();
  for (const c of calls) callsBy.set(c.prospectId, [...(callsBy.get(c.prospectId) ?? []), c]);

  const cadences = new Map<string, Cadence>();
  for (const p of prospects) cadences.set(p._id, computeCadence(p, touchesBy.get(p._id) ?? [], callsBy.get(p._id) ?? [], now));

  const dueCalls: CallItem[] = [];
  const dueWrites: WriteItem[] = [];
  const newPool: WriteItem[] = [];
  const freshPool: CallItem[] = [];
  let newStartedToday = 0;
  const usedCombos = new Set<string>();

  for (const p of prospects) {
    const c = cadences.get(p._id)!;
    // Started today: the current round's first touch was today
    if (c.state !== "new" && c.roundStart !== undefined && c.roundStart >= today) {
      newStartedToday++;
      usedCombos.add(`${p.industry}|${p.county}`);
    }
    if (!c.next || skipped.has(p._id)) continue;
    if (c.state === "new") {
      if (p.fit !== "Strong" && p.fit !== "Good") continue;
      if (c.next.kind === "call") freshPool.push({ p, c, fresh: true });
      else newPool.push({ p, c, isNew: true });
      continue;
    }
    if (c.next.due > endOfToday) continue;
    if (c.next.kind === "call") dueCalls.push({ p, c });
    else dueWrites.push({ p, c, isNew: false });
  }

  const byDue = (a: { p: P; c: Cadence }, b: { p: P; c: Cadence }) =>
    a.c.next!.due - b.c.next!.due || fitRank(a.p) - fitRank(b.p) || a.p.business.localeCompare(b.p.business);
  dueCalls.sort((a, b) => Number(!(a.c.next as { callback?: boolean }).callback) - Number(!(b.c.next as { callback?: boolean }).callback) || byDue(a, b));
  dueWrites.sort(byDue);

  // New prospects for today
  const newLeft = Math.max(0, CADENCE.newPerDay - newStartedToday);
  newPool.sort(
    (a, b) =>
      Number(CONFIRM_ACTIVE.test(a.p.sheetNotes)) - Number(CONFIRM_ACTIVE.test(b.p.sheetNotes)) ||
      a.c.round - b.c.round ||
      countyRank(a.p.county) - countyRank(b.p.county) ||
      fitRank(a.p) - fitRank(b.p) ||
      Number(a.c.next!.kind !== "email") - Number(b.c.next!.kind !== "email") ||
      a.p.business.localeCompare(b.p.business),
  );
  const picks: WriteItem[] = [];
  const combos = new Set(usedCombos);
  for (const item of newPool) {
    if (picks.length >= newLeft) break;
    const combo = `${item.p.industry}|${item.p.county}`;
    if (combos.has(combo)) continue;
    combos.add(combo);
    picks.push(item);
  }
  for (const item of newPool) {
    if (picks.length >= newLeft) break;
    if (!picks.includes(item)) picks.push(item);
  }

  // Fresh call-only prospects top the call list up to the dial goal
  const goalLeft = Math.max(0, (opts.dialGoal ?? 15) - (opts.dialsToday ?? 0) - dueCalls.length);
  freshPool.sort((a, b) => a.c.round - b.c.round || countyRank(a.p.county) - countyRank(b.p.county) || fitRank(a.p) - fitRank(b.p) || a.p.business.localeCompare(b.p.business));

  return {
    calls: dueCalls,
    freshCalls: freshPool.slice(0, goalLeft),
    writes: [...dueWrites, ...picks],
    newStartedToday,
    newLeft,
    cadences,
  };
}
