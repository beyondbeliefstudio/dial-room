// One history for a prospect: every email, Facebook message, call and meeting, newest first,
// plus what's coming up next. Older outreach (from before the app kept a log) is pieced
// together from the sheet fields and the dated lines the app used to add to the notes.
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { addDays, parseSheetDate, startOfDay } from "./dates";
import { MEETING_STATUS_LABEL, OUTCOME_LABEL } from "./labels";
import { EMAIL_STEP_LABEL, type EmailStep } from "./outreach";

type P = Doc<"prospects">;
type Touch = Doc<"touches">;
type Channel = Touch["channel"];

export type Lane = "Email" | "Facebook" | "Text" | "Instagram" | "Call" | "Meeting" | "Plan";

export type TimelineItem = {
  id: string;
  at: number;
  timeKnown: boolean; // false for older outreach where only the day is known
  lane: Lane;
  title: string;
  detail?: string;
  overdue?: boolean;
  reply?: boolean; // their response, the end of the outreach
  review?: CallReview;
};

export type CallReview = {
  callId: Id<"calls">;
  status: "processing" | "done" | "error";
  error?: string;
  durationSec?: number;
  data?: CallReviewData;
  transcript?: { who: "me" | "them"; start: number; text: string }[];
};

export type CallReviewData = {
  summary?: string;
  notes?: string[];
  nextStep?: string;
  score?: number;
  grades?: { area: string; score: number | null; note: string }[];
  wentWell?: string[];
  fixes?: { said: string; better: string; why: string }[];
  myShare?: number;
  fillers?: Record<string, number>;
};

const FIRST_TITLE: Record<Channel, string> = {
  Email: "First email",
  Facebook: "First Facebook message",
  Text: "First text",
  Instagram: "First Instagram DM",
};
const SENT_TITLE: Record<Channel, string> = {
  Email: "Email sent",
  Facebook: "Facebook message sent",
  Text: "Text sent",
  Instagram: "Instagram DM sent",
};
const LOWER: Record<Channel, string> = { Email: "email", Facebook: "Facebook", Text: "text", Instagram: "Instagram" };
const CHANNELS: Channel[] = ["Email", "Facebook", "Text", "Instagram"];

function touchTitle(kind: Touch["kind"], channel: Channel, step?: number, outcome?: string): { title: string; detail?: string } {
  if (kind === "reply") return { title: `They replied on ${LOWER[channel]}`, detail: outcome };
  if (kind === "first") return { title: FIRST_TITLE[channel] };
  if (kind === "switch") return { title: `Switched to ${LOWER[channel]}`, detail: `First ${LOWER[channel]} after no reply` };
  if (kind === "followup") {
    if (channel === "Email" && step && step >= 1 && step <= 3) {
      const [label, what] = EMAIL_STEP_LABEL[step as EmailStep].split(" · ");
      return { title: `Email ${label.toLowerCase()}`, detail: what };
    }
    return { title: `${channel === "Facebook" ? "Facebook" : LOWER[channel]} follow-up` };
  }
  return { title: SENT_TITLE[channel] };
}

/** Noon on a sheet date, so day-only events sort sensibly next to timed ones. */
function dayAt(s: string): number | null {
  const d = parseSheetDate(s);
  return d ? startOfDay(d).getTime() + 12 * 3600_000 : null;
}

const DATE = String.raw`([A-Z][a-z]{2} \d{1,2}, \d{4})`;
const SENT_LINE = new RegExp(`^${DATE}: (Email|Facebook|Text|Instagram) sent\\.?\\s*(.*)$`);
const EMAIL_FU_LINE = new RegExp(`^${DATE}: Email follow-up (\\d) sent\\.?\\s*(.*)$`);
const FOLLOWED_LINE = new RegExp(`^${DATE}: Followed up by (email|Facebook|text|Instagram)\\.?\\s*(.*)$`, "i");

function isLogLine(line: string): boolean {
  const t = line.trim();
  return SENT_LINE.test(t) || EMAIL_FU_LINE.test(t) || FOLLOWED_LINE.test(t);
}

/** The notes without the dated log lines the app used to add (those show in the history now). */
export function freeNotes(notes: string): string {
  return notes
    .split("\n")
    .filter((l) => !isLogLine(l))
    .join("\n")
    .trim();
}

type Legacy = { at: number; kind: Touch["kind"]; channel: Channel; step?: number; note?: string };

function legacyOutreach(p: P): Legacy[] {
  const out: Legacy[] = [];
  for (const raw of p.sheetNotes.split("\n")) {
    const line = raw.trim();
    let m = line.match(EMAIL_FU_LINE);
    if (m) {
      const at = dayAt(m[1]);
      if (at) out.push({ at, kind: "followup", channel: "Email", step: Number(m[2]), note: m[3] || undefined });
      continue;
    }
    m = line.match(FOLLOWED_LINE);
    if (m) {
      const at = dayAt(m[1]);
      const ch = CHANNELS.find((c) => c.toLowerCase() === m![2].toLowerCase()) ?? "Email";
      if (at) out.push({ at, kind: "followup", channel: ch, note: m[3] || undefined });
      continue;
    }
    m = line.match(SENT_LINE);
    if (m) {
      const at = dayAt(m[1]);
      const ch = m[2] as Channel;
      const kind: Touch["kind"] =
        ch === p.firstChannel && m[1] === p.dateSent ? "first" : p.secondChannel.startsWith(ch) && ch !== p.firstChannel ? "switch" : "message";
      if (at) out.push({ at, kind, channel: ch, note: m[3] || undefined });
    }
  }
  // The first touch and the channel switch from the sheet fields, when no log line covers them
  const firstCh = CHANNELS.find((c) => c === p.firstChannel.trim());
  const firstAt = dayAt(p.dateSent);
  if (firstCh && firstAt && !out.some((e) => e.kind === "first")) out.push({ at: firstAt, kind: "first", channel: firstCh });
  const sw = p.secondChannel.match(/^(Email|Facebook|Text|Instagram)\s*\((.+)\)\s*$/);
  if (sw && !out.some((e) => e.kind === "switch")) {
    const at = dayAt(sw[2]);
    if (at) out.push({ at, kind: "switch", channel: sw[1] as Channel });
  }
  return out;
}

const sameDay = (a: number, b: number) => startOfDay(new Date(a)).getTime() === startOfDay(new Date(b)).getTime();

export type NextUp =
  | { kind: "email" | "facebook" | "call"; title: string; reason: string; due: number; callback?: boolean }
  | { kind: "rest"; until: number; round: number }
  | null;

function upcoming(next: NextUp, meetings: Doc<"meetings">[], now: Date): TimelineItem[] {
  const items: TimelineItem[] = [];
  const today = startOfDay(now).getTime();
  if (next && next.kind === "rest") {
    items.push({
      id: "next-round",
      at: next.until,
      timeKnown: false,
      lane: "Plan",
      title: `Round ${next.round + 1} starts`,
      detail: "No reply this round. They come back on your list automatically.",
    });
  } else if (next) {
    const lane: TimelineItem["lane"] = next.kind === "email" ? "Email" : next.kind === "facebook" ? "Facebook" : "Call";
    items.push({
      id: "next-touch",
      at: next.due,
      timeKnown: !!next.callback,
      lane,
      title: next.title,
      detail: next.reason,
      overdue: next.due < today,
    });
  }
  for (const m of meetings) {
    if (m.status === "scheduled" && m.startsAt >= now.getTime()) {
      items.push({
        id: `m-${m._id}`,
        at: m.startsAt,
        timeKnown: true,
        lane: "Meeting",
        title: "Meeting",
        detail: [meetingFormat(m), m.accepted ? "Accepted" : "Not accepted yet"].join(" · "),
      });
    }
  }
  return items.sort((a, b) => a.at - b.at);
}

function meetingFormat(m: Doc<"meetings">): string {
  return m.format === "video" ? "Google Meet" : m.format === "in_person" ? "In person" : "Phone";
}

export type WrittenEvent = {
  id: string;
  at: number;
  timeKnown: boolean;
  channel: Channel;
  kind: Touch["kind"];
  step?: number;
  note?: string;
  outcome?: string;
};

/** Every email and message sent: the log, plus older outreach from the sheet fields and dated note lines. */
export function writtenEvents(
  p: P,
  touches: (Pick<Touch, "_id" | "at" | "channel" | "kind" | "step" | "note"> & { outcome?: string })[],
): WrittenEvent[] {
  const out: WrittenEvent[] = touches.map((t) => ({
    id: t._id,
    at: t.at,
    timeKnown: true,
    channel: t.channel,
    kind: t.kind,
    step: t.step,
    note: t.note,
    outcome: t.outcome,
  }));
  // Older outreach, skipping anything the log already has for that day
  legacyOutreach(p).forEach((e, i) => {
    if (touches.some((t) => t.channel === e.channel && t.kind === e.kind && sameDay(t.at, e.at))) return;
    out.push({ id: `old-${i}`, at: e.at, timeKnown: false, channel: e.channel, kind: e.kind, step: e.step, note: e.note });
  });
  return out.sort((a, b) => a.at - b.at);
}

export function buildTimeline(
  p: P,
  touches: Touch[],
  calls: Doc<"calls">[],
  meetings: Doc<"meetings">[],
  now = new Date(),
  next: NextUp = null,
): { upcoming: TimelineItem[]; past: TimelineItem[] } {
  const past: TimelineItem[] = [];
  for (const e of writtenEvents(p, touches)) {
    const { title, detail } = touchTitle(e.kind, e.channel, e.step, e.outcome);
    past.push({
      id: e.id,
      at: e.at,
      timeKnown: e.timeKnown,
      lane: e.channel,
      title,
      detail: [detail, e.note].filter(Boolean).join(" · ") || undefined,
      reply: e.kind === "reply",
    });
  }
  for (const c of calls) {
    past.push({
      id: c._id,
      at: c.at,
      timeKnown: true,
      lane: "Call",
      title: OUTCOME_LABEL[c.outcome],
      detail: c.note || undefined,
      review: c.reviewStatus
        ? { callId: c._id, status: c.reviewStatus, error: c.reviewError, durationSec: c.durationSec, data: c.review as CallReviewData | undefined, transcript: c.transcript }
        : undefined,
    });
  }
  for (const m of meetings) {
    if (m.status === "scheduled" && m.startsAt >= now.getTime()) continue;
    past.push({
      id: m._id,
      at: m.startsAt,
      timeKnown: true,
      lane: "Meeting",
      title: `Meeting · ${MEETING_STATUS_LABEL[m.status]}`,
      detail: [meetingFormat(m), m.note].filter(Boolean).join(" · "),
    });
  }
  past.sort((a, b) => b.at - a.at);
  return { upcoming: upcoming(next, meetings, now), past };
}

/** "Today", "Yesterday", "Tomorrow", "Fri, Nov 20" (with the year when it isn't this year). */
export function dayLabel(ms: number, now = new Date()): string {
  const d = startOfDay(new Date(ms)).getTime();
  const t = startOfDay(now).getTime();
  if (d === t) return "Today";
  if (d === addDays(new Date(t), -1).getTime()) return "Yesterday";
  if (d === addDays(new Date(t), 1).getTime()) return "Tomorrow";
  const date = new Date(ms);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(date.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
  });
}
