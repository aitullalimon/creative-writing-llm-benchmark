"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { colorForModel } from "@/lib/leaderboardStore";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

type Run = {
  ts: number;
  judgeModel?: string;
  results: { model: string; scores?: { total?: number | string } }[];
};

function themeFromTotal(total?: number | string) {
  const n = typeof total === "string" ? Number(total) : total;
  if (typeof n !== "number" || !Number.isFinite(n)) return 0;
  return n / 4; // 0–10
}

export default function ThemeCoherenceLineChart({ runs }: { runs: Run[] }) {
  // Collect unique judges across ALL runs (newest-first storage is fine)
  const judges = Array.from(new Set(runs.map((r) => r.judgeModel).filter(Boolean))) as string[];

  // last N runs (oldest -> newest) for plotting
  const lastN = runs.slice(0, 8).reverse();
  const labels = lastN.map((_, i) => `Run ${i + 1}`);

  const modelSet = new Set<string>();
  lastN.forEach((r) => r.results.forEach((x) => modelSet.add(x.model)));
  const models = Array.from(modelSet);

  const datasets = models.map((model) => {
    const col = colorForModel(model);
    const data = lastN.map((r) => {
      const found = r.results.find((x) => x.model === model);
      return themeFromTotal(found?.scores?.total);
    });

    return {
      label: model,
      data,
      borderColor: col,
      backgroundColor: col,
      pointBackgroundColor: col,
      pointBorderColor: col,
      borderWidth: 2,
      pointRadius: 5,
      pointHoverRadius: 7,
      tension: 0.25,
      fill: false,
    };
  });

  const data = { labels, datasets };

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom" },
      tooltip: { enabled: true },
    },
    scales: {
      y: {
        min: 0,
        max: 10,
        ticks: {
          stepSize: 1, // 🔒 integers only
        },
        title: { display: true, text: "Theme Coherence (0–10)" },
      },
      x: {
        title: { display: true, text: "Runs" },
      },
    },
  };

  return (
    <div className="card" style={{ marginTop: 18, padding: 18 }}>
      <div style={{ fontWeight: 800, fontSize: 18 }}>Theme Coherence over Runs</div>

      <div className="row" style={{ marginTop: 8, gap: 8, flexWrap: "wrap" }}>
        {judges.length > 0
          ? judges.map((j) => (
              <span key={j} className="badge">
                Judge: {j}
              </span>
            ))
          : null}
        <span className="badge">Metric: Theme Coherence</span>
        <span className="badge">Scale: 0–10</span>
      </div>

      <div className="muted" style={{ marginTop: 8 }}>
        Line chart comparison of theme coherence scores across recent runs (LLM-as-a-judge).
      </div>

      <div style={{ marginTop: 14, height: 360 }}>
        <Line data={data} options={options} />
      </div>
    </div>
  );
}
