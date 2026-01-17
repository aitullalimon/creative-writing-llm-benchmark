"use client";

import { useEffect, useMemo, useState } from "react";
import { LeaderboardChartCard } from "@/components/LeaderboardChartCard";
import ThemeCoherenceLineChart from "@/components/ThemeCoherenceLineChart";
import { computeModelStats, loadRuns } from "@/lib/leaderboardStore";

type ConfigModel = {
  model: string;
  context?: string;
  inputCost?: number;
  outputCost?: number;
  speed?: number;
  latency?: number;
};

// 🔹 Helper: map Avg Total (0–40) → Theme Coherence (0–10)
function toThemeCoherence(avgTotal?: number) {
  if (typeof avgTotal !== "number" || avgTotal <= 0) return "—";
  return (avgTotal / 4).toFixed(1);
}

export default function LeaderboardPage() {
  const [runsCount, setRunsCount] = useState(0);
  const [stats, setStats] = useState<
    { model: string; avgTotal: number; wins: number; avgLatencyS: number; runs: number }[]
  >([]);
  const [configModels, setConfigModels] = useState<ConfigModel[]>([]);
  const [q, setQ] = useState("");
  const [maxInputCost, setMaxInputCost] = useState<number | "">("");
  const [minContext, setMinContext] = useState("");

  // ✅ NEW: store runs for line chart
  const [runs, setRuns] = useState<any[]>([]);

  useEffect(() => {
    const loaded = loadRuns();
    setRuns(loaded);
    setRunsCount(loaded.length);
    setStats(computeModelStats(loaded));

    (async () => {
      try {
        const res = await fetch("/api/config-models");
        const data = await res.json();
        setConfigModels(Array.isArray(data?.models) ? data.models : []);
      } catch {
        setConfigModels([]);
      }
    })();
  }, []);

  const modelsSeen = useMemo(() => stats.length, [stats]);
  const configCount = useMemo(() => configModels.length, [configModels]);

  const byModel = useMemo(() => {
    const map: Record<string, ConfigModel> = {};
    for (const m of configModels) map[m.model] = m;
    return map;
  }, [configModels]);

  const fastestBars = useMemo(() => {
    const rows = (configModels.length ? configModels : stats.map((s) => ({ model: s.model } as ConfigModel)))
      .map((m) => {
        const cfg = byModel[m.model];
        const sp = cfg?.speed;
        const fallback = (() => {
          const s = stats.find((x) => x.model === m.model);
          if (!s?.avgLatencyS) return 0;
          return 1 / s.avgLatencyS;
        })();
        const value = typeof sp === "number" ? sp : fallback;
        const label = typeof sp === "number" ? `${sp} t/s` : `${value.toFixed(2)} (inv.lat)`;
        return { label: m.model, value, valueLabel: label };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const maxV = Math.max(1, ...rows.map((r) => r.value));
    return { rows, maxV };
  }, [configModels, stats, byModel]);

  const latencyBars = useMemo(() => {
    const rows = (configModels.length ? configModels : stats.map((s) => ({ model: s.model } as ConfigModel)))
      .map((m) => {
        const cfg = byModel[m.model];
        const lat =
          typeof cfg?.latency === "number"
            ? cfg.latency
            : stats.find((s) => s.model === m.model)?.avgLatencyS ?? 0;
        const score = lat > 0 ? 1 / lat : 0;
        return { label: m.model, value: score, valueLabel: lat > 0 ? `${lat.toFixed(2)}s` : "—" };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const maxV = Math.max(1, ...rows.map((r) => r.value));
    return { rows, maxV };
  }, [configModels, stats, byModel]);

  const cheapBars = useMemo(() => {
    const rows = configModels
      .map((m) => {
        const inC = typeof m.inputCost === "number" ? m.inputCost : NaN;
        const score = Number.isFinite(inC) && inC > 0 ? 1 / inC : 0;
        return { label: m.model, value: score, valueLabel: Number.isFinite(inC) ? `$${inC}/1M input` : "—" };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const maxV = Math.max(1, ...rows.map((r) => r.value));
    return { rows, maxV };
  }, [configModels]);

  const comparisonRows = useMemo(() => {
    const set = new Set<string>();
    for (const s of stats) set.add(s.model);
    for (const c of configModels) set.add(c.model);

    return Array.from(set).map((model) => {
      const s = stats.find((x) => x.model === model);
      const c = byModel[model];
      return {
        model,
        context: c?.context ?? "—",
        inputCost: c?.inputCost,
        outputCost: c?.outputCost,
        avgTotal: s ? s.avgTotal : 0,
        wins: s ? s.wins : 0,
        avgLatencyS: s ? s.avgLatencyS : 0,
      };
    });
  }, [stats, configModels, byModel]);

  const filtered = useMemo(() => {
    const norm = q.trim().toLowerCase();
    return comparisonRows.filter((r) => {
      if (norm && !r.model.toLowerCase().includes(norm)) return false;
      if (maxInputCost !== "" && typeof r.inputCost === "number" && r.inputCost > maxInputCost) return false;
      if (minContext && !(r.context || "").toLowerCase().includes(minContext.toLowerCase())) return false;
      return true;
    });
  }, [comparisonRows, q, maxInputCost, minContext]);

  return (
    <div className="container">
      {/* Header */}
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 900 }}>LLM Leaderboard</div>
          <div className="muted" style={{ maxWidth: 900, marginTop: 6 }}>
            Data is computed from your saved benchmark runs in localStorage. Pricing &amp; context are pulled live from{" "}
            <code>litellm-config.yaml</code>.
          </div>

          <div className="row" style={{ marginTop: 12, flexWrap: "wrap" }}>
            <span className="badge">Runs saved: {runsCount}</span>
            <span className="badge">Models seen: {modelsSeen}</span>
            <span className="badge">Config models: {configCount}</span>
          </div>
        </div>

        <a className="badge" href="/">
          ← Back to Benchmark
        </a>
      </div>

      {/* Charts */}
      <div className="card" style={{ marginTop: 18 }}>
        <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 14 }}>Top models per tasks</div>

        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))" }}>
          <LeaderboardChartCard
            title="Fastest Models"
            subtitle="Demo metric: config speed or inverse latency."
            yLabel="Tokens/second"
            bars={fastestBars.rows}
            maxValue={fastestBars.maxV}
          />

          <LeaderboardChartCard
            title="Lowest Latency (TTFT)"
            subtitle="Lower latency ranks higher (inverse latency)."
            yLabel="Seconds (hover)"
            bars={latencyBars.rows}
            maxValue={latencyBars.maxV}
          />

          <LeaderboardChartCard
            title="Cheapest Models"
            subtitle="Lower input cost ranks higher."
            yLabel="$ / 1M (hover)"
            bars={cheapBars.rows}
            maxValue={cheapBars.maxV}
          />
        </div>
      </div>

      {/* ✅ NEW: Theme Coherence visualization (like your image) */}
      <ThemeCoherenceLineChart runs={runs} judgeModel={runs[0]?.judgeModel} />



      {/* Comparison Table */}
      <div className="card" style={{ marginTop: 18 }}>
        <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 10 }}>Model comparison</div>

        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Model</th>
                <th>Context</th>
                <th>Input $ / 1M</th>
                <th>Output $ / 1M</th>
                <th>Theme Coherence (0–10)</th>
                <th>Avg Total (0–40)</th>
                <th>Wins</th>
                <th>Avg Latency (s)</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.model}>
                  <td><span className="badge">{r.model}</span></td>
                  <td>{r.context}</td>
                  <td>{typeof r.inputCost === "number" ? `$${r.inputCost}` : "—"}</td>
                  <td>{typeof r.outputCost === "number" ? `$${r.outputCost}` : "—"}</td>
                  <td>{toThemeCoherence(r.avgTotal)}</td>
                  <td>{r.avgTotal ? r.avgTotal.toFixed(1) : "—"}</td>
                  <td>{r.wins}</td>
                  <td>{r.avgLatencyS ? r.avgLatencyS.toFixed(2) : "—"}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="muted">No results</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
          Theme Coherence is derived from Avg Total ÷ 4. Scores are computed using an LLM-as-a-judge on creative writing tasks.
        </div>
      </div>
    </div>
  );
}
