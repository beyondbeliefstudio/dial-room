import { useMemo, useState } from "react";
import Modal from "./Modal";
import { addDays, at, fmtDateTime, fromLocalInput, nextBusinessDays, toLocalInput } from "../lib/dates";

type Choice = { label: string; ms: number };

export default function CallbackModal({
  title,
  hint,
  long,
  onPick,
  onClose,
}: {
  title: string;
  hint: string;
  long?: boolean; // "not right now" gets later defaults
  onPick: (ms: number) => void;
  onClose: () => void;
}) {
  const choices = useMemo<Choice[]>(() => {
    const now = new Date();
    const [b1, b2] = nextBusinessDays(now, 2);
    const weekOut = nextBusinessDays(addDays(now, 6), 1)[0];
    const list: Choice[] = [];
    if (long) {
      list.push(
        { label: "In 2 weeks", ms: at(nextBusinessDays(addDays(now, 13), 1)[0], 8, 30) },
        { label: "In 1 month", ms: at(nextBusinessDays(addDays(now, 29), 1)[0], 8, 30) },
        { label: "In 2 months", ms: at(nextBusinessDays(addDays(now, 59), 1)[0], 8, 30) },
        { label: "In 3 months", ms: at(nextBusinessDays(addDays(now, 89), 1)[0], 8, 30) },
      );
      return list;
    }
    list.push({ label: "In 2 hours", ms: now.getTime() + 2 * 3600000 });
    if (now.getHours() < 15) list.push({ label: "Today 4:30 PM", ms: at(now, 16, 30) });
    list.push(
      { label: `${b1.toLocaleDateString("en-US", { weekday: "short" })} 8:00 AM`, ms: at(b1, 8) },
      { label: `${b1.toLocaleDateString("en-US", { weekday: "short" })} 4:30 PM`, ms: at(b1, 16, 30) },
      { label: `${b2.toLocaleDateString("en-US", { weekday: "short" })} 8:00 AM`, ms: at(b2, 8) },
      { label: "In 1 week", ms: at(weekOut, 8, 30) },
    );
    return list;
  }, [long]);

  const [custom, setCustom] = useState(() => toLocalInput(choices[0].ms));

  return (
    <Modal title={title} onClose={onClose}>
      <p className="muted small">{hint}</p>
      <div className="chip-grid">
        {choices.map((c) => (
          <button key={c.label} className="chip-btn" onClick={() => onPick(c.ms)}>
            <strong>{c.label}</strong>
            <span>{fmtDateTime(c.ms)}</span>
          </button>
        ))}
      </div>
      <div className="row gap end">
        <label className="field grow">
          <span>Pick a time</span>
          <input type="datetime-local" value={custom} onChange={(e) => setCustom(e.target.value)} />
        </label>
        <button className="btn btn-primary" onClick={() => custom && onPick(fromLocalInput(custom))}>
          Set callback
        </button>
      </div>
    </Modal>
  );
}
