import { ymd } from "./dates";

export type CallLite = { outcome: string; at: number; day: string };

// Talked to the owner or decision maker
export const CONVERSATION = new Set(["callback", "not_now", "not_interested", "booked", "do_not_call"]);
// Someone picked up (owner or front desk)
export const CONNECT = new Set([...CONVERSATION, "front_desk"]);

export type DayStats = { day: string; dials: number; connects: number; conversations: number; booked: number };

export function byDay(calls: CallLite[]): Map<string, DayStats> {
  const m = new Map<string, DayStats>();
  for (const c of calls) {
    const d = m.get(c.day) ?? { day: c.day, dials: 0, connects: 0, conversations: 0, booked: 0 };
    d.dials++;
    if (CONNECT.has(c.outcome)) d.connects++;
    if (CONVERSATION.has(c.outcome)) d.conversations++;
    if (c.outcome === "booked") d.booked++;
    m.set(c.day, d);
  }
  return m;
}

/** Days in a row (ending today, or yesterday if today isn't done yet) that hit the dial goal. Weekends don't break it. */
export function streak(days: Map<string, DayStats>, goal: number, now = new Date()): number {
  let count = 0;
  const d = new Date(now);
  const todayHit = (days.get(ymd(d))?.dials ?? 0) >= goal;
  if (todayHit) count++;
  for (let i = 0; i < 120; i++) {
    d.setDate(d.getDate() - 1);
    const dow = d.getDay();
    const hit = (days.get(ymd(d))?.dials ?? 0) >= goal;
    if (hit) count++;
    else if (dow === 0 || dow === 6) continue;
    else break;
  }
  return count;
}

export function pct(n: number, d: number): string {
  if (!d) return "-";
  return `${Math.round((n / d) * 100)}%`;
}
