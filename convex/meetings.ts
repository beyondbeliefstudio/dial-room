import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { assertKey } from "./lib";

export const list = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    assertKey(args.key);
    const meetings = await ctx.db.query("meetings").withIndex("by_startsAt").order("desc").take(500);
    const out = [];
    for (const m of meetings) {
      const prospect = await ctx.db.get(m.prospectId);
      out.push({ ...m, prospect });
    }
    return out;
  },
});

export const forProspect = query({
  args: { key: v.string(), prospectId: v.id("prospects") },
  handler: async (ctx, args) => {
    assertKey(args.key);
    return await ctx.db
      .query("meetings")
      .withIndex("by_prospectId", (q) => q.eq("prospectId", args.prospectId))
      .order("desc")
      .take(20);
  },
});

export const update = mutation({
  args: {
    key: v.string(),
    id: v.id("meetings"),
    patch: v.object({
      startsAt: v.optional(v.number()),
      durationMin: v.optional(v.number()),
      format: v.optional(v.union(v.literal("video"), v.literal("in_person"), v.literal("phone"))),
      email: v.optional(v.string()),
      inviteSent: v.optional(v.boolean()),
      accepted: v.optional(v.boolean()),
      prepCallDone: v.optional(v.boolean()),
      status: v.optional(
        v.union(
          v.literal("scheduled"),
          v.literal("held"),
          v.literal("no_show"),
          v.literal("rescheduled"),
          v.literal("canceled"),
          v.literal("won"),
        ),
      ),
      note: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    assertKey(args.key);
    const m = await ctx.db.get(args.id);
    if (!m) throw new ConvexError("Meeting not found");
    await ctx.db.patch(args.id, args.patch);
    // Keep the prospect's status in step with how the meeting went
    if (args.patch.status === "won") {
      await ctx.db.patch(m.prospectId, { callStatus: "won", updatedAt: Date.now() });
    } else if (args.patch.status === "no_show" || args.patch.status === "canceled") {
      // Back into the queue as a callback for tomorrow
      await ctx.db.patch(m.prospectId, {
        callStatus: "callback",
        nextCallAt: Date.now() + 20 * 60 * 60 * 1000,
        updatedAt: Date.now(),
      });
    }
  },
});
