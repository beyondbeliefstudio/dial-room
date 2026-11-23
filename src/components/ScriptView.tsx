import type { Line, Seg } from "../lib/script";

export function Segs({ segs }: { segs: Seg[] }) {
  return (
    <>
      {segs.map((s, i) =>
        s.missing ? (
          <mark key={i} className="seg-missing">
            {s.text}
          </mark>
        ) : s.fill ? (
          <span key={i} className="seg-fill">
            {s.text}
          </span>
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
    </>
  );
}

export default function ScriptView({ lines }: { lines: Line[] }) {
  return (
    <div className="script">
      {lines.map((l, i) => {
        if (l.kind === "cue") return <p key={i} className="script-cue">{l.text}</p>;
        if (l.kind === "branch")
          return (
            <div key={i} className="script-branch">
              <span className="branch-label">{l.label}</span>
              <p>
                <Segs segs={l.segs} />
              </p>
            </div>
          );
        return (
          <p key={i} className="script-say">
            <Segs segs={l.segs} />
          </p>
        );
      })}
    </div>
  );
}
