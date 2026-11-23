import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { assertKey } from "./lib";

export const list = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    assertKey(args.key);
    const rows = await ctx.db.query("scripts").take(500);
    return rows.map(({ _id, _creationTime, updatedAt, ...s }) => ({ ...s, updatedAt }));
  },
});

/** Saves an edit to a built-in script, or creates/updates a custom one. */
export const save = mutation({
  args: {
    key: v.string(),
    script: v.object({
      key: v.string(),
      category: v.string(),
      title: v.string(),
      subject: v.optional(v.string()),
      body: v.string(),
      body2: v.optional(v.string()),
      note: v.optional(v.string()),
      order: v.number(),
      custom: v.boolean(),
    }),
  },
  handler: async (ctx, args) => {
    assertKey(args.key);
    const s = args.script;
    if (!s.title.trim()) throw new ConvexError("Give the script a title");
    if (!s.body.trim()) throw new ConvexError("The script can't be empty");
    const existing = await ctx.db
      .query("scripts")
      .withIndex("by_key", (q) => q.eq("key", s.key))
      .first();
    const row = { ...s, title: s.title.trim(), updatedAt: Date.now() };
    if (existing) await ctx.db.replace(existing._id, row);
    else await ctx.db.insert("scripts", row);
  },
});

/** Resets a built-in script to its default, or deletes a custom one. */
export const remove = mutation({
  args: { key: v.string(), scriptKey: v.string() },
  handler: async (ctx, args) => {
    assertKey(args.key);
    const existing = await ctx.db
      .query("scripts")
      .withIndex("by_key", (q) => q.eq("key", args.scriptKey))
      .first();
    if (existing) await ctx.db.delete(existing._id);
  },
});
