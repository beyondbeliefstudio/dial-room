import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Where a prospect sits in the calling pipeline.
export const callStatus = v.union(
  v.literal("new"), // never called
  v.literal("calling"), // called, no conversation yet, still in rotation
  v.literal("callback"), // a specific callback time is set
  v.literal("booked"), // meeting on the calendar
  v.literal("not_interested"), // talked, said no (can be revisited later)
  v.literal("do_not_call"), // asked not to be called. Never shows in the queue again.
  v.literal("bad_number"),
  v.literal("no_contact"), // hit the attempt limit without reaching anyone
  v.literal("won"),
);

export const outcome = v.union(
  v.literal("no_answer"),
  v.literal("voicemail"),
  v.literal("front_desk"), // reached someone else, call back
  v.literal("callback"), // talked to the owner, call back later
  v.literal("not_now"), // talked, timing is wrong
  v.literal("not_interested"),
  v.literal("booked"),
  v.literal("do_not_call"),
  v.literal("bad_number"),
);

export const touchChannel = v.union(v.literal("Email"), v.literal("Facebook"), v.literal("Text"), v.literal("Instagram"));

export default defineSchema({
  prospects: defineTable({
    // Columns copied from the county prospect sheets
    business: v.string(),
    industry: v.string(),
    town: v.string(),
    county: v.string(),
    fit: v.string(), // Strong | Good | Lower | Skip
    sheetStatus: v.string(), // Not contacted | Emailed | Messaged on Facebook | ...
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

    // Calling data that lives only in the app
    importKey: v.string(),
    ownerName: v.string(),
    conceptBuilt: v.boolean(),
    conceptUrl: v.string(),
    callNotes: v.string(),
    callStatus: callStatus,
    attempts: v.number(),
    lastCalledAt: v.optional(v.number()),
    lastOutcome: v.optional(outcome),
    nextCallAt: v.number(), // ms timestamp, 0 = call any time
    updatedAt: v.number(),
  })
    .index("by_importKey", ["importKey"])
    .index("by_callStatus_and_nextCallAt", ["callStatus", "nextCallAt"]),

  calls: defineTable({
    prospectId: v.id("prospects"),
    outcome: outcome,
    note: v.string(),
    at: v.number(),
    day: v.string(), // YYYY-MM-DD in Eastern time, for daily stats
    meetingId: v.optional(v.id("meetings")),
    // AI call review: recorded audio is transcribed, summarized and scored
    reviewStatus: v.optional(v.union(v.literal("processing"), v.literal("done"), v.literal("error"))),
    reviewError: v.optional(v.string()),
    durationSec: v.optional(v.number()),
    transcript: v.optional(v.array(v.object({ who: v.union(v.literal("me"), v.literal("them")), start: v.number(), text: v.string() }))),
    review: v.optional(v.any()),
    // The prospect's calling state before this call, so a misclick can be undone
    prev: v.object({
      callStatus: callStatus,
      attempts: v.number(),
      nextCallAt: v.number(),
      lastCalledAt: v.optional(v.number()),
      lastOutcome: v.optional(outcome),
    }),
  })
    .index("by_prospectId", ["prospectId"])
    .index("by_at", ["at"]),

  // Call audio, kept about 30 days for the AI review, then deleted (the transcript stays on the call).
  recordings: defineTable({
    callId: v.id("calls"),
    prospectId: v.id("prospects"),
    mine: v.id("_storage"), // your headset mic
    theirs: v.id("_storage"), // the Google Voice tab
    durationSec: v.number(),
    scriptText: v.string(), // the script you were working from, for the feedback
    createdAt: v.number(),
  })
    .index("by_callId", ["callId"])
    .index("by_createdAt", ["createdAt"]),

  // Every email and Facebook message sent, for the prospect's history timeline.
  touches: defineTable({
    prospectId: v.id("prospects"),
    at: v.number(),
    channel: touchChannel,
    kind: v.union(
      v.literal("first"), // first touch on any channel
      v.literal("switch"), // first touch on a second channel
      v.literal("message"), // another send on the same channel
      v.literal("followup"), // a follow-up from the Today page
      v.literal("reply"), // they responded: the end of the outreach
    ),
    step: v.optional(v.number()), // email follow-up 1, 2, 3
    outcome: v.optional(v.string()), // for replies: "Interested", "Not interested", "Not right now"
    note: v.optional(v.string()),
  }).index("by_prospectId_and_at", ["prospectId", "at"]),

  meetings: defineTable({
    prospectId: v.id("prospects"),
    startsAt: v.number(),
    durationMin: v.number(),
    format: v.union(v.literal("video"), v.literal("in_person"), v.literal("phone")),
    email: v.string(),
    inviteSent: v.boolean(),
    accepted: v.boolean(),
    prepCallDone: v.boolean(),
    status: v.union(
      v.literal("scheduled"),
      v.literal("held"),
      v.literal("no_show"),
      v.literal("rescheduled"),
      v.literal("canceled"),
      v.literal("won"),
    ),
    note: v.string(),
    createdAt: v.number(),
  })
    .index("by_startsAt", ["startsAt"])
    .index("by_prospectId", ["prospectId"]),

  // Edited or added scripts. Built-in scripts live in the app code; a row here overrides one by key.
  scripts: defineTable({
    key: v.string(),
    category: v.string(),
    title: v.string(),
    subject: v.optional(v.string()),
    body: v.string(),
    body2: v.optional(v.string()),
    note: v.optional(v.string()),
    order: v.number(),
    custom: v.boolean(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  settings: defineTable({
    dailyGoal: v.number(),
  }),
});
