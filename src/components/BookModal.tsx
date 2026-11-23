import { useMemo, useState } from "react";
import type { Doc } from "../../convex/_generated/dataModel";
import Modal from "./Modal";
import { at, fmtDateTime, googleCalendarUrl, isTomorrow, nextBusinessDays, startOfDay } from "../lib/dates";
import { inviteText } from "../lib/script";
import { useLibrary } from "../library";

export type MeetingDraft = {
  startsAt: number;
  durationMin: number;
  format: "video" | "in_person" | "phone";
  email: string;
  inviteSent: boolean;
  accepted: boolean;
};

const TIMES = Array.from({ length: 21 }, (_, i) => 8 * 60 + i * 30); // 8:00 AM to 6:00 PM

function timeLabel(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const d = new Date(2000, 0, 1, h, m);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default function BookModal({
  prospect,
  onConfirm,
  onClose,
}: {
  prospect: Doc<"prospects">;
  onConfirm: (m: MeetingDraft) => void;
  onClose: () => void;
}) {
  const days = useMemo(() => {
    const now = new Date();
    const list = nextBusinessDays(now, 5);
    if (now.getHours() < 15 && now.getDay() !== 0 && now.getDay() !== 6) list.unshift(startOfDay(now));
    return list;
  }, []);
  const [day, setDay] = useState(() => days.find((d) => isTomorrow(d)) ?? days[0]);
  const [mins, setMins] = useState(14 * 60);
  const [durationMin, setDuration] = useState(15);
  const [format, setFormat] = useState<MeetingDraft["format"]>("video");
  const [email, setEmail] = useState(() => prospect.email.split(/[,;\s]+/).filter(Boolean)[0] ?? "");
  const [inviteSent, setInviteSent] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [copied, setCopied] = useState(false);

  const startsAt = at(day, Math.floor(mins / 60), mins % 60);
  const lib = useLibrary();
  const invite = inviteText(prospect, lib);
  const location =
    format === "video"
      ? "Google Meet (add a Meet link)"
      : format === "phone"
        ? `Chris calls ${prospect.phone}`
        : `${prospect.business}, ${prospect.town}`;

  function openCalendar() {
    const url = googleCalendarUrl({ title: invite.title, startsAt, durationMin, details: invite.details, location, guest: email });
    window.open(url, "_blank", "noopener");
    setInviteSent(true);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${invite.title}\n\n${invite.details}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Modal title={`Book ${prospect.business}`} onClose={onClose} wide>
      <p className="muted small">Confirm the email out loud, send the invite while you're still on the phone, and ask them to accept it before you hang up.</p>
      <div className="field">
        <span>Day</span>
        <div className="seg-row">
          {days.map((d) => (
            <button
              key={d.toISOString()}
              className={`seg-btn ${d.getTime() === day.getTime() ? "is-on" : ""}`}
              onClick={() => setDay(d)}
            >
              {d.toDateString() === new Date().toDateString()
                ? "Today"
                : isTomorrow(d)
                  ? "Tomorrow"
                  : d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </button>
          ))}
        </div>
      </div>
      <div className="grid-3">
        <label className="field">
          <span>Time</span>
          <select value={mins} onChange={(e) => setMins(Number(e.target.value))}>
            {TIMES.map((t) => (
              <option key={t} value={t}>
                {timeLabel(t)}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Length</span>
          <select value={durationMin} onChange={(e) => setDuration(Number(e.target.value))}>
            <option value={15}>15 min</option>
            <option value={20}>20 min</option>
            <option value={30}>30 min</option>
          </select>
        </label>
        <label className="field">
          <span>Where</span>
          <select value={format} onChange={(e) => setFormat(e.target.value as MeetingDraft["format"])}>
            <option value="video">Google Meet</option>
            <option value="in_person">In person</option>
            <option value="phone">Phone</option>
          </select>
        </label>
      </div>
      <label className="field">
        <span>Their email (spell it back to them)</span>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="owner@business.com" />
      </label>
      <div className="invite-preview">
        <div className="invite-head">
          <strong>{invite.title}</strong>
          <span className="muted small">{fmtDateTime(startsAt)} · {durationMin} min</span>
        </div>
        <pre>{invite.details}</pre>
      </div>
      <div className="row gap wrap">
        <button className="btn" onClick={openCalendar} disabled={!email.trim()}>
          Open Google Calendar invite
        </button>
        <button className="btn btn-ghost" onClick={copy}>
          {copied ? "Copied" : "Copy invite text"}
        </button>
      </div>
      <div className="row gap wrap checks">
        <label className="check">
          <input type="checkbox" checked={inviteSent} onChange={(e) => setInviteSent(e.target.checked)} /> Invite sent
        </label>
        <label className="check">
          <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} /> They accepted it
        </label>
      </div>
      <div className="row gap end">
        <button className="btn btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button
          className="btn btn-primary btn-big"
          onClick={() => onConfirm({ startsAt, durationMin, format, email: email.trim(), inviteSent, accepted })}
        >
          Lock it in
        </button>
      </div>
    </Modal>
  );
}
