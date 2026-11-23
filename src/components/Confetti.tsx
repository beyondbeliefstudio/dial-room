import { useMemo } from "react";

// A short CSS-only burst for booked meetings and goal hits. Respects reduced motion via CSS.
export default function Confetti({ burst }: { burst: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 70 }, (_, i) => ({
        id: `${burst}-${i}`,
        left: Math.random() * 100,
        delay: Math.random() * 0.35,
        dur: 1.6 + Math.random() * 1.2,
        rot: Math.random() * 720 - 360,
        drift: Math.random() * 160 - 80,
        color: ["#c8ff3a", "#f4f1e8", "#7cf2c4", "#ffd166"][i % 4],
        w: 6 + Math.random() * 6,
      })),
    [burst],
  );
  if (!burst) return null;
  return (
    <div className="confetti" aria-hidden key={burst}>
      {pieces.map((p) => (
        <span
          key={p.id}
          style={
            {
              left: `${p.left}%`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.dur}s`,
              background: p.color,
              width: p.w,
              height: p.w * 0.45,
              "--rot": `${p.rot}deg`,
              "--drift": `${p.drift}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
