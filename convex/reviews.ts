// AI call reviews. The Call screen records two tracks per call (your headset mic and the
// Google Voice tab), uploads them here, and this transcribes them with OpenAI, then asks
// Claude for a summary, notes for the profile, and coaching feedback on the call.
// Keys live in Convex environment variables: OPENAI_API_KEY and ANTHROPIC_API_KEY.
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { action, internalAction, internalMutation, internalQuery, mutation } from "./_generated/server";
import { assertKey } from "./lib";

const RETAIN_DAYS = 30;
const MIN_SECONDS = 15;
// Calls that never reached a person aren't worth reviewing
const SKIP_OUTCOMES = new Set(["no_answer", "bad_number"]);

export const uploadUrl = mutation({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    assertKey(args.key);
    return await ctx.storage.generateUploadUrl();
  },
});

/** Attach a call's two audio tracks and start the review. */
export const attach = mutation({
  args: {
    key: v.string(),
    callId: v.id("calls"),
    mine: v.id("_storage"),
    theirs: v.id("_storage"),
    durationSec: v.number(),
    scriptText: v.string(),
  },
  handler: async (ctx, args) => {
    assertKey(args.key);
    const call = await ctx.db.get(args.callId);
    const discard = async () => {
      await ctx.storage.delete(args.mine);
      await ctx.storage.delete(args.theirs);
    };
    if (!call) {
      await discard(); // the call was undone before the upload finished
      return { started: false };
    }
    if (SKIP_OUTCOMES.has(call.outcome) || args.durationSec < MIN_SECONDS) {
      await discard();
      return { started: false };
    }
    await ctx.db.insert("recordings", {
      callId: call._id,
      prospectId: call.prospectId,
      mine: args.mine,
      theirs: args.theirs,
      durationSec: Math.round(args.durationSec),
      scriptText: args.scriptText.slice(0, 8000),
      createdAt: Date.now(),
    });
    await ctx.db.patch(call._id, { reviewStatus: "processing", durationSec: Math.round(args.durationSec) });
    await ctx.scheduler.runAfter(0, internal.reviews.run, { callId: call._id });
    return { started: true };
  },
});

/** Try a failed review again (for example after adding an API key). */
export const retry = mutation({
  args: { key: v.string(), callId: v.id("calls") },
  handler: async (ctx, args) => {
    assertKey(args.key);
    const rec = await ctx.db.query("recordings").withIndex("by_callId", (q) => q.eq("callId", args.callId)).first();
    if (!rec) throw new ConvexError("The audio for this call is gone, so it can't be reviewed again");
    await ctx.db.patch(args.callId, { reviewStatus: "processing", reviewError: undefined });
    await ctx.scheduler.runAfter(0, internal.reviews.run, { callId: args.callId });
  },
});

export const load = internalQuery({
  args: { callId: v.id("calls") },
  handler: async (ctx, args) => {
    const call = await ctx.db.get(args.callId);
    if (!call) return null;
    const prospect = await ctx.db.get(call.prospectId);
    const rec = await ctx.db.query("recordings").withIndex("by_callId", (q) => q.eq("callId", args.callId)).first();
    if (!prospect || !rec) return null;
    return { call, prospect, rec };
  },
});

export const save = internalMutation({
  args: {
    callId: v.id("calls"),
    transcript: v.optional(v.array(v.object({ who: v.union(v.literal("me"), v.literal("them")), start: v.number(), text: v.string() }))),
    review: v.optional(v.any()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const call = await ctx.db.get(args.callId);
    if (!call) return;
    if (args.error) {
      await ctx.db.patch(call._id, { reviewStatus: "error", reviewError: args.error, ...(args.transcript ? { transcript: args.transcript } : {}) });
      return;
    }
    await ctx.db.patch(call._id, { reviewStatus: "done", reviewError: undefined, transcript: args.transcript, review: args.review });
    // Notes go on the profile, with the date, under your own call notes
    const p = await ctx.db.get(call.prospectId);
    if (!p) return;
    const notes: string[] = Array.isArray(args.review?.notes) ? args.review.notes.filter((n: unknown) => typeof n === "string" && n.trim()) : [];
    const patch: Record<string, unknown> = {};
    if (notes.length) {
      const day = new Date(call.day + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const block = `${day} call: ${notes.join(" ")}`;
      patch.callNotes = p.callNotes.trim() ? `${p.callNotes.trim()}\n${block}` : block;
    }
    const owner = typeof args.review?.ownerName === "string" ? args.review.ownerName.trim() : "";
    if (owner && !p.ownerName.trim() && owner.length < 60) patch.ownerName = owner;
    if (Object.keys(patch).length) await ctx.db.patch(p._id, { ...patch, updatedAt: Date.now() });
  },
});

type Seg = { who: "me" | "them"; start: number; text: string };

async function transcribe(blob: Blob, who: Seg["who"], apiKey: string): Promise<Seg[]> {
  const form = new FormData();
  form.append("file", blob, `${who}.webm`);
  form.append("model", "whisper-1");
  form.append("response_format", "verbose_json");
  form.append("language", "en");
  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Transcription failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  const json = (await res.json()) as { segments?: { start: number; text: string }[]; text?: string };
  const segs = json.segments?.length ? json.segments : json.text ? [{ start: 0, text: json.text }] : [];
  return segs.map((s) => ({ who, start: Math.round(s.start * 10) / 10, text: s.text.trim() })).filter((s) => s.text);
}

/**
 * Recording check from the Call screen: confirms both test tracks reached Convex storage,
 * transcribes them, then deletes them. Nothing is saved to a prospect.
 */
export const testRecording = action({
  args: { key: v.string(), mine: v.id("_storage"), theirs: v.id("_storage") },
  handler: async (ctx, args) => {
    assertKey(args.key);
    const openaiKey = process.env.OPENAI_API_KEY;
    const keys = { openai: !!openaiKey, anthropic: !!process.env.ANTHROPIC_API_KEY };
    const check = async (id: typeof args.mine, who: Seg["who"]) => {
      const blob = await ctx.storage.get(id);
      if (!blob) return { stored: false, kb: 0, text: "", error: "not found in storage" };
      const kb = Math.round(blob.size / 1024);
      if (!openaiKey) return { stored: true, kb, text: "", error: "OPENAI_API_KEY isn't set" };
      try {
        const segs = await transcribe(blob, who, openaiKey);
        return { stored: true, kb, text: segs.map((s) => s.text).join(" "), error: "" };
      } catch (err) {
        return { stored: true, kb, text: "", error: err instanceof Error ? err.message : String(err) };
      }
    };
    try {
      const [mine, theirs] = await Promise.all([check(args.mine, "me"), check(args.theirs, "them")]);
      return { keys, mine, theirs };
    } finally {
      await Promise.all([ctx.storage.delete(args.mine), ctx.storage.delete(args.theirs)]);
    }
  },
});

const FILLERS = /\b(um+|uh+|like|kind of|kinda|sort of|maybe|potentially|just|you know|basically|actually)\b/gi;

function stats(transcript: Seg[]) {
  const words = (who: Seg["who"]) => transcript.filter((s) => s.who === who).reduce((n, s) => n + s.text.split(/\s+/).filter(Boolean).length, 0);
  const mine = words("me");
  const theirs = words("them");
  const fillers: Record<string, number> = {};
  for (const s of transcript.filter((x) => x.who === "me")) {
    for (const m of s.text.matchAll(FILLERS)) {
      const k = m[0].toLowerCase();
      fillers[k] = (fillers[k] ?? 0) + 1;
    }
  }
  return { myShare: mine + theirs ? Math.round((mine / (mine + theirs)) * 100) : 0, fillers };
}

const COACH = `You review cold calls for Chris Nervegna, who runs Beyond Belief Web Design, a one-person web design studio in Monroe, NC. He calls local service businesses (plumbers, roofers, HVAC, electricians and similar) to book a 15-minute meeting where he shows them a homepage redesign for their business and how it could bring in more business.

What a good call looks like (Connor Murray's cold calling method):
- Who, why, what: who he is, why he's calling them specifically, then a direct ask for the meeting with specific days. Short. No monologue.
- He sells the meeting, not the website. No pricing pitch, no long explanations of services.
- Objections: acknowledge, keep the stakes low ("not asking you to buy anything"), then either go straight back to the ask or ask one good question to understand the real concern, then ask again.
- Confident, plain language. Filler words and hedges ("maybe", "potentially", "kind of", "just") weaken the ask.
- Lets the prospect talk. Asks questions and listens.
- If it's a bad time, gets a specific callback time instead of pitching.
- Never claims things he can't back up (results, rankings, "already built").
- A good result is a booked meeting with a day, time and email, or a specific callback. A clear "no" handled gracefully is fine too.

Be direct and specific like a sales coach who wants him to win. Quote his actual words when pointing something out, and always give a better line he could say next time. Keep every field short. Never use em dashes.`;

const REVIEW_TOOL = {
  name: "save_call_review",
  description: "Save the summary, profile notes and coaching feedback for this call.",
  input_schema: {
    type: "object",
    properties: {
      summary: { type: "string", description: "2 or 3 sentences: what happened on the call and where it ended." },
      notes: {
        type: "array",
        items: { type: "string" },
        description: "Facts about the prospect worth saving on their profile, each one short: who answered, the owner's name, their current website or vendor, how they get customers, pain points, objections, timing, next step. Only things actually said. 0 to 5 items.",
      },
      ownerName: { type: ["string", "null"], description: "The owner's or decision maker's name if it came up on the call, else null." },
      nextStep: { type: "string", description: "The single next action for Chris, one sentence." },
      score: { type: "integer", minimum: 1, maximum: 10, description: "Overall call execution, 1 to 10. Judge the execution, not just the result." },
      grades: {
        type: "array",
        description: "Exactly these areas in this order: Opener, Why them (relevance), The ask, Objection handling, Listening, Confidence. Score each 1 to 5 with one short sentence. Use null score for an area that never came up.",
        items: {
          type: "object",
          properties: {
            area: { type: "string" },
            score: { type: ["integer", "null"], minimum: 1, maximum: 5 },
            note: { type: "string" },
          },
          required: ["area", "score", "note"],
        },
      },
      wentWell: { type: "array", items: { type: "string" }, description: "1 to 3 specific things he did well." },
      fixes: {
        type: "array",
        description: "1 to 3 specific improvements, most important first.",
        items: {
          type: "object",
          properties: {
            said: { type: "string", description: "What he actually said, quoted briefly, or the moment it happened." },
            better: { type: "string", description: "A better line to say next time, in his voice." },
            why: { type: "string", description: "One short sentence on why it's better." },
          },
          required: ["said", "better", "why"],
        },
      },
    },
    required: ["summary", "notes", "ownerName", "nextStep", "score", "grades", "wentWell", "fixes"],
  },
};

export const run = internalAction({
  args: { callId: v.id("calls") },
  handler: async (ctx, args) => {
    const data = await ctx.runQuery(internal.reviews.load, { callId: args.callId });
    if (!data) return;
    const { call, prospect, rec } = data;
    const openaiKey = process.env.OPENAI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!openaiKey || !anthropicKey) {
      await ctx.runMutation(internal.reviews.save, {
        callId: args.callId,
        error: `Add ${!openaiKey ? "OPENAI_API_KEY" : "ANTHROPIC_API_KEY"} to your Convex environment variables, then hit Retry.`,
      });
      return;
    }
    let transcript: Seg[] | undefined;
    try {
      const [mine, theirs] = await Promise.all([ctx.storage.get(rec.mine), ctx.storage.get(rec.theirs)]);
      if (!mine || !theirs) throw new Error("The call audio is missing");
      const [a, b] = await Promise.all([transcribe(mine, "me", openaiKey), transcribe(theirs, "them", openaiKey)]);
      transcript = [...a, ...b].sort((x, y) => x.start - y.start);
      if (!transcript.length) throw new Error("No speech was picked up. Check that tab audio was shared and your headset mic is on.");

      const lines = transcript.map((s) => `[${Math.floor(s.start / 60)}:${String(Math.floor(s.start % 60)).padStart(2, "0")}] ${s.who === "me" ? "CHRIS" : "PROSPECT"}: ${s.text}`).join("\n");
      const { myShare, fillers } = stats(transcript);
      const fillerText = Object.entries(fillers).map(([w, n]) => `${w} x${n}`).join(", ") || "none";
      const context = [
        `Business: ${prospect.business} (${prospect.industry}, ${prospect.town}, ${prospect.county})`,
        `Owner on file: ${prospect.ownerName || "unknown"}`,
        `Their website: ${prospect.website || "none"}${prospect.builtWith ? ` (${prospect.builtWith})` : ""}`,
        `Outcome Chris logged: ${call.outcome}${call.note ? ` (note: ${call.note})` : ""}`,
        `Call length: ${rec.durationSec} seconds. Chris talked ${myShare}% of the words. His fillers and hedges: ${fillerText}.`,
      ].join("\n");

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": anthropicKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-5-5",
          max_tokens: 8000,
          system: `${COACH}\n\nAlways answer by calling the save_call_review tool exactly once. Do not reply with plain text.`,
          tools: [REVIEW_TOOL],
          // This model rejects forcing a specific tool, so let it choose and ask for the tool in the prompt
          tool_choice: { type: "auto" },
          messages: [
            {
              role: "user",
              content: `${context}\n\nThe script he was working from:\n${rec.scriptText}\n\nTranscript (CHRIS is his headset mic, PROSPECT is the phone line; small timing overlaps are normal):\n${lines}`,
            },
          ],
        }),
      });
      if (!res.ok) throw new Error(`Review failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
      const json = (await res.json()) as { content: { type: string; input?: Record<string, unknown>; text?: string }[]; stop_reason?: string };
      let review = json.content.find((c) => c.type === "tool_use")?.input;
      if (!review) {
        // Fallback: the review written out as JSON in plain text
        const text = json.content.filter((c) => c.type === "text").map((c) => c.text ?? "").join("\n");
        const match = text.match(/\{[\s\S]*\}/);
        try {
          review = match ? (JSON.parse(match[0]) as Record<string, unknown>) : undefined;
        } catch {
          review = undefined;
        }
      }
      if (!review) throw new Error(`The review came back empty (stop reason: ${json.stop_reason ?? "unknown"})`);
      await ctx.runMutation(internal.reviews.save, { callId: args.callId, transcript, review: { ...review, myShare, fillers } });
    } catch (err) {
      await ctx.runMutation(internal.reviews.save, {
        callId: args.callId,
        transcript,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  },
});

/** Delete call audio older than 30 days. Transcripts and reviews stay on the call. */
export const cleanup = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - RETAIN_DAYS * 86400000;
    const old = await ctx.db
      .query("recordings")
      .withIndex("by_createdAt", (q) => q.lt("createdAt", cutoff))
      .take(100);
    for (const r of old) {
      await ctx.storage.delete(r.mine);
      await ctx.storage.delete(r.theirs);
      await ctx.db.delete(r._id);
    }
  },
});
