const STARS = Array.from({ length: 40 }, (_, i) => ({
  id: i,
  left: `${Math.random() * 100}%`,
  top: `${Math.random() * 100}%`,
  size: Math.random() > 0.8 ? 2 : 1,
  opacity: 0.1 + Math.random() * 0.25,
  duration: 2 + Math.random() * 4,
  delay: Math.random() * 3,
}));

export function Starfield() {
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
      {STARS.map((s) => (
        <div
          key={s.id}
          style={{
            position: "absolute",
            left: s.left,
            top: s.top,
            width: s.size,
            height: s.size,
            background: "#fff",
            borderRadius: "50%",
            opacity: s.opacity,
            animation: `twinkle ${s.duration}s ease-in-out infinite`,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
