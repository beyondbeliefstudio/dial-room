// Date helpers. Everything displays in the browser's time zone (Eastern for Chris).

// Days nobody wants a sales meeting. Add more as they come up.
const HOLIDAYS = new Set([
  "2026-11-26", "2026-11-27", // Thanksgiving
  "2026-12-24", "2026-12-25", "2026-12-31",
  "2027-01-01", "2027-05-31", "2027-07-05", "2027-09-06",
  "2027-11-25", "2027-11-26", "2027-12-24", "2027-12-31",
]);

export function ymd(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function isBusinessDay(d: Date): boolean {
  const dow = d.getDay();
  return dow !== 0 && dow !== 6 && !HOLIDAYS.has(ymd(d));
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** The next `count` business days after today. */
export function nextBusinessDays(from: Date, count: number): Date[] {
  const out: Date[] = [];
  let d = startOfDay(from);
  while (out.length < count) {
    d = addDays(d, 1);
    if (isBusinessDay(d)) out.push(d);
  }
  return out;
}

export function isTomorrow(d: Date, now = new Date()): boolean {
  return ymd(d) === ymd(addDays(now, 1));
}

export function weekday(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "long" });
}

/** "tomorrow" or "Monday" */
export function dayWord(d: Date, now = new Date()): string {
  return isTomorrow(d, now) ? "tomorrow" : weekday(d);
}

export function at(d: Date, hour: number, minute = 0): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), hour, minute).getTime();
}

export function fmtDateTime(ms: number): string {
  return new Date(ms).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function fmtTime(ms: number): string {
  return new Date(ms).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function fmtShortDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function relative(ms: number, now = Date.now()): string {
  const diff = ms - now;
  const abs = Math.abs(diff);
  const mins = Math.round(abs / 60000);
  const hours = Math.round(abs / 3600000);
  const days = Math.round(abs / 86400000);
  let s: string;
  if (mins < 60) s = `${mins} min`;
  else if (hours < 36) s = `${hours} hr`;
  else s = `${days} days`;
  return diff >= 0 ? `in ${s}` : `${s} ago`;
}

/** Parses the sheet's "Nov 17, 2026" style dates. */
export function parseSheetDate(s: string): Date | null {
  if (!s.trim()) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "the other day", "last week" or "a while back", for the script. */
export function sinceWords(dateSent: string, now = new Date()): string {
  const d = parseSheetDate(dateSent);
  if (!d) return "a little while back";
  const days = Math.floor((startOfDay(now).getTime() - startOfDay(d).getTime()) / 86400000);
  if (days <= 0) return "earlier today";
  if (days < 7) return "the other day";
  if (days < 14) return "last week";
  return "a little while back";
}

/** For <input type="datetime-local"> */
export function toLocalInput(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInput(s: string): number {
  return new Date(s).getTime();
}

function gcalStamp(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
}

/** Opens Google Calendar with the event filled in and the prospect added as a guest. */
export function googleCalendarUrl(opts: {
  title: string;
  startsAt: number;
  durationMin: number;
  details: string;
  location: string;
  guest: string;
}): string {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York";
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: opts.title,
    dates: `${gcalStamp(opts.startsAt)}/${gcalStamp(opts.startsAt + opts.durationMin * 60000)}`,
    details: opts.details,
    location: opts.location,
    ctz: tz,
  });
  if (opts.guest.trim()) params.set("add", opts.guest.trim());
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
