// Call scripts, built from the editable script library (src/lib/scriptDefaults.ts + saved edits).
import type { Doc } from "../../convex/_generated/dataModel";
import { DEFAULT_LIBRARY, type Library, type ScriptDef } from "./scriptDefaults";
import { buildVars, fill, hasNoWebsite, hasPriorTouch, renderLines, renderPlain, tradeWords, type Line, type Seg, type Vars } from "./templates";

export { fill, hasNoWebsite, hasPriorTouch, tradeWords };
export type { Line, Seg };

type P = Doc<"prospects">;

export type ScriptId = "followup" | "cold";

export const SCRIPT_LABELS: Record<ScriptId, { short: string; title: string; ends: string }> = {
  followup: { short: "1 · Follow-up", title: "Follow-up call", ends: "Ends in a meeting ask" },
  cold: { short: "2 · Cold", title: "Cold call", ends: "Ends in a meeting ask" },
};

export function autoScript(p: P): ScriptId {
  return hasPriorTouch(p) ? "followup" : "cold";
}

/** Values the scripts fill in for this prospect. */
export function scriptVars(p: P, now = new Date()): Vars {
  return buildVars(p, now).vars;
}

function lines(key: string, p: P, lib: Library, now = new Date(), extra: Vars = {}): Line[] {
  const { vars, flags } = buildVars(p, now, extra);
  return renderLines(lib.get(key).body, vars, flags);
}

export function buildScript(id: ScriptId, p: P, now = new Date(), lib: Library = DEFAULT_LIBRARY): Line[] {
  return lines(`call.${id}`, p, lib, now);
}

export function frontDeskLines(p: P, lib: Library = DEFAULT_LIBRARY): Line[] {
  return lines("call.frontdesk", p, lib);
}

export function voicemailLines(p: P, lib: Library = DEFAULT_LIBRARY): Line[] {
  return lines("call.voicemail", p, lib);
}

export function prepCallLines(p: P, whenWords: string, lib: Library = DEFAULT_LIBRARY): Line[] {
  return lines("call.prep", p, lib, new Date(), { when: whenWords });
}

export function objections(lib: Library = DEFAULT_LIBRARY): ScriptDef[] {
  return lib.list("objection");
}

/** Objection text filled in for the prospect on the card. */
export function objectionSegs(text: string, p: P, now = new Date()): Seg[] {
  const { vars, flags } = buildVars(p, now);
  return renderLines(text, vars, flags).flatMap((l, i) => {
    const segs = l.kind === "cue" ? [{ text: l.text }] : l.segs;
    return i === 0 ? segs : [{ text: "\n\n" }, ...segs];
  });
}

export function inviteText(p: P, lib: Library = DEFAULT_LIBRARY): { title: string; details: string } {
  const s = lib.get("meeting.invite");
  const { vars, flags } = buildVars(p);
  return { title: renderPlain(s.subject ?? "", vars, flags), details: renderPlain(s.body, vars, flags) };
}
