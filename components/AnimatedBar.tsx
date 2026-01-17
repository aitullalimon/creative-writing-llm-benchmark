"use client";

import { useEffect, useState } from "react";

type Props = {
  value: number;      // 0..100
  color: string;      // bar color
  delay?: number;     // ms
  durationMs?: number; // ms (slower/faster)
};

export default function AnimatedBar({
  value,
  color,
  delay = 0,
  durationMs = 1100,
}: Props) {
  const [w, setW] = useState(0);

  useEffect(() => {
    setW(0);
    const t = setTimeout(() => setW(Math.max(0, Math.min(100, value))), delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  return (
    <div
      style={{
        height: 10,
        borderRadius: 999,
        background: "rgba(255,255,255,0.08)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${w}%`,
          background: color,
          transition: `width ${durationMs}ms cubic-bezier(0.16, 1, 0.3, 1)`,
        }}
      />
    </div>
  );
}
