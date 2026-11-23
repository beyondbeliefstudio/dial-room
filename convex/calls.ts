import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { outcome } from "./schema";
import { assertKey, DAY_MS, easternDay, MAX_ATTEMPTS } from "./lib";

type Outcome = Doc<"calls">["outcome"];

/** Where the prospect goes after a call with this outcome. */
function nextState(
  p: Doc<"prospects">,
  result: Outcome,
  now: number,
  callbackAt: number | undefined,
): Pick<Doc<"prospects">, "callStatus" | "nextCallAt"> {
  const attempts = p.attempts + 1;
  switch (result) {
    case "no_answer":
    case "voicemail":
      if (attempts >= MAX_ATTEMPTS) return { callStatus: "no_contact", nextCallAt: now };
      // Try again tomorrow after the first miss, then every other day
      return { callStatus: "calling", nextCallAt: now + (attempts <= 1 ? 1 : 2) * DAY_MS - 60 * 60 * 1000 };
    case "front_desk":
    case "callback":
      return { callStatus: "callback", nextCallAt: callbackAt ?? now + DAY_MS };
    case "not_now":
      return { callStatus: "callback", nextCallAt: callbackAt ?? now + 60 * DAY_MS };
    case "not_interested":
      return { callStatus: "not_interested", nextCallAt: now + 180 * DAY_MS };
    case "booked":
      return { callStatus: "booked", nextCallAt: now };
    case "do_not_call":
      return { callStatus: "do_not_call", nextCallAt: now };
    case "bad_number":
      return { callStatus: "bad_number", nextCallAt: now };
  }
}

export const log = mutation({
  args: {
    key: v.string(),
    prospectId: v.id("prospects"),
    outcome: outcome,
    note: v.string(),
    callbackAt: v.optional(v.number()),
    meeting: v.optional(
      v.object({
        startsAt: v.number(),
        durationMin: v.number(),
        format: v.union(v.literal("video"), v.literal("in_person"), v.literal("phone")),
        email: v.string(),
        inviteSent: v.boolean(),
        accepted: v.boolean(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    assertKey(args.key);
    const p = await ctx.db.get(args.prospectId);
    if (!p) throw new ConvexError("Prospect not found");
    if (args.outcome === "booked" && !args.meeting) {
      throw new ConvexError("A booked call needs the meeting details");
    }
    const now = Date.now();

    let meetingId = undefined;
    if (args.outcome === "booked" && args.meeting) {
      meetingId = await ctx.db.insert("meetings", {
        prospectId: p._id,
        ...args.meeting,
        prepCallDone: false,
        status: "scheduled",
        note: "",
        createdAt: now,
      });
    }

    const callId = await ctx.db.insert("calls", {
      prospectId: p._id,
      outcome: args.outcome,
      note: args.note.trim(),
      at: now,
      day: easternDay(now),
      meetingId,
      prev: {
        callStatus: p.callStatus,
        attempts: p.attempts,
        nextCallAt: p.nextCallAt,
        lastCalledAt: p.lastCalledAt,
        lastOutcome: p.lastOutcome,
      },
    });

    await ctx.db.patch(p._id, {
      ...nextState(p, args.outcome, now, args.callbackAt),
      attempts: p.attempts + 1,
      lastCalledAt: now,
      lastOutcome: args.outcome,
      updatedAt: now,
    });
    return { callId };
  },
});

/** Undo a call that was just logged (misclick). Only the prospect's latest call can be undone. */
export const undo = mutation({
  args: { key: v.string(), callId: v.id("calls") },
  handler: async (ctx, args) => {
    assertKey(args.key);
    const call = await ctx.db.get(args.callId);
    if (!call) return null;
    const latest = await ctx.db
      .query("calls")
      .withIndex("by_prospectId", (q) => q.eq("prospectId", call.prospectId))
      .order("desc")
      .first();
    if (!latest || latest._id !== call._id) {
      throw new ConvexError("Only the most recent call for this prospect can be undone");
    }
    if (call.meetingId) {
      const meeting = await ctx.db.get(call.meetingId);
      if (meeting) await ctx.db.delete(call.meetingId);
    }
    await ctx.db.patch(call.prospectId, { ...call.prev, updatedAt: Date.now() });
    for (const r of await ctx.db.query("recordings").withIndex("by_callId", (q) => q.eq("callId", call._id)).collect()) {
      await ctx.storage.delete(r.mine);
      await ctx.storage.delete(r.theirs);
      await ctx.db.delete(r._id);
    }
    await ctx.db.delete(call._id);
    return call.prospectId;
  },
});

export const forProspect = query({
  args: { key: v.string(), prospectId: v.id("prospects") },
  handler: async (ctx, args) => {
    assertKey(args.key);
    return await ctx.db
      .query("calls")
      .withIndex("by_prospectId", (q) => q.eq("prospectId", args.prospectId))
      .order("desc")
      .take(50);
  },
});

export const since = query({
  args: { key: v.string(), since: v.number() },
  handler: async (ctx, args) => {
    assertKey(args.key);
    const calls = await ctx.db
      .query("calls")
      .withIndex("by_at", (q) => q.gte("at", args.since))
      .take(5000);
    return calls.map((c) => ({ _id: c._id, outcome: c.outcome, at: c.at, day: c.day, prospectId: c.prospectId }));
  },
});
