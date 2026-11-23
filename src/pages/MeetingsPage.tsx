import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import { useKey } from "../session";
import { fmtDateTime, fmtTime, fromLocalInput, googleCalendarUrl, isTomorrow, relative, toLocalInput } from "../lib/dates";
import { inviteText, prepCallLines } from "../lib/script";
import { useLibrary } from "../library";
import { MEETING_STATUS_LABEL } from "../lib/labels";
import ScriptView from "../components/ScriptView";
import { googleVoiceUrl } from "../lib/links";

type MeetingRow = Doc<"meetings"> & { prospect: Doc<"prospects"> | null };

export default function MeetingsPage() {
  const key = useKey();
  const meetings = useQuery(api.meetings.list, { key });
  const now = Date.now();

  const { upcoming, past, showRate } = useMemo(() => {
    const list = (meetings ?? []) as MeetingRow[];
    const upcoming = list
      .filter((m) => m.status === "scheduled" && m.startsAt > now - 2 * 3600000)
      .sort((a, b) => a.startsAt - b.startsAt);
    const past = list.filter((m) => !upcoming.includes(m));
    const showed = list.filter((m) => m.status === "held" || m.status === "won").length;
    const noShow = list.filter((m) => m.status === "no_show").length;
    return { upcoming, past, showRate: showed + noShow ? `${Math.round((showed / (showed + noShow)) * 100)}%` : "-" };
  }, [meetings, now]);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Meetings</h1>
          <p className="muted">
            Show rate so far: <strong>{showRate}</strong>
          </p>
        </div>
      </div>
      {meetings === undefined ? (
        <p className="muted">Loading…</p>
      ) : (
        <>
          <h2 className="section-title">Coming up</h2>
          {upcoming.length === 0 && <p className="muted">Nothing booked yet. Go get one.</p>}
          <div className="meeting-list">
            {upcoming.map((m) => (
              <MeetingCard key={m._id} m={m} />
            ))}
          </div>
          {past.length > 0 && (
            <>
              <h2 className="section-title">Past</h2>
              <div className="meeting-list">
                {past.map((m) => (
                  <MeetingCard key={m._id} m={m} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function MeetingCard({ m }: { m: MeetingRow }) {
  const key = useKey();
  const update = useMutation(api.meetings.update);
  const lib = useLibrary();
  const [showPrep, setShowPrep] = useState(false);
  const [moving, setMoving] = useState(false);
  const [when, setWhen] = useState(toLocalInput(m.startsAt));
  const p = m.prospect;
  const set = (patch: Parameters<typeof update>[0]["patch"]) => update({ key, id: m._id, patch });

  const soon = m.startsAt - Date.now() < 36 * 3600000;
  const needsPrep = m.status === "scheduled" && !m.accepted && !m.prepCallDone && soon && m.startsAt > Date.now();
  const whenWords = isTomorrow(new Date(m.startsAt))
    ? "tomorrow"
    : new Date(m.startsAt).toDateString() === new Date().toDateString()
      ? `this ${new Date(m.startsAt).getHours() < 12 ? "morning" : "afternoon"}`
      : new Date(m.startsAt).toLocaleDateString("en-US", { weekday: "long" });

  function reopenInvite() {
    if (!p) return;
    const invite = inviteText(p, lib);
    window.open(
      googleCalendarUrl({
        title: invite.title,
        startsAt: m.startsAt,
        durationMin: m.durationMin,
        details: invite.details,
        location: m.format === "video" ? "Google Meet (add a Meet link)" : m.format === "phone" ? `Chris calls ${p.phone}` : `${p.business}, ${p.town}`,
        guest: m.email,
      }),
      "_blank",
      "noopener",
    );
  }

  return (
    <article className={`panel meeting ${needsPrep ? "needs-prep" : ""}`}>
      <div className="meeting-main">
        <div>
          <p className="eyebrow">
            {fmtDateTime(m.startsAt)} · {relative(m.startsAt)}
          </p>
          <h3>{p?.business ?? "Deleted prospect"}</h3>
          <p className="muted small">
            {m.durationMin} min · {m.format === "video" ? "Google Meet" : m.format === "in_person" ? "In person" : "Phone"} · {m.email || "no email"}
            {p?.ownerName && ` · ${p.ownerName}`}
          </p>
        </div>
        <span className={`badge status-${m.status}`}>{MEETING_STATUS_LABEL[m.status]}</span>
      </div>

      {m.status === "scheduled" && (
        <div className="row gap wrap checks">
          <label className="check">
            <input type="checkbox" checked={m.inviteSent} onChange={(e) => set({ inviteSent: e.target.checked })} /> Invite sent
          </label>
          <label className="check">
            <input type="checkbox" checked={m.accepted} onChange={(e) => set({ accepted: e.target.checked })} /> Accepted
          </label>
          {p && (
            <button className="link-btn" onClick={reopenInvite}>
              Open invite in Google Calendar
            </button>
          )}
        </div>
      )}

      {needsPrep && p && (
        <div className="prep">
          <div className="row gap between">
            <strong>Not accepted yet. Make the prep call {whenWords === "tomorrow" ? "today" : "before it"}.</strong>
            <button className="link-btn" onClick={() => setShowPrep((s) => !s)}>
              {showPrep ? "Hide script" : "Show script"}
            </button>
          </div>
          {showPrep && (
            <>
              <ScriptView lines={prepCallLines(p, whenWords === "tomorrow" ? "tomorrow" : `${whenWords} at ${fmtTime(m.startsAt)}`, lib)} />
              <div className="row gap">
                <a className="btn btn-primary btn-small" href={googleVoiceUrl(p.phone)} target="dialroom-voice" rel="noopener">
                  Call {p.phone}
                </a>
                <button className="btn btn-small" onClick={() => set({ prepCallDone: true })}>
                  Prep call done
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {m.status === "scheduled" ? (
        <div className="row gap wrap">
          <button className="btn btn-small" onClick={() => set({ status: "held" })}>
            Showed up
          </button>
          <button className="btn btn-small btn-primary" onClick={() => set({ status: "won" })}>
            Signed!
          </button>
          <button className="btn btn-small btn-ghost" onClick={() => set({ status: "no_show" })}>
            No-show
          </button>
          <button className="btn btn-small btn-ghost" onClick={() => setMoving((v) => !v)}>
            Reschedule
          </button>
          <button className="btn btn-small btn-ghost" onClick={() => set({ status: "canceled" })}>
            Canceled
          </button>
        </div>
      ) : (
        <div className="row gap wrap">
          {m.status === "held" && (
            <button className="btn btn-small btn-primary" onClick={() => set({ status: "won" })}>
              They signed
            </button>
          )}
          <button className="btn btn-small btn-ghost" onClick={() => set({ status: "scheduled" })}>
            Reopen
          </button>
        </div>
      )}

      {moving && (
        <div className="row gap end">
          <label className="field grow">
            <span>New time</span>
            <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
          </label>
          <button
            className="btn btn-primary"
            onClick={async () => {
              await set({ startsAt: fromLocalInput(when), status: "scheduled", accepted: false, prepCallDone: false });
              setMoving(false);
            }}
          >
            Move it
          </button>
        </div>
      )}
    </article>
  );
}
