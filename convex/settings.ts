import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { assertKey } from "./lib";

/** Lets the login screen tell a wrong code from a deployment with no code set. */
export const check = query({
  args: { key: v.string() },
  handler: async (_ctx, args) => {
    const expected = process.env.APP_PASSCODE;
    if (!expected) return { ok: false, configured: false };
    return { ok: args.key === expected, configured: true };
  },
});

export const get = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    assertKey(args.key);
    const s = await ctx.db.query("settings").first();
    return { dailyGoal: s?.dailyGoal ?? 15 };
  },
});

export const setDailyGoal = mutation({
  args: { key: v.string(), dailyGoal: v.number() },
  handler: async (ctx, args) => {
    assertKey(args.key);
    const goal = Math.max(1, Math.min(200, Math.round(args.dailyGoal)));
    const s = await ctx.db.query("settings").first();
    if (s) await ctx.db.patch(s._id, { dailyGoal: goal });
    else await ctx.db.insert("settings", { dailyGoal: goal });
  },
});
