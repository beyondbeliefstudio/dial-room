import { useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useKey } from "../session";
import { addDays, ymd } from "../lib/dates";
import { byDay, pct, type CallLite } from "../lib/stats";

export default function StatsPage({ calls, goal }: { calls: CallLite[]; goal: number }) {
  const key = useKey();
  const setGoal = useMutation(api.settings.setDailyGoal);
  const [goalDraft, setGoalDraft] = useState(String(goal));

  const days = useMemo(() => byDay(calls), [calls]);
  const recent = useMemo(() => {
    const out = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const d = addDays(today, -i);
      const s = days.get(ymd(d)) ?? { day: ymd(d), dials: 0, connects: 0, conversations: 0, booked: 0 };
      out.push({ ...s, date: d });
    }
    return out;
  }, [days]);

  const totals = useMemo(() => {
    let dials = 0, connects = 0, conversations = 0, booked = 0;
    for (const d of days.values()) {
      dials += d.dials;
      connects += d.connects;
      conversations += d.conversations;
      booked += d.booked;
    }
    return { dials, connects, conversations, booked };
  }, [days]);

  const maxDials = Math.max(goal, ...recent.map((r) => r.dials));

  // Where the funnel leaks: the playbook's rule of thumb
  const diagnosis =
    totals.dials < 30
      ? "Not enough calls yet to read much. Get to 50 dials and this gets useful."
      : totals.conversations / totals.dials < 0.15
        ? "Few owner conversations per dial. Work on the front desk lines, get owner names, and try early mornings and late afternoons."
        : totals.booked / Math.max(1, totals.conversations) < 0.08
          ? "You're reaching owners but not booking. Tighten the first 20 seconds and make the ask earlier, with two real days."
          : "The funnel looks healthy. Keep the volume up.";

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Stats</h1>
          <p className="muted">Last 60 days</p>
        </div>
        <form
          className="row gap end"
          onSubmit={(e) => {
            e.preventDefault();
            const n = Number(goalDraft);
            if (n > 0) void setGoal({ key, dailyGoal: n });
          }}
        >
          <label className="field">
            <span>Daily dial goal</span>
            <input type="number" min={1} max={200} value={goalDraft} onChange={(e) => setGoalDraft(e.target.value)} style={{ width: 100 }} />
          </label>
          <button className="btn">Save</button>
        </form>
      </div>

      <div className="funnel">
        <Stat label="Dials" value={totals.dials} sub="last 60 days" />
        <Stat label="Picked up" value={totals.connects} sub={pct(totals.connects, totals.dials)} />
        <Stat label="Owner conversations" value={totals.conversations} sub={pct(totals.conversations, totals.dials)} />
        <Stat label="Meetings booked" value={totals.booked} sub={`${pct(totals.booked, totals.conversations)} of convos`} lime />
      </div>
      <p className="diagnosis">{diagnosis}</p>

      <h2 className="section-title">Last 14 days</h2>
      <div className="panel">
        <table className="table compact">
          <thead>
            <tr>
              <th>Day</th>
              <th>Dials</th>
              <th />
              <th>Picked up</th>
              <th>Convos</th>
              <th>Booked</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((r) => (
              <tr key={r.day}>
                <td className="nowrap">{r.date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</td>
                <td>{r.dials}</td>
                <td className="bar-cell">
                  <div className="bar" style={{ width: `${(r.dials / maxDials) * 100}%` }} data-hit={r.dials >= goal} />
                  <div className="bar-goal" style={{ left: `${(goal / maxDials) * 100}%` }} />
                </td>
                <td>{r.connects}</td>
                <td>{r.conversations}</td>
                <td className={r.booked ? "lime strong" : ""}>{r.booked}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, lime }: { label: string; value: number; sub?: string; lime?: boolean }) {
  return (
    <div className="panel stat">
      <span className="muted small">{label}</span>
      <strong className={lime ? "lime" : ""}>{value}</strong>
      {sub && <span className="muted small">{sub}</span>}
    </div>
  );
}
