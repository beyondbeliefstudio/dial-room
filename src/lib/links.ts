// Turning the sheet's loose text into links you can click.

export function phoneDigits(phone: string): string {
  return phone.replace(/\D/g, "").slice(-10);
}

export function googleVoiceUrl(phone: string): string {
  return `https://voice.google.com/u/0/calls?a=nc,%2B1${phoneDigits(phone)}`;
}

/** "harveysplumbingnc.com" -> "https://harveysplumbingnc.com". Returns "" for anything that isn't a web address. */
export function toUrl(value: string): string {
  const v = value.trim();
  if (!v || /\s/.test(v)) return "";
  if (/^https?:\/\//i.test(v)) return v;
  if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(v)) return `https://${v}`;
  return "";
}

/** Shortens a URL for display: no protocol, no www, no trailing slash. */
export function prettyUrl(url: string): string {
  return url.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/$/, "");
}

export function emails(value: string): string[] {
  return value
    .split(/[,;\s]+/)
    .map((e) => e.trim())
    .filter((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e));
}

export function googleMapsUrl(business: string, town: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${business} ${town}`.trim())}`;
}

export function facebookSearchUrl(business: string): string {
  return `https://www.facebook.com/search/pages/?q=${encodeURIComponent(business)}`;
}

/** The Gmail account Beyond Belief outreach is sent from. */
export const OUTREACH_GMAIL = "contact@beyondbeliefstudio.com";

/** Opens Gmail (in the outreach account) filtered to every email to or from these addresses. */
export function gmailThreadUrl(addresses: string[]): string {
  const q = addresses.map((a) => `to:${a} OR from:${a}`).join(" OR ");
  return `https://mail.google.com/mail/u/?authuser=${encodeURIComponent(OUTREACH_GMAIL)}#search/${encodeURIComponent(q)}`;
}
