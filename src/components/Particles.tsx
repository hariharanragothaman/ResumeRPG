import { useMemo } from "react";

export function Particles({
  classColor,
  shape = "circle",
  count = 20,
}: {
  classColor: string;
  shape?: "circle" | "square" | "star" | "none";
  count?: number;
}) {
  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 1 + Math.random() * 3,
        dur: 3 + Math.random() * 6,
        delay: Math.random() * 5,
      })),
    [count],
  );

  if (shape === "none") return null;

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 2 }}>
      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            left: p.x + "%",
            bottom: p.y + "%",
            width: p.size,
            height: p.size,
            background: classColor,
            borderRadius: shape === "square" ? 0 : shape === "star" ? 0 : "50%",
            opacity: 0,
            animation: `particle-rise ${p.dur}s ease-in-out ${p.delay}s infinite`,
            boxShadow: `0 0 ${p.size * 2}px ${classColor}88`,
            clipPath:
              shape === "star"
                ? "polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)"
                : undefined,
          }}
        />
      ))}
    </div>
  );
}
