import { mutation } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { assertKey, normalizeKey } from "./lib";

// One row from a county prospect sheet, keyed by our field names.
const sheetRow = v.object({
  business: v.string(),
  industry: v.string(),
  town: v.string(),
  fit: v.string(),
  sheetStatus: v.string(),
  dateSent: v.string(),
  followUpDue: v.string(),
  firstChannel: v.string(),
  switchChannelOn: v.string(),
  secondChannel: v.string(),
  email: v.string(),
  phone: v.string(),
  facebook: v.string(),
  website: v.string(),
  builtWith: v.string(),
  whatToMention: v.string(),
  googleRating: v.string(),
  reviews: v.string(),
  lastReview: v.string(),
  sheetNotes: v.string(),
});

/**
 * Adds new prospects and refreshes the sheet columns of ones already imported.
 * Calling data (attempts, notes, owner name, concept) is never overwritten.
 */
export const importRows = mutation({
  args: { key: v.string(), county: v.string(), rows: v.array(sheetRow) },
  handler: async (ctx, args) => {
    assertKey(args.key);
    if (args.rows.length > 200) throw new ConvexError("Send at most 200 rows per batch");
    const county = args.county.trim();
    if (!county) throw new ConvexError("Pick a county");
    let added = 0;
    let updated = 0;
    let skipped = 0;
    const now = Date.now();
    for (const row of args.rows) {
      const business = row.business.trim();
      if (!business) {
        skipped++;
        continue;
      }
      const importKey = normalizeKey(business, row.phone);
      const existing = await ctx.db
        .query("prospects")
        .withIndex("by_importKey", (q) => q.eq("importKey", importKey))
        .first();
      const sheetFields = { ...row, business, county, updatedAt: now };
      if (existing) {
        await ctx.db.patch(existing._id, sheetFields);
        updated++;
      } else {
        await ctx.db.insert("prospects", {
          ...sheetFields,
          importKey,
          ownerName: "",
          conceptBuilt: false,
          conceptUrl: "",
          callNotes: "",
          callStatus: "new",
          attempts: 0,
          nextCallAt: 0,
        });
        added++;
      }
    }
    return { added, updated, skipped };
  },
});
