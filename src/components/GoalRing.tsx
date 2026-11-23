export default function GoalRing({ value, goal }: { value: number; goal: number }) {
  const r = 17;
  const c = 2 * Math.PI * r;
  const done = Math.min(1, goal ? value / goal : 0);
  const hit = value >= goal;
  return (
    <div className={`goal ${hit ? "is-hit" : ""}`} title={`${value} of ${goal} dials today`}>
      <svg viewBox="0 0 44 44" width="44" height="44" aria-hidden>
        <circle cx="22" cy="22" r={r} className="goal-track" />
        <circle
          cx="22"
          cy="22"
          r={r}
          className="goal-fill"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - done)}
          transform="rotate(-90 22 22)"
        />
      </svg>
      <div className="goal-text">
        <strong>{value}</strong>
        <span>/{goal} dials</span>
      </div>
    </div>
  );
}
