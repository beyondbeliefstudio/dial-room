// Tiny template language for every script in Dial Room, so the scripts can be edited in the app.
//
//   {business}         filled in from the prospect (see PLACEHOLDERS for the full list)
//   {if:site} text     a line that only shows when the flag is true ({if:!site} for the opposite)
//   (text)             a paragraph in parentheses is a stage direction on call scripts
//   [Label] text       a paragraph starting with [Label] is a branch on call scripts
//   Blank lines separate paragraphs.
import type { Doc } from "../../convex/_generated/dataModel";
import { addDays, dayWord, nextBusinessDays, sinceWords, startOfDay } from "./dates";

type P = Doc<"prospects">;

export type Seg = { text: string; fill?: boolean; missing?: boolean };
export type Line =
  | { kind: "say"; segs: Seg[] }
  | { kind: "cue"; text: string }
  | { kind: "branch"; label: string; segs: Seg[] };

export type Vars = Record<string, string | null>;
export type Flags = Record<string, boolean>;

export const SIGNATURE = ["Thanks,", "Chris Nervegna", "Beyond Belief Web Design", "(980) 290-7034", "5107 Whisper Ridge Lane, Monroe, NC 28110"];

export const PLACEHOLDERS: { name: string; means: string }[] = [
  { name: "name", means: "Owner's first name (shows [Name] on call scripts when unknown)" },
  { name: "owner", means: "Owner's full name, or \"the owner\"" },
  { name: "business", means: "Business name" },
  { name: "businessShort", means: "Business name the way you'd say it (no LLC, Inc, or \"(formerly ...)\")" },
  { name: "sentNote", means: "What you sent them: \"an email\", \"a message on Facebook\", \"a text\"" },
  { name: "trade", means: "Their trade, plural (\"plumbing companies\")" },
  { name: "tradeOne", means: "Their trade, singular (\"plumbing company\")" },
  { name: "town", means: "Their town" },
  { name: "county", means: "Their county" },
  { name: "area", means: "County, or town if no county" },
  { name: "monroe", means: "\"right here in Monroe\" (Union) or \"just down the road in Monroe\"" },
  { name: "monroeShort", means: "\"here in Monroe\" (Union) or \"out of Monroe\"" },
  { name: "where", means: "\"here in Monroe\" (Union) or \"over in Monroe\", for Facebook" },
  { name: "greeting", means: "\"good morning\" or \"good afternoon\"" },
  { name: "channel", means: "How you first reached them: email, Facebook, text" },
  { name: "since", means: "\"the other day\", \"last week\" or \"a little while back\"" },
  { name: "day1", means: "Next business day (\"tomorrow\" or \"Monday\")" },
  { name: "day2", means: "The business day after that" },
  { name: "day1Ask", means: "\"tomorrow afternoon\" or \"Monday afternoon\"" },
  { name: "window", means: "\"tomorrow or later this week\", or \"Monday or later in the week\" from a Friday" },
  { name: "angle", means: "One thing from your research (\"Your angle\" on the prospect), for the \"What's wrong with my site?\" rebuttal" },
  { name: "priority", means: "What their kind of business cares about most" },
  { name: "outcomes", means: "The outcomes you help their kind of business with" },
  { name: "rating", means: "Google rating" },
  { name: "reviews", means: "Google review count" },
  { name: "when", means: "Meeting time, on the prep call (\"tomorrow\")" },
  { name: "signature", means: "Your email signature, starting with \"Thanks,\"" },
  { name: "newHomepage", means: "\"a homepage redesign\", or \"a new homepage\" when they have no site" },
  { name: "homepage", means: "\"what a homepage redesign could look like for ...\" (\"what a homepage could look like\" with no site)" },
  { name: "sig", means: "Just your name block (for emails with their own sign-off)" },
  { name: "meetingWeek", means: "Next Monday's date, for \"the week of ...\" (\"November 30\")" },
  { name: "laterMonth", means: "A month about six weeks out, for closing the loop (\"January\")" },
];

export const FLAGS: { name: string; means: string }[] = [
  { name: "name", means: "You know the owner's name" },
  { name: "site", means: "They have a website" },
  { name: "rating", means: "They have a Google rating" },
  { name: "contacted", means: "You've already emailed or messaged them" },
  { name: "union", means: "They're in Union County" },
  { name: "concept", means: "You've built a homepage concept for them" },
];

const TRADE: Record<string, [string, string]> = {
  plumbing: ["plumbing companies", "plumbing company"],
  electrical: ["electricians", "electrician"],
  "garage doors": ["garage door companies", "garage door company"],
  "tree service": ["tree services", "tree service"],
  "pest control": ["pest control companies", "pest control company"],
  hvac: ["HVAC companies", "HVAC company"],
  roofing: ["roofers", "roofer"],
  landscaping: ["landscapers", "landscaper"],
  painting: ["painters", "painter"],
  fencing: ["fence companies", "fence company"],
};

export function tradeWords(industry: string): string {
  const k = industry.trim().toLowerCase();
  if (TRADE[k]) return TRADE[k][0];
  if (!k) return "service businesses";
  return `${k} businesses`;
}

export function tradeOne(industry: string): string {
  const k = industry.trim().toLowerCase();
  if (TRADE[k]) return TRADE[k][1];
  if (!k) return "service business";
  return `${k} business`;
}

function verticalLines(industry: string) {
  const k = industry.toLowerCase();
  if (/law|attorney|estate/.test(k))
    return {
      priority: "getting more consultation requests and building trust before the first call",
      outcomes: "clear practice area pages, showing up when families search nearby, and an easy way to book a consult",
    };
  if (/therapy|aba|pediatric/.test(k))
    return {
      priority: "helping parents find you and feel confident before they call",
      outcomes: "clear service pages, a simpler intake form, and showing up when parents search nearby",
    };
  if (/funeral/.test(k))
    return {
      priority: "helping families find what they need quickly during a hard time",
      outcomes: "clear service information, easy-to-find obituaries, and a site that feels calm and trustworthy",
    };
  if (/rv|camp/.test(k))
    return {
      priority: 'more direct bookings and fewer "do you have availability" calls',
      outcomes: "better photos and amenity pages, showing up in travel searches, and a clear path to book",
    };
  return {
    priority: `standing out as the most trusted ${tradeOne(industry)} in town`,
    outcomes: "showing up in local search, getting more quote requests, and making it easy to call from a phone",
  };
}

export function hasPriorTouch(p: P): boolean {
  const s = p.sheetStatus.toLowerCase();
  return p.dateSent.trim() !== "" || (s !== "" && s !== "not contacted");
}

export function hasNoWebsite(p: P): boolean {
  return p.builtWith.toLowerCase().includes("no website") || !p.website.trim();
}

/** The business name the way you'd say it out loud: no LLC/Inc/Co, no "(formerly ...)" or " - Charlotte, NC". */
export function spokenBusiness(name: string): string {
  let t = name.replace(/\s*\(.*?\)\s*/g, " ").replace(/\s+[-|]\s+.*$/, "").trim();
  t = t.replace(/[,\s]+(L\.?L\.?C\.?|Inc\.?|Co\.?|Corp\.?|Ltd\.?)$/i, "").trim();
  return t || name.trim();
}

function sentNoteWords(channel: string): string {
  if (channel === "Facebook") return "a message on Facebook";
  if (channel === "Instagram") return "a message on Instagram";
  if (channel === "text") return "a text";
  return "an email";
}

function channelWord(p: P): string {
  const c = `${p.firstChannel} ${p.sheetStatus}`.toLowerCase();
  if (c.includes("facebook")) return "Facebook";
  if (c.includes("text")) return "text";
  if (c.includes("instagram")) return "Instagram";
  return "email";
}

/** Next Monday ("November 30"), for "the week of ...". */
export function nextMondayWords(now = new Date()): string {
  let d = addDays(startOfDay(now), 1);
  while (d.getDay() !== 1) d = addDays(d, 1);
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

/** A month about six weeks out ("January"), for closing the loop. */
export function laterMonthWords(now = new Date()): string {
  return addDays(startOfDay(now), 45).toLocaleDateString("en-US", { month: "long" });
}

/** The research note, cleaned up to read inside a sentence (no trailing period). */
function angleWords(note: string | undefined): string | null {
  const t = (note ?? "").trim().replace(/\s+/g, " ").replace(/[.\s]+$/, "");
  return t || null;
}

export function buildVars(p: P, now = new Date(), extra: Vars = {}): { vars: Vars; flags: Flags } {
  const [d1, d2] = nextBusinessDays(now, 2);
  const day1 = dayWord(d1, now);
  const day2 = dayWord(d2, now);
  const union = p.county.toLowerCase().includes("union");
  const lines = verticalLines(p.industry);
  const name = p.ownerName.trim().split(/\s+/)[0] || null;
  const site = !hasNoWebsite(p);
  const vars: Vars = {
    name,
    owner: p.ownerName.trim() || "the owner",
    business: p.business,
    businessShort: spokenBusiness(p.business),
    trade: tradeWords(p.industry),
    tradeOne: tradeOne(p.industry),
    town: p.town || p.county || "town",
    county: p.county || "your area",
    area: p.county || p.town || "the area",
    monroe: union ? "right here in Monroe" : "just down the road in Monroe",
    monroeShort: union ? "here in Monroe" : "out of Monroe",
    where: union ? "here in Monroe" : "over in Monroe",
    greeting: now.getHours() < 12 ? "good morning" : "good afternoon",
    channel: channelWord(p),
    sentNote: sentNoteWords(channelWord(p)),
    since: sinceWords(p.dateSent, now),
    day1,
    day2,
    day1Ask: day1 === "tomorrow" ? "tomorrow afternoon" : `${day1} afternoon`,
    window: day1 === "tomorrow" ? "tomorrow or later this week" : d1.getDay() > now.getDay() ? `${day1} or later this week` : `${day1} or later in the week`,
    angle: angleWords(p.whatToMention),
    priority: lines.priority,
    outcomes: lines.outcomes,
    rating: p.googleRating || null,
    reviews: p.reviews || null,
    when: null,
    signature: SIGNATURE.join("\n"),
    newHomepage: site ? "a homepage redesign" : "a new homepage",
    homepage: site ? `what a homepage redesign could look like for ${p.business}` : `what a homepage could look like for ${p.business}`,
    sig: SIGNATURE.slice(1).join("\n"),
    meetingWeek: nextMondayWords(now),
    laterMonth: laterMonthWords(now),
    ...extra,
  };
  const flags: Flags = {
    name: !!name,
    site,
    nosite: !site,
    rating: !!p.googleRating.trim(),
    norating: !p.googleRating.trim(),
    contacted: hasPriorTouch(p),
    notcontacted: !hasPriorTouch(p),
    union,
    notunion: !union,
    noname: !name,
    concept: !!p.conceptBuilt,
    noconcept: !p.conceptBuilt,
  };
  return { vars, flags };
}

const COND = /^\s*\{if:(!?)([a-z]+)\}\s?/i;

/** Applies {if:...} line conditions and returns the surviving paragraphs. */
export function paragraphs(text: string, flags: Flags): string[] {
  const out: string[] = [];
  for (const para of text.replace(/\r/g, "").split(/\n[ \t]*\n/)) {
    const kept: string[] = [];
    for (const line of para.split("\n")) {
      const m = COND.exec(line);
      if (m) {
        const val = !!flags[m[2].toLowerCase()];
        if (m[1] === "!" ? val : !val) continue;
        kept.push(line.slice(m[0].length));
      } else kept.push(line);
    }
    const joined = kept.join("\n").trim();
    if (joined) out.push(joined);
  }
  return out;
}

const MISSING_LABEL: Record<string, string> = { name: "[Name]", angle: "[one specific thing you noticed on their site]" };

export function fill(template: string, vars: Vars): Seg[] {
  const out: Seg[] = [];
  const re = /\{(\w+)\}/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(template))) {
    if (m.index > last) out.push({ text: template.slice(last, m.index) });
    const val = vars[m[1]];
    if (val) out.push({ text: val, fill: true });
    else out.push({ text: MISSING_LABEL[m[1]] ?? `[${m[1]}]`, missing: true });
    last = m.index + m[0].length;
  }
  if (last < template.length) out.push({ text: template.slice(last) });
  return out;
}

/** For call scripts: stage directions, branches and spoken lines. */
export function renderLines(text: string, vars: Vars, flags: Flags): Line[] {
  return paragraphs(text, flags).map((para): Line => {
    if (para.startsWith("(") && para.endsWith(")")) return { kind: "cue", text: para.slice(1, -1).trim() };
    const b = /^\[([^\]]+)\]\s*([\s\S]*)$/.exec(para);
    if (b && b[2].trim()) return { kind: "branch", label: b[1].trim(), segs: fill(b[2], vars) };
    return { kind: "say", segs: fill(para, vars) };
  });
}

/** For messages you copy and send: plain text. */
export function renderPlain(text: string, vars: Vars, flags: Flags): string {
  return paragraphs(text, flags)
    .map((para) => fill(para, vars).map((s) => s.text).join(""))
    .join("\n\n");
}
