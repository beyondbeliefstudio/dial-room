import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { useKey } from "../session";
import { emailDraft, emailFollowUp, facebookFollowUp, facebookMessage, EMAIL_STEP_STATUS, gmailComposeUrl, type EmailStep } from "../lib/outreach";
import { buildDay, CADENCE, stepLabel, type CallItem, type WriteItem } from "../lib/cadence";
import { emails, gmailThreadUrl, OUTREACH_GMAIL, prettyUrl, toUrl } from "../lib/links";
import { fmtDateTime, fmtTime, isTomorrow, startOfDay, ymd } from "../lib/dates";
import { pendingFacebookLinks } from "../lib/facebookLinks";
import { ProspectDrawer } from "./ProspectsPage";
import { useLibrary } from "../library";

type P = Doc<"prospects">;

function useSkipped(day: string) {
  const storageKey = `dialroom.skip.${day}`;
  const [skipped, setSkipped] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(storageKey) ?? "[]"));
    } catch {
      return new Set();
    }
  });
  function skip(id: string) {
    setSkipped((s) => {
      const next = new Set(s).add(id);
      try {
        localStorage.setItem(storageKey, JSON.stringify([...next]));
      } catch {
        /* not critical */
      }
      return next;
    });
  }
  return { skipped, skip };
}


export default function TodayPage({
  onCall,
  onStartList,
  todayDials,
  goal,
}: {
  onCall: (id: Id<"prospects">) => void;
  onStartList: (ids: Id<"prospects">[]) => void;
  todayDials: number;
  goal: number;
}) {
  const key = useKey();
  const prospects = useQuery(api.prospects.list, { key });
  const touches = useQuery(api.prospects.allTouches, { key });
  const meetings = useQuery(api.meetings.list, { key });
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);
  const since = useMemo(() => startOfDay(new Date(Date.now() - 400 * 86400000)).getTime(), []);
  const calls = useQuery(api.calls.since, { key, since });
  const { skipped, skip } = useSkipped(ymd(now));
  const [openId, setOpenId] = useState<Id<"prospects"> | null>(null);

  const day = useMemo(
    () =>
      prospects && touches && calls
        ? buildDay(prospects, touches, calls, now, { skipped, dialGoal: goal, dialsToday: todayDials })
        : null,
    [prospects, touches, calls, now, skipped, goal, todayDials],
  );
  const pendingLinks = useMemo(() => (prospects ? pendingFacebookLinks(prospects) : []), [prospects]);
  const soonMeetings = useMemo(
    () =>
      (meetings ?? [])
        .filter((m) => m.status === "scheduled" && m.startsAt > now.getTime() - 3600000 && m.startsAt < now.getTime() + 2 * 86400000)
        .sort((a, b) => a.startsAt - b.startsAt),
    [meetings, now],
  );

  if (!prospects || !day) return <div className="empty">Loading today's plan…</div>;
  const open = prospects.find((p) => p._id === openId) ?? null;
  const hour = now.getHours();
  const hello = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const isWeekend = now.getDay() === 0 || now.getDay() === 6;
  const callList = [...day.calls, ...day.freshCalls];
  const followUps = day.writes.filter((w) => !w.isNew);
  const fresh = day.writes.filter((w) => w.isNew);

  return (
    <div className="page today-page">
      <div className="page-head">
        <div>
          <p className="eyebrow">{now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
          <h1>{hello}, Chris</h1>
          {isWeekend && <p className="muted">It's the weekend. Everything below will still be here Monday.</p>}
        </div>
      </div>

      <div className="today-tiles">
        <Tile label="To call" value={callList.length} sub={day.freshCalls.length ? `${day.calls.length} due, ${day.freshCalls.length} fresh` : "due today"} />
        <Tile label="Follow-ups" value={followUps.length} sub="emails and messages due" />
        <Tile label="New today" value={day.newStartedToday} sub={`of ${CADENCE.newPerDay} started`} done={day.newLeft === 0} />
        <Tile label="Dials" value={todayDials} sub={`of ${goal} today`} done={todayDials >= goal} />
      </div>

      {pendingLinks.length > 0 && <RestoreLinks pending={pendingLinks} />}

      {soonMeetings.length > 0 && (
        <Section title="Meetings" count={soonMeetings.length}>
          {soonMeetings.map((m) => (
            <div key={m._id} className="task">
              <div className="task-head">
                <div>
                  <strong>{m.prospect?.business ?? "Meeting"}</strong>
                  <p className="muted small">
                    {isTomorrow(new Date(m.startsAt), now) ? "Tomorrow" : new Date(m.startsAt).toDateString() === now.toDateString() ? "Today" : fmtDateTime(m.startsAt)} at{" "}
                    {fmtTime(m.startsAt)} · {m.accepted ? "invite accepted" : "invite not accepted yet"}
                  </p>
                </div>
                <div className="row gap">
                  {!m.accepted && !m.prepCallDone && <span className="badge is-due">Prep call</span>}
                  <a className="btn btn-small" href="#meetings">
                    Open
                  </a>
                </div>
              </div>
            </div>
          ))}
        </Section>
      )}

      <Section
        title="Call list"
        count={callList.length}
        note="Everyone you emailed or messaged on the last business day, plus callbacks. Call them before anything else goes out."
        action={
          callList.length > 0 ? (
            <button className="btn btn-primary btn-small" onClick={() => onStartList(callList.map((c) => c.p._id))}>
              Start calling ({callList.length})
            </button>
          ) : undefined
        }
        empty="Nobody to call right now. Send today's emails and they'll be on tomorrow's list."
      >
        {callList.map((item) => (
          <CallRow key={item.p._id} item={item} onCall={() => onCall(item.p._id)} onDetails={() => setOpenId(item.p._id)} onSkip={() => skip(item.p._id)} />
        ))}
      </Section>

      <Section
        title="Follow-ups"
        count={followUps.length}
        note="Emails and Facebook messages due. Each one only shows up after you've tried calling."
        empty="No follow-ups due."
      >
        {followUps.map((w) => (
          <WrittenTask key={w.p._id} item={w} now={now} onDetails={() => setOpenId(w.p._id)} onSkip={() => skip(w.p._id)} />
        ))}
      </Section>

      <Section
        title="New today"
        count={fresh.length}
        note={`${day.newStartedToday} of ${CADENCE.newPerDay} started today. Email first, Facebook when there's no email. Tomorrow they're on your call list.`}
        empty={
          day.newLeft === 0
            ? `All ${CADENCE.newPerDay} new prospects started today. Nice.`
            : "No new prospects left. Time to add a new county (Mecklenburg is next)."
        }
      >
        {fresh.map((w) => (
          <WrittenTask key={w.p._id} item={w} now={now} onDetails={() => setOpenId(w.p._id)} onSkip={() => skip(w.p._id)} />
        ))}
      </Section>

      {open && <ProspectDrawer p={open} onClose={() => setOpenId(null)} onCall={() => onCall(open._id)} />}
    </div>
  );
}

function Tile({ label, value, sub, done }: { label: string; value: number; sub: string; done?: boolean }) {
  return (
    <div className={`panel tile ${done ? "is-done" : ""}`}>
      <span className="muted small">{label}</span>
      <strong>{value}</strong>
      <span className="muted small">{sub}</span>
    </div>
  );
}

function Section({
  title,
  count,
  countLabel,
  note,
  empty,
  action,
  children,
}: {
  title: string;
  count: number;
  countLabel?: string;
  note?: string;
  empty?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const hasItems = Array.isArray(children) ? children.length > 0 : !!children;
  return (
    <section className="today-section">
      <div className="today-section-head">
        <div className="row between wrap gap">
          <h2>
            {title} <span className="count">{count}{countLabel ? ` ${countLabel}` : ""}</span>
          </h2>
          {action}
        </div>
        {note && <p className="muted small">{note}</p>}
      </div>
      {hasItems ? <div className="task-list">{children}</div> : empty ? <p className="muted done-line">{empty}</p> : null}
    </section>
  );
}

function Meta({ p, extra }: { p: P; extra?: ReactNode }) {
  return (
    <p className="muted small">
      {[p.industry, p.town, p.county].filter(Boolean).join(" · ")}
      {p.googleRating && <> · ★ {p.googleRating} ({p.reviews || 0})</>}
      {extra}
    </p>
  );
}

function CopyBlock({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="copy-block">
      <pre>{text}</pre>
      <button
        className="btn btn-small"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            /* clipboard blocked */
          }
        }}
      >
        {copied ? "Copied" : label}
      </button>
    </div>
  );
}

function TaskShell({
  p,
  badge,
  extraMeta,
  actions,
  children,
}: {
  p: P;
  badge?: ReactNode;
  extraMeta?: ReactNode;
  actions: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`task ${open ? "is-open" : ""}`}>
      <div className="task-head">
        <button className="task-title" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <span className="chev" aria-hidden>
            {open ? "▾" : "▸"}
          </span>
          <span>
            <strong>{p.business}</strong> {badge}
            <Meta p={p} extra={extraMeta} />
          </span>
        </button>
        <div className="row gap wrap task-actions">{actions}</div>
      </div>
      {open && <div className="task-body">{children}</div>}
    </div>
  );
}

function SiteLine({ p }: { p: P }) {
  const site = toUrl(p.website);
  const fb = toUrl(p.facebook);
  return (
    <div className="row gap wrap small">
      {site ? (
        <a href={site} target="_blank" rel="noopener">
          Website: {prettyUrl(site)}
        </a>
      ) : (
        <span className="muted">Website: none</span>
      )}
      {fb && (
        <a href={fb} target="_blank" rel="noopener">
          Facebook page
        </a>
      )}
    </div>
  );
}

function Angle({ p }: { p: P }) {
  if (!p.whatToMention.trim()) return null;
  return (
    <div className="angle">
      <span className="angle-label">Your angle</span>
      <p>{p.whatToMention}</p>
    </div>
  );
}


function CallRow({ item, onCall, onDetails, onSkip }: { item: CallItem; onCall: () => void; onDetails: () => void; onSkip: () => void }) {
  const { p, c } = item;
  const next = c.next!;
  const isCallback = next.kind === "call" && next.callback;
  return (
    <div className="task call-row">
      <div className="task-head">
        <button className="task-title" onClick={onDetails}>
          <span>
            <strong>{p.business}</strong>{" "}
            <span className={`badge ${isCallback ? "is-due" : item.fresh ? "" : "fit-strong"}`}>
              {isCallback ? `Callback ${fmtTime(next.due)}` : item.fresh ? "Cold call" : stepLabel(next)}
            </span>
            <Meta p={p} extra={<> · {next.reason}</>} />
          </span>
        </button>
        <div className="row gap wrap task-actions">
          <span className="call-phone">{p.phone}</span>
          <button className="btn btn-small btn-primary" onClick={onCall}>
            Call
          </button>
          <button className="btn btn-small btn-ghost" onClick={onSkip}>
            Skip today
          </button>
        </div>
      </div>
    </div>
  );
}

function WrittenTask({ item, now, onDetails, onSkip }: { item: WriteItem; now: Date; onDetails: () => void; onSkip: () => void }) {
  const { p, c } = item;
  const next = c.next!;
  const key = useKey();
  const log = useMutation(api.prospects.logOutreach);
  const logFollowUp = useMutation(api.prospects.logFollowUp);
  const lib = useLibrary();
  const mails = emails(p.email);
  const fb = toUrl(p.facebook);
  if (next.kind === "call") return null;

  let text = "";
  let subject = "";
  let howTo = "";
  let send: () => Promise<unknown>;
  let primary: ReactNode = null;
  if (next.kind === "email" && next.step === 0) {
    const draft = emailDraft(p, lib, now);
    subject = draft.subject;
    text = `Subject: ${draft.subject}\n\n${draft.body}`;
    howTo = `To: ${mails.join(", ")}`;
    send = () => log({ key, id: p._id, channel: "Email" });
    primary = (
      <a className="btn btn-small" href={gmailComposeUrl(OUTREACH_GMAIL, mails.join(", "), subject, draft.body)} target="dialroom-gmail" rel="noopener">
        Write in Gmail
      </a>
    );
  } else if (next.kind === "email") {
    const step = next.step as EmailStep;
    text = emailFollowUp(p, step, lib, now);
    howTo = "Reply in the original thread so it stacks under your first email. No new subject line.";
    send = () => logFollowUp({ key, id: p._id, channel: "Email", step, sheetStatus: EMAIL_STEP_STATUS[step], followUpDue: "" });
    primary = mails.length ? (
      <a className="btn btn-small" href={gmailThreadUrl(mails)} target="dialroom-gmail" rel="noopener">
        Open thread
      </a>
    ) : null;
  } else if (next.step === 0) {
    text = facebookMessage(p, now, lib);
    howTo = lib.get("facebook.first").note ?? "";
    send = () => log({ key, id: p._id, channel: "Facebook" });
  } else {
    text = facebookFollowUp(p, lib, now);
    howTo = "Send in the same Messenger conversation.";
    send = () => logFollowUp({ key, id: p._id, channel: "Facebook", sheetStatus: "Followed up", followUpDue: "" });
  }
  if (next.kind === "facebook" && fb) {
    primary = (
      <a className="btn btn-small" href={fb} target="_blank" rel="noopener">
        Open Facebook
      </a>
    );
  }
  return (
    <TaskShell
      p={p}
      badge={<span className={`badge ${item.isNew ? `fit-${p.fit.toLowerCase()}` : "fit-strong"}`}>{stepLabel(next)}</span>}
      extraMeta={<> · {next.reason}</>}
      actions={
        <>
          {primary}
          <button className="btn btn-small btn-primary" onClick={() => send()}>
            Sent
          </button>
          <button className="btn btn-small btn-ghost" onClick={onSkip}>
            Skip today
          </button>
        </>
      }
    >
      <SiteLine p={p} />
      {item.isNew && <Angle p={p} />}
      {howTo && <p className="muted small">{howTo}</p>}
      <CopyBlock text={text} />
      <button className="link-btn" onClick={onDetails}>
        Full details
      </button>
    </TaskShell>
  );
}

function RestoreLinks({ pending }: { pending: { id: Id<"prospects">; url: string }[] }) {
  const key = useKey();
  const update = useMutation(api.prospects.update);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  async function run() {
    setBusy(true);
    let n = 0;
    for (const item of pending) {
      await update({ key, id: item.id, patch: { facebook: item.url } });
      n++;
      setDone(n);
    }
    setBusy(false);
  }
  return (
    <div className="panel restore">
      <div>
        <strong>{pending.length} Facebook links need restoring</strong>
        <p className="muted small">
          Your sheets showed "Facebook page" as link text, and the import only copied the text. This puts the real page links back so the Facebook list can fill up.
        </p>
      </div>
      <button className="btn btn-primary" onClick={run} disabled={busy}>
        {busy ? `Restoring ${done} of ${pending.length}…` : "Restore Facebook links"}
      </button>
    </div>
  );
}
