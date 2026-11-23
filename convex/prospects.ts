import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { callStatus, touchChannel } from "./schema";
import { assertKey, normalizeKey } from "./lib";

export const list = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    assertKey(args.key);
    return await ctx.db.query("prospects").take(5000);
  },
});

/** Counties and industries for the queue filters. */
export const facets = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    assertKey(args.key);
    const all = await ctx.db.query("prospects").take(5000);
    const counties = new Map<string, number>();
    const industries = new Map<string, number>();
    for (const p of all) {
      if (p.county) counties.set(p.county, (counties.get(p.county) ?? 0) + 1);
      if (p.industry) industries.set(p.industry, (industries.get(p.industry) ?? 0) + 1);
    }
    const sorted = (m: Map<string, number>) =>
      [...m.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([name, count]) => ({ name, count }));
    return { total: all.length, counties: sorted(counties), industries: sorted(industries) };
  },
});

export const get = query({
  args: { key: v.string(), id: v.id("prospects") },
  handler: async (ctx, args) => {
    assertKey(args.key);
    return await ctx.db.get(args.id);
  },
});

export const update = mutation({
  args: {
    key: v.string(),
    id: v.id("prospects"),
    patch: v.object({
      ownerName: v.optional(v.string()),
      conceptBuilt: v.optional(v.boolean()),
      conceptUrl: v.optional(v.string()),
      callNotes: v.optional(v.string()),
      phone: v.optional(v.string()),
      email: v.optional(v.string()),
      website: v.optional(v.string()),
      facebook: v.optional(v.string()),
      fit: v.optional(v.string()),
      whatToMention: v.optional(v.string()),
      sheetStatus: v.optional(v.string()),
      dateSent: v.optional(v.string()),
      firstChannel: v.optional(v.string()),
      followUpDue: v.optional(v.string()),
      switchChannelOn: v.optional(v.string()),
      secondChannel: v.optional(v.string()),
      sheetNotes: v.optional(v.string()),
      callStatus: v.optional(callStatus),
      nextCallAt: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    assertKey(args.key);
    const p = await ctx.db.get(args.id);
    if (!p) throw new ConvexError("Prospect not found");
    const patch = { ...args.patch, updatedAt: Date.now() };
    // If the conceptUrl gets filled in, mark the concept as built
    if (patch.conceptUrl && patch.conceptUrl.trim() && patch.conceptBuilt === undefined) {
      patch.conceptBuilt = true;
    }
    if (patch.phone !== undefined) {
      (patch as typeof patch & { importKey?: string }).importKey = normalizeKey(p.business, patch.phone);
    }
    await ctx.db.patch(args.id, patch);
  },
});

const CHANNEL_STATUS: Record<string, string> = {
  Email: "Emailed",
  Facebook: "Messaged on Facebook",
  Text: "Texted",
  Instagram: "Messaged on Instagram",
};

/** "Nov 20, 2026" in Eastern time, matching how the old sheets wrote dates. */
function sheetDate(ms: number): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(ms));
}

/** Records an email or message sent today, the way the prospect sheets tracked it. */
export const logOutreach = mutation({
  args: {
    key: v.string(),
    id: v.id("prospects"),
    channel: touchChannel,
    note: v.optional(v.string()),
    // When the next follow-up is due ("Nov 24, 2026"). Defaults to 7 days out.
    followUpDue: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    assertKey(args.key);
    const p = await ctx.db.get(args.id);
    if (!p) throw new ConvexError("Prospect not found");
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const firstTouch = !p.dateSent.trim() || !p.firstChannel.trim();
    const switching = !firstTouch && args.channel !== p.firstChannel && !p.secondChannel.trim();
    const patch: Partial<typeof p> = { sheetStatus: CHANNEL_STATUS[args.channel], updatedAt: now };
    patch.followUpDue = args.followUpDue?.trim() || sheetDate(now + 7 * day);
    if (firstTouch) {
      patch.firstChannel = args.channel;
      patch.dateSent = sheetDate(now);
      patch.switchChannelOn = sheetDate(now + 14 * day);
    } else if (switching) {
      patch.secondChannel = `${args.channel} (${sheetDate(now)})`;
    }
    await ctx.db.patch(args.id, patch);
    const note = args.note?.trim();
    await ctx.db.insert("touches", {
      prospectId: args.id,
      at: now,
      channel: args.channel,
      kind: firstTouch ? "first" : switching ? "switch" : "message",
      ...(note ? { note } : {}),
    });
    return patch;
  },
});

/** A follow-up sent from the Today page: moves the status along and records it in the history. */
export const logFollowUp = mutation({
  args: {
    key: v.string(),
    id: v.id("prospects"),
    channel: touchChannel,
    step: v.optional(v.number()),
    sheetStatus: v.string(),
    followUpDue: v.string(), // "" when the sequence is done
  },
  handler: async (ctx, args) => {
    assertKey(args.key);
    const p = await ctx.db.get(args.id);
    if (!p) throw new ConvexError("Prospect not found");
    const now = Date.now();
    await ctx.db.patch(args.id, { sheetStatus: args.sheetStatus, followUpDue: args.followUpDue, updatedAt: now });
    await ctx.db.insert("touches", {
      prospectId: args.id,
      at: now,
      channel: args.channel,
      kind: "followup",
      ...(args.step ? { step: args.step } : {}),
    });
  },
});

/** They responded. Records the reply in the history and closes out the outreach. */
export const logResponse = mutation({
  args: {
    key: v.string(),
    id: v.id("prospects"),
    channel: touchChannel,
    outcome: v.union(v.literal("Interested"), v.literal("Not interested"), v.literal("Not right now")),
    note: v.optional(v.string()),
    at: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    assertKey(args.key);
    const p = await ctx.db.get(args.id);
    if (!p) throw new ConvexError("Prospect not found");
    const now = Date.now();
    const at = args.at && args.at <= now ? args.at : now;
    const patch: Partial<typeof p> = { followUpDue: "", updatedAt: now };
    if (args.outcome === "Interested") patch.sheetStatus = "Replied";
    if (args.outcome === "Not right now") patch.sheetStatus = "Not right now";
    if (args.outcome === "Not interested") {
      patch.sheetStatus = "Not interested";
      if (p.callStatus !== "won" && p.callStatus !== "booked") patch.callStatus = "not_interested";
    }
    await ctx.db.patch(args.id, patch);
    const note = args.note?.trim();
    await ctx.db.insert("touches", {
      prospectId: args.id,
      at,
      channel: args.channel,
      kind: "reply",
      outcome: args.outcome,
      ...(note ? { note } : {}),
    });
  },
});

/** Every email and Facebook message logged, for the daily cadence. */
export const allTouches = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    assertKey(args.key);
    const rows = await ctx.db.query("touches").order("desc").take(8000);
    return rows.map((t) => ({ _id: t._id, prospectId: t.prospectId, at: t.at, channel: t.channel, kind: t.kind, step: t.step, note: t.note, outcome: t.outcome }));
  },
});

/** Emails and Facebook messages sent to one prospect, newest first. */
export const touches = query({
  args: { key: v.string(), id: v.id("prospects") },
  handler: async (ctx, args) => {
    assertKey(args.key);
    return await ctx.db
      .query("touches")
      .withIndex("by_prospectId_and_at", (q) => q.eq("prospectId", args.id))
      .order("desc")
      .take(100);
  },
});

export const add = mutation({
  args: {
    key: v.string(),
    business: v.string(),
    industry: v.string(),
    town: v.string(),
    county: v.string(),
    phone: v.string(),
    website: v.string(),
    ownerName: v.string(),
  },
  handler: async (ctx, args) => {
    assertKey(args.key);
    const business = args.business.trim();
    if (!business) throw new ConvexError("Business name is required");
    const importKey = normalizeKey(business, args.phone);
    const existing = await ctx.db
      .query("prospects")
      .withIndex("by_importKey", (q) => q.eq("importKey", importKey))
      .first();
    if (existing) throw new ConvexError(`${existing.business} is already in your list`);
    return await ctx.db.insert("prospects", {
      business,
      industry: args.industry.trim(),
      town: args.town.trim(),
      county: args.county.trim(),
      fit: "Good",
      sheetStatus: "Not contacted",
      dateSent: "",
      followUpDue: "",
      firstChannel: "",
      switchChannelOn: "",
      secondChannel: "",
      email: "",
      phone: args.phone.trim(),
      facebook: "",
      website: args.website.trim(),
      builtWith: "",
      whatToMention: "",
      googleRating: "",
      reviews: "",
      lastReview: "",
      sheetNotes: "",
      importKey,
      ownerName: args.ownerName.trim(),
      conceptBuilt: false,
      conceptUrl: "",
      callNotes: "",
      callStatus: "new",
      attempts: 0,
      nextCallAt: 0,
      updatedAt: Date.now(),
    });
  },
});
