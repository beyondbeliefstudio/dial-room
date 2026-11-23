// Outreach message text, built from the editable script library, plus the email sequence labels.
// Who gets what and when is decided by the ABAB cadence in cadence.ts.
import type { Doc } from "../../convex/_generated/dataModel";
import { buildVars, renderPlain } from "./templates";
import { DEFAULT_LIBRARY, type Library } from "./scriptDefaults";

type P = Doc<"prospects">;

// ---------- The email sequence ----------

export type EmailStep = 1 | 2 | 3;

/** Status after each email follow-up. The first email sets "Emailed". */
export const EMAIL_STEP_STATUS: Record<EmailStep, string> = {
  1: "Email F1 sent",
  2: "Email F2 sent",
  3: "Email sequence done",
};

export const EMAIL_STEP_LABEL: Record<EmailStep, string> = {
  1: "Follow-up 1 · Value add",
  2: "Follow-up 2 · Direct request",
  3: "Follow-up 3 · Close the loop",
};

// ---------- Message text (from the editable script library) ----------

function plain(key: string, p: P, lib: Library, now = new Date()): string {
  const { vars, flags } = buildVars(p, now);
  return renderPlain(lib.get(key).body, vars, flags);
}

export function facebookMessage(p: P, now = new Date(), lib: Library = DEFAULT_LIBRARY): string {
  return plain("facebook.first", p, lib, now);
}

export function facebookFollowUp(p: P, lib: Library = DEFAULT_LIBRARY, now = new Date()): string {
  return plain("facebook.followup", p, lib, now);
}

const EMAIL_FOLLOW_KEY: Record<EmailStep, string> = { 1: "email.f1", 2: "email.f2", 3: "email.f3" };

export function emailFollowUp(p: P, step: EmailStep, lib: Library = DEFAULT_LIBRARY, now = new Date()): string {
  return plain(EMAIL_FOLLOW_KEY[step], p, lib, now);
}

export function emailDraft(p: P, lib: Library = DEFAULT_LIBRARY, now = new Date()): { subject: string; body: string } {
  const s = lib.get("email.first");
  const { vars, flags } = buildVars(p, now);
  return { subject: renderPlain(s.subject ?? "", vars, flags), body: renderPlain(s.body, vars, flags) };
}

export function gmailComposeUrl(account: string, to: string, subject: string, body: string): string {
  const params = new URLSearchParams({ view: "cm", fs: "1", authuser: account, to, su: subject, body });
  return `https://mail.google.com/mail/?${params.toString()}`;
}
