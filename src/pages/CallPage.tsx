import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { useKey } from "../session";
import {
  autoScript,
  buildScript,
  frontDeskLines,
  hasPriorTouch,
  objections as objectionList,
  objectionSegs,
  SCRIPT_LABELS,
  voicemailLines,
  type ScriptId,
} from "../lib/script";
import { useLibrary } from "../library";
import type { ScriptDef } from "../lib/scriptDefaults";
import ScriptView, { Segs } from "../components/ScriptView";
import CallbackModal from "../components/CallbackModal";
import BookModal, { type MeetingDraft } from "../components/BookModal";
import Confetti from "../components/Confetti";
import { relative } from "../lib/dates";
import { googleVoiceUrl } from "../lib/links";
import { History, NoteBox, PhoneBlock, ProspectFacts, ProspectLinks } from "../components/ProspectInfo";
import { freeNotes } from "../lib/timeline";
import * as recorder from "../lib/recorder";
import { OUTCOME_LABEL, STATUS_LABEL } from "../lib/labels";

type Outcome = Doc<"calls">["outcome"];
type Panel = "script" | "frontdesk" | "voicemail";

type Filters = { county: string; industry: string; includeLower: boolean; conceptOnly: boolean };
const FILTER_KEY = "dialroom.filters";
function loadFilters(): Filters {
  try {
    const f = JSON.parse(localStorage.getItem(FILTER_KEY) ?? "{}");
    return { county: f.county ?? "", industry: f.industry ?? "", includeLower: !!f.includeLower, conceptOnly: !!f.conceptOnly };
  } catch {
    return { county: "", industry: "", includeLower: false, conceptOnly: false };
  }
}


function useMinuteClock() {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 60000) * 60000);
  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 60000) * 60000), 30000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function isTyping(e: KeyboardEvent) {
  const el = e.target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

export type CallList = { ids: Id<"prospects">[]; done: Id<"prospects">[] };

export default function CallPage({
  pinned,
  clearPinned,
  goal,
  todayDials,
  callList,
  onListProgress,
  onExitList,
}: {
  pinned: Id<"prospects"> | null;
  clearPinned: () => void;
  goal: number;
  todayDials: number;
  callList: CallList | null;
  onListProgress: (id: Id<"prospects">, done: boolean) => void;
  onExitList: () => void;
}) {
  const key = useKey();
  const now = useMinuteClock();
  const [filters, setFilters] = useState<Filters>(loadFilters);
  const [skipped, setSkipped] = useState<Id<"prospects">[]>([]);
  useEffect(() => {
    try {
      localStorage.setItem(FILTER_KEY, JSON.stringify(filters));
    } catch {
      /* not critical */
    }
  }, [filters]);

  const facets = useQuery(api.prospects.facets, { key });
  const queue = useQuery(api.queue.next, {
    key,
    now,
    county: filters.county || undefined,
    industry: filters.industry || undefined,
    includeLower: filters.includeLower,
    conceptOnly: filters.conceptOnly,
    excludeIds: skipped,
  });
  // Working through today's call list: the next one you haven't called or skipped yet
  const listId = callList ? (callList.ids.find((id) => !callList.done.includes(id)) ?? null) : null;
  const focusId = pinned ?? listId;
  const pinnedDoc = useQuery(api.prospects.get, focusId ? { key, id: focusId } : "skip");
  const pinnedHistory = useQuery(api.calls.forProspect, focusId ? { key, prospectId: focusId } : "skip");

  const current: Doc<"prospects"> | null | undefined = focusId ? pinnedDoc : queue?.current;
  const history = (focusId ? pinnedHistory : queue?.history) ?? [];

  const logCall = useMutation(api.calls.log);
  const undoCall = useMutation(api.calls.undo);

  const [note, setNote] = useState("");
  const [scriptPick, setScriptPick] = useState<ScriptId | "auto">("auto");
  const [panel, setPanel] = useState<Panel>("script");
  const [openObj, setOpenObj] = useState<number | null>(null); // the rebuttal showing in place of the script
  const [modal, setModal] = useState<null | { kind: "callback"; outcome: "front_desk" | "callback" | "not_now" } | { kind: "book" }>(null);
  const [toast, setToast] = useState<null | { text: string; callId: Id<"calls"> | null; good?: boolean }>(null);
  const [burst, setBurst] = useState(0);
  const [busy, setBusy] = useState(false);
  const noteRef = useRef<HTMLInputElement>(null);
  const lastId = useRef<string | null>(null);

  // Fresh card: reset the per-call state
  useEffect(() => {
    if (current?._id && current._id !== lastId.current) {
      lastId.current = current._id;
      setNote("");
      setScriptPick("auto");
      setPanel("script");
      setOpenObj(null);
    }
  }, [current?._id]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 9000);
    return () => clearTimeout(t);
  }, [toast]);

  const scriptId: ScriptId = current ? (scriptPick === "auto" ? autoScript(current) : scriptPick) : "cold";
  const lib = useLibrary();
  const lines = useMemo(() => (current ? buildScript(scriptId, current, new Date(), lib) : []), [current, scriptId, lib]);
  const objs = useMemo(() => objectionList(lib), [lib]);
  const obj = openObj === null ? null : (objs[openObj] ?? null);
  const pickObjection = useCallback((i: number) => setOpenObj((cur) => (cur === i ? null : i)), []);

  // Upload a call's audio for the AI review, in the background
  const uploadUrl = useMutation(api.reviews.uploadUrl);
  const attachRecording = useMutation(api.reviews.attach);
  const sendForReview = useCallback(
    async (callId: Id<"calls">, tracks: recorder.CallTracks, scriptText: string) => {
      const silent = !tracks.heardThem
        ? " Heads up: no sound came from the Google Voice tab, so their side may be missing. Make sure you shared the tab the call plays in, with tab audio on."
        : !tracks.heardMe
          ? " Heads up: your headset mic was silent. Check that Brave is using your headset mic."
          : "";
      recorder.setStatus({ tone: "busy", text: `Uploading the call (${Math.round(tracks.durationSec)}s, ${Math.round((tracks.mine.size + tracks.theirs.size) / 1024)} KB)…` });
      try {
        const put = async (blob: Blob) => {
          const url = await uploadUrl({ key });
          const res = await fetch(url, { method: "POST", headers: { "Content-Type": blob.type || "audio/webm" }, body: blob });
          if (!res.ok) throw new Error(`storage upload returned HTTP ${res.status}`);
          return ((await res.json()) as { storageId: Id<"_storage"> }).storageId;
        };
        const [mine, theirs] = await Promise.all([put(tracks.mine), put(tracks.theirs)]);
        recorder.log("Audio saved to Convex storage, attaching it to the call");
        const res = await attachRecording({ key, callId, mine, theirs, durationSec: tracks.durationSec, scriptText });
        recorder.setStatus(
          res.started
            ? { tone: silent ? "warn" : "ok", text: `Uploaded. The review shows in that prospect's History in a minute or two.${silent}` }
            : { tone: "warn", text: "The server didn't keep it (the call was undone, too short, or a no-answer)." },
        );
      } catch (err) {
        console.error("Call recording upload failed", err);
        recorder.setStatus({ tone: "error", text: `Upload failed: ${err instanceof Error ? err.message : String(err)}` });
      }
    },
    [uploadUrl, attachRecording, key],
  );

  const doLog = useCallback(
    async (outcome: Outcome, extra: { callbackAt?: number; meeting?: MeetingDraft } = {}) => {
      if (!current || busy) return;
      setBusy(true);
      try {
        const wasOn = recorder.state() !== "off";
        const tracks = await recorder.stopCall();
        const { callId } = await logCall({ key, prospectId: current._id, outcome, note, ...extra });
        if (!tracks) {
          if (wasOn) {
            recorder.setStatus({
              tone: "warn",
              text: "That call wasn't recorded because it wasn't started from Dial Room. Use the Call in Google Voice button (or G) so recording starts.",
            });
          }
        } else if (outcome === "no_answer" || outcome === "bad_number") {
          recorder.setStatus({ tone: "ok", text: "Not kept: nobody picked up." });
        } else if (tracks.durationSec < 15) {
          recorder.setStatus({ tone: "ok", text: `Not kept: only ${Math.round(tracks.durationSec)} seconds long.` });
        } else {
          const scriptText = lines.map((l) => ("segs" in l ? l.segs.map((s) => s.text).join("") : `(${l.text})`)).join("\n\n");
          void sendForReview(callId, tracks, scriptText);
        }
        if (pinned) clearPinned();
        else if (listId) onListProgress(listId, true);
        const label = OUTCOME_LABEL[outcome];
        if (outcome === "booked") {
          setBurst((b) => b + 1);
          setToast({ text: `Booked ${current.business}. Now get them to accept that invite.`, callId, good: true });
        } else {
          if (todayDials + 1 === goal) setBurst((b) => b + 1);
          setToast({
            text: todayDials + 1 === goal ? `${label} · Daily goal hit. Keep the streak going.` : `${label} · ${current.business}`,
            callId,
            good: todayDials + 1 === goal,
          });
        }
        setNote("");
      } catch (err) {
        setToast({ text: err instanceof Error ? err.message : "Couldn't save that call", callId: null });
      } finally {
        setBusy(false);
        setModal(null);
      }
    },
    [current, busy, logCall, key, note, pinned, clearPinned, listId, onListProgress, todayDials, goal, lines, sendForReview],
  );

  const skip = useCallback(() => {
    if (!current) return;
    recorder.discardCall();
    if (pinned) clearPinned();
    else if (listId) onListProgress(listId, true);
    else setSkipped((s) => [...s, current._id]);
  }, [current, pinned, clearPinned, listId, onListProgress]);

  const undo = useCallback(async () => {
    if (!toast?.callId) return;
    try {
      const prospectId = await undoCall({ key, callId: toast.callId });
      setToast({ text: "Undone. Back on the card.", callId: null });
      if (prospectId) {
        setSkipped((s) => s.filter((id) => id !== prospectId));
        if (callList?.done.includes(prospectId)) onListProgress(prospectId, false);
      }
    } catch (err) {
      setToast({ text: err instanceof Error ? err.message : "Couldn't undo", callId: null });
    }
  }, [toast, undoCall, key, callList, onListProgress]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (modal || e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTyping(e)) {
        if (e.key === "Escape") (e.target as HTMLElement).blur();
        return;
      }
      const k = e.key.toLowerCase();
      const map: Record<string, () => void> = {
        a: () => doLog("no_answer"),
        v: () => doLog("voicemail"),
        f: () => setModal({ kind: "callback", outcome: "front_desk" }),
        c: () => setModal({ kind: "callback", outcome: "callback" }),
        l: () => setModal({ kind: "callback", outcome: "not_now" }),
        x: () => doLog("not_interested"),
        b: () => setModal({ kind: "book" }),
        d: () => doLog("do_not_call"),
        w: () => doLog("bad_number"),
        s: skip,
        n: () => noteRef.current?.focus(),
        z: () => void undo(),
        g: () => {
          if (!current) return;
          recorder.startCall();
          window.open(googleVoiceUrl(current.phone), "dialroom-voice");
        },
        // Number keys open an objection's rebuttal from anywhere on the call screen
        ...Object.fromEntries(
          [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => [String(n % 10), () => n <= objs.length && pickObjection(n - 1)]),
        ),
        escape: () => setOpenObj(null),
      };
      const fn = map[k];
      if (!fn || (!current && k !== "z")) return;
      e.preventDefault();
      if (k === "n") {
        fn();
        return;
      }
      fn();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modal, doLog, skip, undo, current, objs.length, pickObjection]);

  const loading = focusId ? pinnedDoc === undefined : queue === undefined;
  const listLeft = callList ? callList.ids.length - callList.done.length : 0;

  return (
    <div className={`call-page${callList && listLeft > 0 && !pinned ? " in-list" : ""}`}>
      <Confetti burst={burst} />
      {callList && (
        <div className="list-bar">
          {listLeft > 0 ? (
            <span>
              <strong>Today's call list</strong> · {callList.done.length + 1} of {callList.ids.length}
            </span>
          ) : (
            <span>
              <strong>Call list done.</strong> {callList.ids.length} called or skipped. Nice work. The regular queue is below.
            </span>
          )}
          <button className="btn btn-ghost btn-small" onClick={onExitList}>
            {listLeft > 0 ? "Exit list" : "Close"}
          </button>
        </div>
      )}
      <div className="queue-bar">
        <div className="queue-filters">
          <select value={filters.county} onChange={(e) => setFilters({ ...filters, county: e.target.value })} aria-label="County">
            <option value="">All counties</option>
            {facets?.counties.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
          <select value={filters.industry} onChange={(e) => setFilters({ ...filters, industry: e.target.value })} aria-label="Industry">
            <option value="">All industries</option>
            {facets?.industries.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
          <label className="toggle">
            <input type="checkbox" checked={filters.conceptOnly} onChange={(e) => setFilters({ ...filters, conceptOnly: e.target.checked })} />
            <span>Homepage built only</span>
          </label>
          <label className="toggle">
            <input type="checkbox" checked={filters.includeLower} onChange={(e) => setFilters({ ...filters, includeLower: e.target.checked })} />
            <span>Include Lower fits</span>
          </label>
        </div>
        <div className="queue-count">
          {pinned ? (
            <button className="btn btn-ghost btn-small" onClick={clearPinned}>
              Back to the queue
            </button>
          ) : (
            <>
              <strong>{queue?.remaining ?? "…"}</strong> ready to call
              {skipped.length > 0 && (
                <button className="link-btn" onClick={() => setSkipped([])}>
                  {skipped.length} skipped · bring back
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="empty">Loading the queue…</div>
      ) : !current ? (
        <EmptyQueue total={facets?.total ?? 0} filters={filters} onLower={() => setFilters({ ...filters, includeLower: true })} />
      ) : (
        <div className="call-grid">
          <ProspectCard p={current} history={history} />
          <section className="panel script-panel">
            <div className="script-area">
              {obj ? (
                <Rebuttal obj={obj} p={current} onClose={() => setOpenObj(null)} />
              ) : (
                <>
                  <div className="script-picker">
                    {(Object.keys(SCRIPT_LABELS) as ScriptId[]).map((id) => (
                      <button
                        key={id}
                        className={`seg-btn ${panel === "script" && scriptId === id ? "is-on" : ""}`}
                        onClick={() => {
                          setScriptPick(id);
                          setPanel("script");
                        }}
                        title={`${SCRIPT_LABELS[id].title}. ${SCRIPT_LABELS[id].ends}.`}
                      >
                        {SCRIPT_LABELS[id].short}
                        {scriptPick === "auto" && scriptId === id && <em> auto</em>}
                      </button>
                    ))}
                    <button className={`seg-btn ${panel === "frontdesk" ? "is-on" : ""}`} onClick={() => setPanel("frontdesk")}>
                      Front desk
                    </button>
                    <button className={`seg-btn ${panel === "voicemail" ? "is-on" : ""}`} onClick={() => setPanel("voicemail")}>
                      Voicemail
                    </button>
                    {panel === "script" && <span className="script-why muted small">{whyScript(current, scriptId)}</span>}
                  </div>
                  {panel === "script" ? (
                    <ScriptView lines={lines} />
                  ) : panel === "frontdesk" ? (
                    <ScriptView lines={frontDeskLines(current, lib)} />
                  ) : (
                    <ScriptView lines={voicemailLines(current, lib)} />
                  )}
                </>
              )}
            </div>

            <div className="obj-dock">
              <div className="obj-dock-head">
                <span className="obj-dock-title">Objections</span>
                <span className="muted small">Tap one or press its number. Esc goes back to the script.</span>
                <a className="link-btn small" href="#scripts">
                  Edit
                </a>
              </div>
              <div className="obj-grid">
                {objs.map((o, i) => (
                  <button key={o.key} className={`obj-tile ${openObj === i ? "is-on" : ""}`} onClick={() => pickObjection(i)} title={o.title}>
                    {i < 10 && <kbd>{(i + 1) % 10}</kbd>}
                    <span>{shortLabel(o)}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}

      {current && (
        <div className="action-bar">
          <input
            ref={noteRef}
            className="note-input"
            placeholder="Quick note about this call (N)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
          />
          <div className="outcomes">
            <OutcomeBtn k="A" label="No answer" onClick={() => doLog("no_answer")} disabled={busy} />
            <OutcomeBtn k="V" label="Voicemail" onClick={() => doLog("voicemail")} disabled={busy} />
            <OutcomeBtn k="F" label="Front desk" onClick={() => setModal({ kind: "callback", outcome: "front_desk" })} disabled={busy} />
            <span className="outcome-divider" aria-hidden />
            <OutcomeBtn k="C" label="Call back" tone="talk" onClick={() => setModal({ kind: "callback", outcome: "callback" })} disabled={busy} />
            <OutcomeBtn k="L" label="Not right now" tone="talk" onClick={() => setModal({ kind: "callback", outcome: "not_now" })} disabled={busy} />
            <OutcomeBtn k="X" label="Not interested" tone="talk" onClick={() => doLog("not_interested")} disabled={busy} />
            <OutcomeBtn k="B" label="Booked!" tone="win" onClick={() => setModal({ kind: "book" })} disabled={busy} />
            <span className="outcome-divider" aria-hidden />
            <OutcomeBtn k="D" label="Do not call" tone="quiet" onClick={() => doLog("do_not_call")} disabled={busy} />
            <OutcomeBtn k="W" label="Bad number" tone="quiet" onClick={() => doLog("bad_number")} disabled={busy} />
            <OutcomeBtn k="S" label={pinned ? "Close" : "Skip"} tone="quiet" onClick={skip} disabled={busy} />
          </div>
        </div>
      )}

      {toast && (
        <div className={`toast ${toast.good ? "is-good" : ""}`} role="status">
          <span>{toast.text}</span>
          {toast.callId && (
            <button className="link-btn" onClick={undo}>
              Undo <kbd>Z</kbd>
            </button>
          )}
        </div>
      )}

      {modal?.kind === "callback" && current && (
        <CallbackModal
          title={
            modal.outcome === "front_desk"
              ? "Front desk: when should you call back?"
              : modal.outcome === "not_now"
                ? "Not right now: check back when?"
                : "Call back when?"
          }
          hint={
            modal.outcome === "front_desk"
              ? "Use the time they gave you, and put the front desk person's name in the note."
              : modal.outcome === "not_now"
                ? "They said timing, not no. Pick when to check back."
                : "They asked you to call back. Use the time they gave you."
          }
          long={modal.outcome === "not_now"}
          onClose={() => setModal(null)}
          onPick={(ms) => doLog(modal.outcome, { callbackAt: ms })}
        />
      )}
      {modal?.kind === "book" && current && (
        <BookModal prospect={current} onClose={() => setModal(null)} onConfirm={(m) => doLog("booked", { meeting: m })} />
      )}
    </div>
  );
}

/** Short button label: the built-in short name, or a custom objection's title up to the first slash. */
function shortLabel(o: ScriptDef): string {
  return o.short ?? o.title.split(" / ")[0];
}

/** The rebuttal for one objection, big enough to read mid-call. */
function Rebuttal({ obj, p, onClose }: { obj: ScriptDef; p: Doc<"prospects">; onClose: () => void }) {
  return (
    <div className="rebuttal">
      <div className="rebuttal-head">
        <h2>{obj.title}</h2>
        <button className="btn btn-ghost btn-small" onClick={onClose}>
          Back to script <kbd>Esc</kbd>
        </button>
      </div>
      <div className="rb-block">
        <span className="rb-label">Say this</span>
        <p className="rb-say pre-line">
          <Segs segs={objectionSegs(obj.body, p)} />
        </p>
      </div>
      {obj.body2?.trim() && (
        <div className="rb-block is-second">
          <span className="rb-label">If they push back again</span>
          <p className="rb-say pre-line">
            <Segs segs={objectionSegs(obj.body2, p)} />
          </p>
          <p className="rb-back">
            <Segs segs={objectionSegs("Then back to the meeting: \"What's your calendar like {day1} or {day2}?\"", p)} />
          </p>
        </div>
      )}
      {obj.note && (
        <p className="rb-note">
          <Segs segs={objectionSegs(obj.note, p)} />
        </p>
      )}
      <p className="muted small">A hard no ends the call: "No problem at all, thanks for your time." Then log it.</p>
    </div>
  );
}

function whyScript(p: Doc<"prospects">, id: ScriptId): string {
  if (id === "followup") return hasPriorTouch(p) ? "They already got a message from you." : "Follow-up script picked by hand.";
  return hasPriorTouch(p) ? "Cold script picked by hand." : "No earlier message from you.";
}

function OutcomeBtn({
  k,
  label,
  onClick,
  tone,
  disabled,
}: {
  k: string;
  label: string;
  onClick: () => void;
  tone?: "talk" | "win" | "quiet";
  disabled?: boolean;
}) {
  return (
    <button className={`outcome ${tone ? `is-${tone}` : ""}`} onClick={onClick} disabled={disabled}>
      <span>{label}</span>
      <kbd>{k}</kbd>
    </button>
  );
}

function EmptyQueue({ total, filters, onLower }: { total: number; filters: Filters; onLower: () => void }) {
  if (!total) {
    return (
      <div className="empty">
        <h2>No prospects yet</h2>
        <p className="muted">
          Head to <a href="#import">Import</a> and paste in a county prospect list.
        </p>
      </div>
    );
  }
  return (
    <div className="empty">
      <h2>Queue's clear</h2>
      <p className="muted">Everyone who matches these filters is called, booked, or scheduled for later.</p>
      <div className="row gap center">
        {!filters.includeLower && (
          <button className="btn" onClick={onLower}>
            Include Lower fits
          </button>
        )}
        <a className="btn btn-ghost" href="#meetings">
          Check meetings
        </a>
      </div>
    </div>
  );
}

function ProspectCard({ p, history }: { p: Doc<"prospects">; history: Doc<"calls">[] }) {
  const key = useKey();
  const update = useMutation(api.prospects.update);
  const meetings = useQuery(api.meetings.forProspect, { key, prospectId: p._id });
  const [owner, setOwner] = useState(p.ownerName);
  const [conceptUrl, setConceptUrl] = useState(p.conceptUrl);
  const [notes, setNotes] = useState(p.callNotes);

  useEffect(() => {
    setOwner(p.ownerName);
    setConceptUrl(p.conceptUrl);
    setNotes(p.callNotes);
  }, [p._id, p.ownerName, p.conceptUrl, p.callNotes]);

  const save = (patch: Parameters<typeof update>[0]["patch"]) => update({ key, id: p._id, patch });

  return (
    <section className="panel card">
      <div className="card-top">
        <div className="badges">
          <span className={`badge fit-${p.fit.toLowerCase() || "none"}`}>{p.fit || "No fit"}</span>
          <span className="badge">{STATUS_LABEL[p.callStatus]}</span>
          {p.callStatus === "callback" && <span className="badge is-due">Callback {relative(p.nextCallAt)}</span>}
          {p.attempts > 0 && <span className="badge">Attempt {p.attempts + 1}</span>}
        </div>
        <h1 className="biz">{p.business}</h1>
        <p className="meta">
          {[p.industry, p.town, p.county].filter(Boolean).join(" · ")}
          {p.googleRating && (
            <>
              {" "}
              · <span className="stars">★ {p.googleRating}</span> ({p.reviews || 0})
            </>
          )}
        </p>
      </div>

      <PhoneBlock p={p} />
      <RecordBar />

      <label className="field">
        <span>Ask for</span>
        <input
          value={owner}
          placeholder="Owner's name (check Google reviews or the About page)"
          onChange={(e) => setOwner(e.target.value)}
          onBlur={() => owner !== p.ownerName && save({ ownerName: owner.trim() })}
        />
      </label>

      <ProspectLinks p={p} />

      <NoteBox label="Your angle" text={p.whatToMention} lime />

      <div className="concept">
        <label className="check">
          <input type="checkbox" checked={p.conceptBuilt} onChange={(e) => save({ conceptBuilt: e.target.checked })} />
          Homepage concept built
        </label>
        <input
          value={conceptUrl}
          placeholder="Concept link (Netlify preview, recording…)"
          onChange={(e) => setConceptUrl(e.target.value)}
          onBlur={() => conceptUrl !== p.conceptUrl && save({ conceptUrl: conceptUrl.trim() })}
        />
      </div>

      <NoteBox label="Notes" text={freeNotes(p.sheetNotes)} />

      <label className="field">
        <span>Your call notes</span>
        <textarea
          rows={3}
          value={notes}
          placeholder="Anything to remember next time: who answered, best time, what they said"
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => notes !== p.callNotes && save({ callNotes: notes })}
        />
      </label>

      <History p={p} calls={history} meetings={meetings} />

      <details className="all-details">
        <summary>All details</summary>
        <ProspectFacts p={p} />
      </details>
    </section>
  );
}


/** Call recording for AI reviews: share the Google Voice tab once, then every call records itself. */
function RecordBar() {
  const state = useSyncExternalStore(recorder.subscribe, recorder.state);
  const status = useSyncExternalStore(recorder.subscribe, recorder.getStatus);
  const events = useSyncExternalStore(recorder.subscribe, recorder.events);
  const held = useSyncExternalStore(recorder.subscribe, recorder.hasHeldCall);
  const missed = useSyncExternalStore(recorder.subscribe, recorder.missedCallStart);
  const heard = useSyncExternalStore(recorder.subscribe, () => {
    const h = recorder.hearing();
    return `${h.me ? 1 : 0}${h.them ? 1 : 0}`;
  });
  const [error, setError] = useState("");
  const [testing, setTesting] = useState(false);
  const uploadUrl = useMutation(api.reviews.uploadUrl);
  const testRecording = useAction(api.reviews.testRecording);
  const key = useKey();
  if (!recorder.supported()) return null;
  async function runTest() {
    setError("");
    setTesting(true);
    try {
      if (recorder.state() === "off") {
        recorder.log("Test: turning recording on first. Pick a tab that's playing audio, with tab audio on.");
        await recorder.startSession();
      }
      const tracks = await recorder.recordTest(10);
      const put = async (blob: Blob, who: string) => {
        const url = await uploadUrl({ key });
        const res = await fetch(url, { method: "POST", headers: { "Content-Type": blob.type || "audio/webm" }, body: blob });
        if (!res.ok) throw new Error(`Uploading ${who} returned HTTP ${res.status}`);
        return ((await res.json()) as { storageId: Id<"_storage"> }).storageId;
      };
      recorder.log("Test: uploading both tracks to Convex");
      const [mine, theirs] = await Promise.all([put(tracks.mine, "your track"), put(tracks.theirs, "their track")]);
      recorder.log("Test: both tracks are in Convex storage. Transcribing");
      const r = await testRecording({ key, mine, theirs });
      const line = (label: string, t: { stored: boolean; kb: number; text: string; error: string }) =>
        `${label}: ${t.stored ? `${t.kb} KB stored` : "NOT stored"}, ${t.error ? `error: ${t.error}` : t.text ? `heard "${t.text.slice(0, 140)}"` : "no speech heard"}`;
      recorder.log(line("Test, tab", r.theirs));
      recorder.log(line("Test, mic", r.mine));
      const ok = r.mine.stored && r.theirs.stored && !r.mine.error && !r.theirs.error;
      recorder.setStatus(
        ok
          ? { tone: "ok", text: `Test passed: recorded, uploaded to Convex and transcribed.${r.keys.anthropic ? "" : " ANTHROPIC_API_KEY is missing, so call reviews would still fail."}` }
          : { tone: "error", text: "Test finished with a problem. Open the recording log below for the step that failed." },
      );
    } catch (err) {
      console.error("Recording test failed", err);
      recorder.setStatus({ tone: "error", text: `Test failed: ${err instanceof Error ? err.message : String(err)}` });
    } finally {
      setTesting(false);
    }
  }
  async function start() {
    setError("");
    try {
      await recorder.startSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start recording");
    }
  }
  return (
    <div className={`record-bar is-${state}`}>
      {state === "off" && (
        <>
          <span className="small">
            {missed ? (
              <>
                <strong>This call isn't recording yet.</strong> Start recording now and pick the Google Voice tab to catch the rest of it.
              </>
            ) : (
              <>
                <strong>Call reviews are off.</strong> Open Google Voice, then start recording and pick that tab with tab audio on.
              </>
            )}
          </span>
          <div className="row gap">
            <a className="btn btn-small btn-ghost" href="https://voice.google.com/u/0/calls" target="dialroom-voice" rel="noopener">
              Open Google Voice
            </a>
            <button className={`btn btn-small ${missed ? "btn-primary" : ""}`} onClick={start}>
              Start recording
            </button>
          </div>
        </>
      )}
      {state === "ready" && (
        <>
          <span className="small">
            <span className="rec-dot is-ready" /> <strong>Recording on.</strong> Each call records from when you hit Call until you log it.
          </span>
          <div className="row gap">
            <button className="btn btn-small btn-ghost" onClick={() => recorder.startCall()} title="Already dialed from Google Voice? Start recording this call now.">
              Record current call
            </button>
            <button className="link-btn small" onClick={() => void recorder.endSession()}>
              Turn off
            </button>
          </div>
        </>
      )}
      {state === "recording" && (
        <>
          <span className="small">
            <span className="rec-dot" /> {testing ? <strong>Test recording. Say something now.</strong> : <><strong>Recording this call.</strong> Log the outcome when you hang up.</>}{" "}
            <span className={heard[0] === "1" ? "success-text" : "muted"}>You {heard[0] === "1" ? "✓" : "…"}</span>{" "}
            <span className={heard[1] === "1" ? "success-text" : "muted"}>Them {heard[1] === "1" ? "✓" : "…"}</span>
          </span>
          <div className="row gap">
            <button className="btn btn-small btn-ghost" onClick={() => void recorder.endSession("Stop recording clicked")} title="Stops recording and keeps this call. Log the outcome to send it for review.">
              Stop recording
            </button>
            <button className="link-btn small" onClick={() => recorder.discardCall()}>
              Don't keep
            </button>
          </div>
        </>
      )}
      {state !== "off" && <MicPicker disabled={state === "recording"} />}
      {(state !== "recording" || testing) && (
        <div className="rec-test">
          <button className="btn btn-small" onClick={() => void runTest()} disabled={testing}>
            {testing ? "Testing… talk now" : "Test recording (10s)"}
          </button>
          <span className="small muted">Records 10 seconds, uploads to Convex and transcribes it. No call needed.</span>
        </div>
      )}
      {held && state !== "recording" && (
        <p className="small rec-status is-ok">Call saved. Log the outcome below to send it for review.</p>
      )}
      {error && <p className="error-text small">{error}</p>}
      {!error && !held && status && state !== "recording" && (
        <p className={`small rec-status is-${status.tone}`}>{status.text}</p>
      )}
      {events.length > 0 && (
        <details className="rec-log">
          <summary className="small muted">Recording log</summary>
          <ol>
            {events.map((e) => (
              <li key={`${e.at}-${e.text}`} className="small">
                <span className="muted">{new Date(e.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" })}</span> {e.text}
              </li>
            ))}
          </ol>
        </details>
      )}
    </div>
  );
}

/** Pick which mic records your side (your headset, not the laptop's built-in mic). */
function MicPicker({ disabled }: { disabled: boolean }) {
  const [list, setList] = useState<recorder.Mic[]>([]);
  const [current, setCurrent] = useState(() => recorder.currentMic()?.id ?? "");
  useEffect(() => {
    const load = () => void recorder.mics().then(setList).catch(() => setList([]));
    load();
    navigator.mediaDevices.addEventListener("devicechange", load);
    return () => navigator.mediaDevices.removeEventListener("devicechange", load);
  }, []);
  if (list.length < 2) return null;
  return (
    <label className="small mic-pick">
      <span className="muted">Mic</span>
      <select
        value={current}
        disabled={disabled}
        onChange={(e) => {
          const id = e.target.value;
          setCurrent(id);
          void recorder.setMic(id);
        }}
      >
        {!list.some((m) => m.id === current) && <option value={current}>{recorder.currentMic()?.label ?? "Current mic"}</option>}
        {list.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label}
          </option>
        ))}
      </select>
    </label>
  );
}
