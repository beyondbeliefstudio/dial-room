// Dev-only stand-in for convex/react so the UI can be previewed without a backend:
//   npx vite --mode mock
import { useSyncExternalStore, type ReactNode } from "react";
import { getFunctionName } from "convex/server";
import { fixtures } from "./fixtures";

type State = typeof fixtures;
let state: State = structuredClone(fixtures);
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
const subscribe = (f: () => void) => (subs.add(f), () => subs.delete(f));

function run(name: string, args: any): any {
  const s = state;
  const queueable = s.prospects.filter((p: any) => ["new", "calling", "callback"].includes(p.callStatus) && p.nextCallAt <= Date.now() && !(args?.excludeIds ?? []).includes(p._id));
  switch (name) {
    case "settings:check": return { ok: true, configured: true };
    case "settings:get": return { dailyGoal: 15 };
    case "queue:next": return { current: queueable[0] ?? null, history: s.calls.filter((c: any) => c.prospectId === queueable[0]?._id), remaining: queueable.length, upNext: queueable.slice(1, 6) };
    case "prospects:facets": return { total: s.prospects.length, counties: [{ name: "Union County", count: 6 }, { name: "Cabarrus County", count: 1 }], industries: [...new Set(s.prospects.map((p: any) => p.industry))].map((n) => ({ name: n, count: 1 })) };
    case "prospects:list": return s.prospects;
    case "prospects:get": return s.prospects.find((p: any) => p._id === args.id) ?? null;
    case "scripts:list": return (s as any).scripts ?? [];
    case "meetings:forProspect": return s.meetings.filter((m: any) => m.prospectId === args.prospectId);
    case "prospects:allTouches": return (s as any).touches ?? [];
    case "prospects:touches": return ((s as any).touches ?? []).filter((t: any) => t.prospectId === args.id).sort((a: any, b: any) => b.at - a.at);
    case "calls:forProspect": return s.calls.filter((c: any) => c.prospectId === args.prospectId);
    case "calls:since": return s.calls;
    case "meetings:list": return s.meetings.map((m: any) => ({ ...m, prospect: s.prospects.find((p: any) => p._id === m.prospectId) }));
    default: return undefined;
  }
}

export function useQuery(ref: any, args: any) {
  const snap = useSyncExternalStore(subscribe, () => state);
  if (args === "skip") return undefined;
  void snap;
  return run(getFunctionName(ref), args);
}

export function useMutation(ref: any) {
  const name = getFunctionName(ref);
  return async (args: any) => {
    if (name === "calls:log") {
      const p = state.prospects.find((x: any) => x._id === args.prospectId);
      const id = `c${Date.now()}`;
      state = { ...state, calls: [...state.calls, { _id: id, prospectId: args.prospectId, outcome: args.outcome, note: args.note, at: Date.now(), day: new Date().toLocaleDateString("en-CA") }],
        prospects: state.prospects.map((x: any) => x._id === p._id ? { ...x, callStatus: args.outcome === "booked" ? "booked" : "calling", attempts: x.attempts + 1, nextCallAt: Date.now() + 86400000 } : x) };
      emit();
      return { callId: id };
    }
    if (name === "prospects:logOutreach") {
      const first = !state.prospects.find((x: any) => x._id === args.id)?.dateSent;
      state = { ...state, touches: [...((state as any).touches ?? []), { _id: `t${Date.now()}`, prospectId: args.id, at: Date.now(), channel: args.channel, kind: first ? "first" : "message" }], prospects: state.prospects.map((x: any) => x._id === args.id ? { ...x, sheetStatus: args.channel === "Email" ? "Emailed" : "Messaged on Facebook", dateSent: x.dateSent || new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), firstChannel: x.firstChannel || args.channel, followUpDue: args.followUpDue ?? x.followUpDue } : x) };
      emit();
      return {};
    }
    if (name === "prospects:logResponse") {
      state = { ...state, touches: [...((state as any).touches ?? []), { _id: `t${Date.now()}`, prospectId: args.id, at: args.at ?? Date.now(), channel: args.channel, kind: "reply", outcome: args.outcome, note: args.note }], prospects: state.prospects.map((x: any) => x._id === args.id ? { ...x, sheetStatus: args.outcome === "Interested" ? "Replied" : args.outcome, callStatus: args.outcome === "Not interested" ? "not_interested" : x.callStatus } : x) } as any;
      emit();
      return null;
    }
    if (name === "prospects:logFollowUp") {
      state = { ...state, touches: [...((state as any).touches ?? []), { _id: `t${Date.now()}`, prospectId: args.id, at: Date.now(), channel: args.channel, kind: "followup", step: args.step }], prospects: state.prospects.map((x: any) => x._id === args.id ? { ...x, sheetStatus: args.sheetStatus, followUpDue: args.followUpDue } : x) } as any;
      emit();
      return null;
    }
    if (name === "scripts:save") {
      const rest = ((state as any).scripts ?? []).filter((x: any) => x.key !== args.script.key);
      state = { ...state, scripts: [...rest, { ...args.script, updatedAt: Date.now() }] } as any;
      emit();
      return null;
    }
    if (name === "scripts:remove") {
      state = { ...state, scripts: ((state as any).scripts ?? []).filter((x: any) => x.key !== args.scriptKey) } as any;
      emit();
      return null;
    }
    if (name === "prospects:update") {
      state = { ...state, prospects: state.prospects.map((x: any) => x._id === args.id ? { ...x, ...args.patch } : x) };
      emit();
    }
    return null;
  };
}

export function useConvex() {
  return { query: async (ref: any, args: any) => run(getFunctionName(ref), args) };
}
export class ConvexReactClient { constructor(_url: string) {} }
export function ConvexProvider({ children }: { children: ReactNode }) { return <>{children}</>; }
