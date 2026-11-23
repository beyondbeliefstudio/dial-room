import { ConvexError } from "convex/values";

// Single-user app: every function takes the access code and checks it here.
// Set it once per deployment with: npx convex env set APP_PASSCODE <your code>
export function assertKey(key: string) {
  const expected = process.env.APP_PASSCODE;
  if (!expected) {
    throw new ConvexError(
      "APP_PASSCODE isn't set on this Convex deployment yet. Run: npx convex env set APP_PASSCODE <code>",
    );
  }
  if (key !== expected) {
    throw new ConvexError("Wrong access code");
  }
}

export const DAY_MS = 24 * 60 * 60 * 1000;
export const MAX_ATTEMPTS = 6;

/** YYYY-MM-DD for a timestamp in Eastern time. */
export function easternDay(ms: number): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ms));
  return parts; // en-CA formats as YYYY-MM-DD
}

export function normalizeKey(business: string, phone: string): string {
  const name = business
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  const digits = phone.replace(/\D/g, "").slice(-10);
  return `${name}|${digits}`;
}
