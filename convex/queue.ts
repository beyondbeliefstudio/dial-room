import { query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { assertKey } from "./lib";

const queueable = ["new", "calling", "callback"] as const;

export function priorTouch(p: Doc<"prospects">): boolean {
  const s = p.sheetStatus.toLowerCase();
  return p.dateSent.trim() !== "" || (s !== "" && s !== "not contacted");
}

/** Higher score is called first. */
export function score(p: Doc<"prospects">): number {
  let s = 0;
  if (p.callStatus === "callback") s += 100; // they picked this time
  if (p.conceptBuilt) s += 30;
  if (priorTouch(p)) s += 20;
  if (p.fit === "Strong") s += 15;
  else if (p.fit === "Good") s += 8;
  s -= p.attempts * 3;
  return s;
}

export const next = query({
  args: {
    key: v.string(),
    now: v.number(),
    county: v.optional(v.string()),
    industry: v.optional(v.string()),
    includeLower: v.boolean(),
    conceptOnly: v.boolean(),
    excludeIds: v.array(v.id("prospects")),
  },
  handler: async (ctx, args) => {
    assertKey(args.key);
    const exclude = new Set<string>(args.excludeIds);
    const candidates: Doc<"prospects">[] = [];
    for (const status of queueable) {
      const rows = await ctx.db
        .query("prospects")
        .withIndex("by_callStatus_and_nextCallAt", (q) =>
          q.eq("callStatus", status).lte("nextCallAt", args.now),
        )
        .collect();
      candidates.push(...rows);
    }
    const eligible = candidates.filter((p) => {
      if (exclude.has(p._id)) return false;
      if (p.phone.replace(/\D/g, "").length < 10) return false;
      if (p.fit === "Skip") return false;
      if (p.fit === "Lower" && !args.includeLower) return false;
      if (args.conceptOnly && !p.conceptBuilt) return false;
      if (args.county && p.county !== args.county) return false;
      if (args.industry && p.industry !== args.industry) return false;
      return true;
    });
    eligible.sort(
      (a, b) =>
        score(b) - score(a) ||
        (a.lastCalledAt ?? 0) - (b.lastCalledAt ?? 0) ||
        a.business.localeCompare(b.business),
    );
    const current = eligible[0] ?? null;
    let history: Doc<"calls">[] = [];
    if (current) {
      history = await ctx.db
        .query("calls")
        .withIndex("by_prospectId", (q) => q.eq("prospectId", current._id))
        .order("desc")
        .take(10);
    }
    return {
      current,
      history,
      remaining: eligible.length,
      upNext: eligible.slice(1, 6).map((p) => ({
        _id: p._id,
        business: p.business,
        town: p.town,
        industry: p.industry,
        callStatus: p.callStatus,
        nextCallAt: p.nextCallAt,
      })),
    };
  },
});
