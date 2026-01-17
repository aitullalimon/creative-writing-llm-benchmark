"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { colorForModel, makePageSeed } from "@/lib/leaderboardStore";

type Bar = {
  label: string;       // model name
  value: number;       // value (0..max)
  valueLabel: string;  // tooltip value string
};

type TipState =
  | { open: false }
  | { open: true; x: number; y: number; title: string; subtitle: string };

export function LeaderboardChartCard(props: {
  title: string;
  subtitle: string;
  bars: Bar[];
  maxValue?: number;
  yLabel?: string;
}) {
  const { title, subtitle, bars } = props;
  const maxValue = props.maxValue ?? Math.max(1, ...bars.map((b) => b.value));

  const [animateKey, setAnimateKey] = useState(0);
  const seed = useMemo(() => makePageSeed(), []);
  const delays = useMemo(() => bars.map((_, i) => seed * 0.15 + i * 0.08), [bars, seed]);

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [tip, setTip] = useState<TipState>({ open: false });

  useEffect(() => {
    setAnimateKey((k) => k + 1);
  }, []);

  function openTip(e: React.MouseEvent, b: Bar) {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const rect = wrap.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setTip({
      open: true,
      x,
      y,
      title: b.valueLabel,
      subtitle: b.label,
    });
  }

  function moveTip(e: React.MouseEvent) {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const rect = wrap.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setTip((prev) => (prev.open ? { ...prev, x, y } : prev));
  }

  function closeTip() {
    setTip({ open: false });
  }

  return (
    <div className="card" style={{ padding: 18 }}>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>{title}</div>
        <div className="muted" style={{ fontSize: 12 }}>{props.yLabel || ""}</div>
      </div>

      <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>{subtitle}</div>

      {/* CHART WRAPPER */}
      <div
        ref={wrapRef}
        className="chartBox"
        onMouseLeave={closeTip}
        style={{ marginTop: 14 }}
      >
        {/* Tooltip floats on top of chartBox (NOT clipped) */}
        {tip.open && (
          <div
            className="chartTip"
            style={{
              left: tip.x,
              top: tip.y,
            }}
          >
            <div style={{ fontWeight: 800 }}>{tip.title}</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{tip.subtitle}</div>
          </div>
        )}

        {/* Bars row stays inside box */}
        <div className="chartBars">
          {bars.map((b, i) => {
            const pct = Math.max(0, Math.min(1, b.value / maxValue));
            const col = colorForModel(b.label);

            return (
              <div className="chartCol" key={`${animateKey}-${b.label}`}>
                <div
                  className="barWrap"
                  onMouseEnter={(e) => openTip(e, b)}
                  onMouseMove={moveTip}
                >
                  <div
                    className="bar"
                    style={{
                      ["--bar-h" as any]: `${pct * 100}%`,
                      ["--bar-c" as any]: col,
                      animationDelay: `${delays[i]}s`,
                      animationDuration: "1.3s", // slower
                    }}
                  />
                </div>

                {/* label BELOW the bar (no rotation -> no overflow) */}
                <div className="barLabel" title={b.label}>
                  {b.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend pills */}
      <div className="row" style={{ marginTop: 14, flexWrap: "wrap" }}>
        {bars.map((b) => (
          <span
            key={`pill-${b.label}`}
            className="badge"
            style={{
              borderColor: colorForModel(b.label),
              boxShadow: `0 0 0 1px ${colorForModel(b.label)} inset`,
            }}
          >
            {b.label}
          </span>
        ))}
      </div>
    </div>
  );
}
