import { useState, type ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import * as recorder from "../lib/recorder";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import { useKey } from "../session";
import { emails, facebookSearchUrl, gmailThreadUrl, googleMapsUrl, googleVoiceUrl, phoneDigits, prettyUrl, toUrl } from "../lib/links";
import { fmtDateTime, fmtTime, relative } from "../lib/dates";
import { STATUS_LABEL } from "../lib/labels";
import { hasPriorTouch } from "../lib/script";
import { buildTimeline, dayLabel, type CallReview, type NextUp, type TimelineItem } from "../lib/timeline";
import { computeCadence, stepLabel } from "../lib/cadence";

/** Phone with dial buttons. */
export function PhoneBlock({ p }: { p: Doc<"prospects"> }) {
  const [copied, setCopied] = useState(false);
  if (!p.phone.trim()) return <p className="muted">No phone number on file.</p>;
  async function copy() {
    try {
      await navigator.clipboard.writeText(p.phone);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard blocked */
    }
  }
  return (
    <div className="dial">
      <a className="phone" href={`tel:+1${phoneDigits(p.phone)}`}>
        {p.phone}
      </a>
      <div className="row gap wrap">
        <a className="btn btn-primary" href={googleVoiceUrl(p.phone)} target="dialroom-voice" rel="noopener" onClick={() => recorder.startCall()}>
          Call in Google Voice <kbd>G</kbd>
        </a>
        <button className="btn btn-ghost" onClick={copy}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

/** Every link we can make for this prospect: site, concept, Facebook, Google listing, email. */
export function ProspectLinks({ p }: { p: Doc<"prospects"> }) {
  const site = toUrl(p.website);
  const concept = toUrl(p.conceptUrl);
  const fb = toUrl(p.facebook);
  const mails = emails(p.email);
  return (
    <div className="link-chips">
      {site ? (
        <a className="link-chip" href={site} target="_blank" rel="noopener">
          <span>Website</span>
          {prettyUrl(site)}
        </a>
      ) : (
        <span className="link-chip is-empty">
          <span>Website</span>
          {p.builtWith || "None"}
        </span>
      )}
      {concept && (
        <a className="link-chip is-lime" href={concept} target="_blank" rel="noopener">
          <span>Concept</span>
          {prettyUrl(concept)}
        </a>
      )}
      {fb ? (
        <a className="link-chip" href={fb} target="_blank" rel="noopener">
          <span>Facebook</span>
          Open page
        </a>
      ) : (
        <a className="link-chip" href={facebookSearchUrl(p.business)} target="_blank" rel="noopener" title={p.facebook || "No Facebook link saved"}>
          <span>Facebook</span>
          {p.facebook ? `${p.facebook} · search` : "Search"}
        </a>
      )}
      <a className="link-chip" href={googleMapsUrl(p.business, p.town)} target="_blank" rel="noopener">
        <span>Google listing</span>
        Reviews &amp; owner names
      </a>
      {mails.length > 0 && (
        <a className="link-chip" href={gmailThreadUrl(mails)} target="dialroom-gmail" rel="noopener">
          <span>Gmail</span>
          Your emails with them
        </a>
      )}
      {mails.map((m) => (
        <a key={m} className="link-chip" href={`mailto:${m}`}>
          <span>Email</span>
          {m}
        </a>
      ))}
    </div>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

const blank = <span className="muted">-</span>;
const val = (s: string) => (s.trim() ? s : blank);

/** All the columns from the sheet plus the calling data, grouped. */
export function ProspectFacts({ p }: { p: Doc<"prospects"> }) {
  return (
    <div className="fact-groups">
      <section>
        <h4>Business</h4>
        <dl className="facts">
          <Fact label="Industry">{val(p.industry)}</Fact>
          <Fact label="Town">{val([p.town, p.county].filter(Boolean).join(", "))}</Fact>
          <Fact label="Fit">{val(p.fit)}</Fact>
          <Fact label="Site built with">{val(p.builtWith)}</Fact>
          <Fact label="Google rating">
            {p.googleRating ? (
              <>
                <span className="stars">★ {p.googleRating}</span> from {p.reviews || 0} reviews
              </>
            ) : (
              blank
            )}
          </Fact>
          <Fact label="Last review">{val(p.lastReview)}</Fact>
        </dl>
      </section>
      <section>
        <h4>Outreach</h4>
        <dl className="facts">
          <Fact label="Status">{val(p.sheetStatus)}</Fact>
        </dl>
        <OutreachActions p={p} />
      </section>
      <section>
        <h4>Calling</h4>
        <dl className="facts">
          <Fact label="Call status">{STATUS_LABEL[p.callStatus]}</Fact>
          <Fact label="Calls made">{p.attempts}</Fact>
          <Fact label="Next call">
            {["new", "calling", "callback"].includes(p.callStatus)
              ? p.nextCallAt > Date.now()
                ? `${fmtDateTime(p.nextCallAt)} (${relative(p.nextCallAt)})`
                : "Any time"
              : blank}
          </Fact>
          <Fact label="Homepage concept">{p.conceptBuilt ? "Built" : "Not yet"}</Fact>
          <Fact label="Script">{hasPriorTouch(p) ? "1 · Follow-up" : "2 · Cold"}</Fact>
        </dl>
      </section>
    </div>
  );
}

export function NoteBox({ label, text, lime }: { label: string; text: string; lime?: boolean }) {
  if (!text.trim()) return null;
  return (
    <div className={lime ? "angle" : "sheet-notes"}>
      <span className="angle-label">{label}</span>
      <p>{text}</p>
    </div>
  );
}

const LANE_LABEL: Record<TimelineItem["lane"], string> = {
  Email: "Email",
  Facebook: "Facebook",
  Text: "Text",
  Instagram: "Instagram",
  Call: "Call",
  Meeting: "Meeting",
  Plan: "Plan",
};

function TimelineRow({ item, now, upcoming }: { item: TimelineItem; now: Date; upcoming?: boolean }) {
  const [open, setOpen] = useState(false);
  const r = item.review;
  return (
    <li className={`tl-row${upcoming ? " is-upcoming" : ""}${item.overdue ? " is-overdue" : ""}${item.reply ? " is-reply" : ""}`}>
      <span className="tl-date">
        {item.overdue ? "Overdue" : dayLabel(item.at, now)}
        {item.timeKnown && !item.overdue && <span className="tl-time">{fmtTime(item.at)}</span>}
        {item.overdue && <span className="tl-time">{dayLabel(item.at, now)}</span>}
      </span>
      <span className={`tl-lane lane-${item.lane.toLowerCase()}`}>{LANE_LABEL[item.lane]}</span>
      <span className="tl-body">
        <strong>{item.title}</strong>
        {r?.status === "done" && r.data?.summary ? <span className="tl-detail">{r.data.summary}</span> : item.detail && <span className="tl-detail">{item.detail}</span>}
        {r && (
          <span className="row gap wrap tl-review-line">
            {r.status === "processing" && <span className="muted small">Reviewing the call…</span>}
            {r.status === "error" && <ReviewError review={r} />}
            {r.status === "done" && (
              <>
                {typeof r.data?.score === "number" && <span className={`score-chip s${Math.round(r.data.score / 2)}`}>{r.data.score}/10</span>}
                <button className="link-btn small" onClick={() => setOpen((o) => !o)}>
                  {open ? "Hide review" : "Call review"}
                </button>
              </>
            )}
          </span>
        )}
      </span>
      {open && r?.status === "done" && <CallReviewPanel review={r} />}
    </li>
  );
}

function ReviewError({ review }: { review: CallReview }) {
  const key = useKey();
  const retry = useMutation(api.reviews.retry);
  const [msg, setMsg] = useState("");
  return (
    <span className="small">
      <span className="error-text">Review failed: {review.error}</span>{" "}
      <button
        className="link-btn small"
        onClick={async () => {
          try {
            await retry({ key, callId: review.callId });
          } catch (err) {
            setMsg(err instanceof Error ? err.message : "Couldn't retry");
          }
        }}
      >
        Retry
      </button>
      {msg && <span className="muted"> {msg}</span>}
    </span>
  );
}

/** The AI review of one call: score, what went well, what to fix, and the transcript. */
function CallReviewPanel({ review }: { review: CallReview }) {
  const d = review.data ?? {};
  const [showTranscript, setShowTranscript] = useState(false);
  const fillers = Object.entries(d.fillers ?? {}).sort((a, b) => b[1] - a[1]);
  const mins = review.durationSec ? `${Math.floor(review.durationSec / 60)}:${String(Math.round(review.durationSec % 60)).padStart(2, "0")}` : "";
  return (
    <div className="call-review">
      <div className="row gap wrap cr-stats">
        {mins && <span className="muted small">Length {mins}</span>}
        {typeof d.myShare === "number" && <span className="muted small">You talked {d.myShare}%</span>}
        {fillers.length > 0 && <span className="muted small">Fillers: {fillers.map(([w, n]) => `${w} ×${n}`).join(", ")}</span>}
      </div>
      {d.grades && d.grades.length > 0 && (
        <ul className="cr-grades">
          {d.grades.map((g) => (
            <li key={g.area}>
              <span className="cr-area">{g.area}</span>
              <span className="cr-dots" aria-label={g.score ? `${g.score} of 5` : "Didn't come up"}>
                {g.score ? "●".repeat(g.score) + "○".repeat(5 - g.score) : "n/a"}
              </span>
              <span className="muted small">{g.note}</span>
            </li>
          ))}
        </ul>
      )}
      {d.wentWell && d.wentWell.length > 0 && (
        <div>
          <span className="cr-head">What went well</span>
          <ul className="cr-list">
            {d.wentWell.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}
      {d.fixes && d.fixes.length > 0 && (
        <div>
          <span className="cr-head">Next time</span>
          <ul className="cr-fixes">
            {d.fixes.map((f) => (
              <li key={f.said}>
                <span className="muted small">You said: "{unquote(f.said)}"</span>
                <span>Try: "{unquote(f.better)}"</span>
                <span className="muted small">{f.why}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {d.nextStep && (
        <p className="small">
          <strong>Next step:</strong> {d.nextStep}
        </p>
      )}
      {review.transcript && review.transcript.length > 0 && (
        <div>
          <button className="link-btn small" onClick={() => setShowTranscript((s) => !s)}>
            {showTranscript ? "Hide transcript" : "Show transcript"}
          </button>
          {showTranscript && (
            <div className="cr-transcript">
              {review.transcript.map((s, i) => (
                <p key={i} className={s.who === "me" ? "is-me" : ""}>
                  <span className="muted small">
                    {Math.floor(s.start / 60)}:{String(Math.floor(s.start % 60)).padStart(2, "0")} {s.who === "me" ? "You" : "Them"}
                  </span>{" "}
                  {s.text}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Where this prospect stands, in a couple of words. */
function outreachStatus(p: Doc<"prospects">, c: ReturnType<typeof computeCadence>, now: Date): { label: string; tone: string } {
  if (p.callStatus === "won" || p.sheetStatus === "Won") return { label: "Client", tone: "fit-strong" };
  if (p.callStatus === "booked" || p.sheetStatus === "Call booked") return { label: "Meeting booked", tone: "fit-strong" };
  if (p.callStatus === "do_not_call") return { label: "Do not contact", tone: "" };
  if (p.callStatus === "not_interested" || p.sheetStatus === "Not interested") return { label: "Not interested", tone: "" };
  if (p.sheetStatus === "Replied") return { label: "Replied", tone: "fit-good" };
  if (c.state === "resting" && c.restUntil) {
    const back = dayLabel(c.restUntil, now);
    return { label: p.sheetStatus === "Not right now" ? `Not right now · back ${back}` : `Resting · back ${back}`, tone: "" };
  }
  if (c.state === "active") return { label: c.round > 1 ? `In outreach · round ${c.round}` : "In outreach", tone: "is-due" };
  if (c.state === "new") return { label: c.round > 1 ? `Ready for round ${c.round}` : "Not contacted yet", tone: "" };
  return { label: "No way to reach", tone: "" };
}

/** Every email, Facebook message, call and meeting with this prospect, plus what's next. */
export function History({
  p,
  calls,
  meetings,
}: {
  p: Doc<"prospects">;
  calls: Doc<"calls">[] | undefined;
  meetings: Doc<"meetings">[] | undefined;
}) {
  const key = useKey();
  const touches = useQuery(api.prospects.touches, { key, id: p._id });
  const now = new Date();
  const cadence = computeCadence(p, touches ?? [], calls ?? [], now);
  const next: NextUp = cadence.next
    ? {
        kind: cadence.next.kind,
        title: cadence.next.kind === "call" && cadence.next.callback ? "Callback" : stepLabel(cadence.next),
        reason: cadence.state === "new" ? `${cadence.next.reason}. Comes up on the Today page when there's room.` : cadence.next.reason,
        due: cadence.next.due,
        callback: cadence.next.kind === "call" ? cadence.next.callback : undefined,
      }
    : cadence.state === "resting" && cadence.restUntil
      ? { kind: "rest", until: cadence.restUntil, round: cadence.round }
      : null;
  const { upcoming, past } = buildTimeline(p, touches ?? [], calls ?? [], meetings ?? [], now, next);
  const mails = emails(p.email);
  const emailed = past.some((i) => i.lane === "Email");
  const outreachTouches = past.filter((i) => !i.reply && (i.lane === "Email" || i.lane === "Facebook" || i.lane === "Call" || i.lane === "Text" || i.lane === "Instagram")).length;
  const status = outreachStatus(p, cadence, now);
  return (
    <div className="history timeline">
      <div className="row between tl-head">
        <span className="row gap tl-title">
          <span className="angle-label">History</span>
          <span className={`badge ${status.tone}`}>{status.label}</span>
          {outreachTouches > 0 && (
            <span className="muted small">
              {outreachTouches} {outreachTouches === 1 ? "touch" : "touches"}
            </span>
          )}
        </span>
        {emailed && mails.length > 0 && (
          <a className="inline-link small" href={gmailThreadUrl(mails)} target="dialroom-gmail" rel="noopener">
            Open emails in Gmail
          </a>
        )}
      </div>
      {upcoming.length > 0 && (
        <>
          <span className="tl-group">Coming up</span>
          <ul>
            {upcoming.map((i) => (
              <TimelineRow key={i.id} item={i} now={now} upcoming />
            ))}
          </ul>
        </>
      )}
      {(upcoming.length > 0 || past.length > 0) && <span className="tl-group">So far</span>}
      {past.length > 0 ? (
        <ul>
          {past.map((i) => (
            <TimelineRow key={i.id} item={i} now={now} />
          ))}
        </ul>
      ) : (
        <p className="muted small">No contact yet. Log an email or Facebook message, or give them a call.</p>
      )}
    </div>
  );
}

const RESPONSE_OUTCOMES = ["Interested", "Not interested", "Not right now"] as const;
type ResponseOutcome = (typeof RESPONSE_OUTCOMES)[number];
const RESPONSE_CHANNELS = ["Facebook", "Email", "Text", "Instagram"] as const;

function localInput(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** One-click logging for outreach sent outside the app (email, Facebook), and for their response. */
export function OutreachActions({ p }: { p: Doc<"prospects"> }) {
  const key = useKey();
  const log = useMutation(api.prospects.logOutreach);
  const logResponse = useMutation(api.prospects.logResponse);
  const [done, setDone] = useState("");
  const [replying, setReplying] = useState(false);
  const firstCh = RESPONSE_CHANNELS.find((c) => c === p.firstChannel) ?? "Facebook";
  const [channel, setChannel] = useState<(typeof RESPONSE_CHANNELS)[number]>(firstCh);
  const [outcome, setOutcome] = useState<ResponseOutcome | null>(null);
  const [when, setWhen] = useState(() => localInput(Date.now()));
  const [note, setNote] = useState("");
  function flash(text: string) {
    setDone(text);
    setTimeout(() => setDone(""), 2500);
  }
  async function send(ch: "Email" | "Facebook") {
    await log({ key, id: p._id, channel: ch });
    flash(ch === "Email" ? "Email logged for today" : "Facebook message logged for today");
  }
  async function saveResponse() {
    if (!outcome) return;
    const at = new Date(when).getTime();
    await logResponse({ key, id: p._id, channel, outcome, note, at: Number.isFinite(at) ? at : undefined });
    setReplying(false);
    setOutcome(null);
    setNote("");
    flash("Response logged. They're out of the outreach cadence.");
  }
  return (
    <div className="outreach-actions">
      <div className="row gap wrap">
        <button className="btn btn-small" onClick={() => send("Email")}>
          Log email sent
        </button>
        <button className="btn btn-small" onClick={() => send("Facebook")}>
          Log Facebook message
        </button>
        <button className={`btn btn-small${replying ? " btn-primary" : ""}`} onClick={() => setReplying((r) => !r)}>
          They responded
        </button>
        {done && <span className="success-text small">{done}</span>}
      </div>
      {replying && (
        <div className="response-form">
          <div className="row gap wrap">
            {RESPONSE_OUTCOMES.map((o) => (
              <button key={o} className={`chip-btn${outcome === o ? " is-on" : ""}`} onClick={() => setOutcome(o)}>
                {o}
              </button>
            ))}
          </div>
          <div className="row gap wrap">
            <label className="field small-field">
              <span>On</span>
              <select value={channel} onChange={(e) => setChannel(e.target.value as (typeof RESPONSE_CHANNELS)[number])}>
                {RESPONSE_CHANNELS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="field small-field">
              <span>When</span>
              <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
            </label>
          </div>
          <label className="field">
            <span>What they said (optional)</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Signed with someone else, has another business..." />
          </label>
          <p className="muted small">
            {outcome === "Not right now"
              ? "Takes them out of the cadence. They come back for a new round in about 2 months."
              : outcome === "Not interested"
                ? "Takes them out of the cadence for good and marks them Not interested."
                : "Takes them out of the cadence. From here the conversation is yours."}
          </p>
          <div className="row gap">
            <button className="btn btn-small btn-primary" disabled={!outcome} onClick={saveResponse}>
              Save response
            </button>
            <button className="btn btn-small btn-ghost" onClick={() => setReplying(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** The AI sometimes wraps quotes in its own quote marks; strip them so they aren't doubled. */
function unquote(text: string): string {
  return text.trim().replace(/^["'“”‘’]+|["'“”‘’]+$/g, "");
}
