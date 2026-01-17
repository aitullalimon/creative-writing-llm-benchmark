"use client";

import { useEffect, useMemo, useState } from "react";

type Scores = {
  character_clarity: number;
  originality: number;
  sensory_detail: number;
  tone_consistency: number;
  total: number; // 0..40
};

type BenchResult = {
  model: string;
  output: string;
  latency_ms: number;
  scores: Scores;
};

type SavedRun = {
  ts: number;
  prompt: string;
  judgeModel: string;
  models: string[];
  results: BenchResult[];
};

type ConfigModel = {
  model: string;
  context?: string;
  inputCost?: number;
  outputCost?: number;
  speed?: number;
  latency?: number;
};

const LS_KEY = "cw_benchmark_runs";

function readRuns(): SavedRun[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveRun(run: SavedRun) {
  const runs = readRuns();
  runs.unshift(run);
  localStorage.setItem(LS_KEY, JSON.stringify(runs));
  return runs.length;
}

export default function BenchmarkHomePage() {
  const [prompt, setPrompt] = useState(
    "Write a vivid character description for a detective who secretly fears the ocean."
  );

  const [configModels, setConfigModels] = useState<ConfigModel[]>([]);
  const modelOptions = useMemo(() => configModels.map((m) => m.model), [configModels]);

  const [judgeModel, setJudgeModel] = useState<string>("");
  const [selectedModels, setSelectedModels] = useState<string[]>([]);

  const [runsCount, setRunsCount] = useState<number>(0);
  const [lastResults, setLastResults] = useState<BenchResult[] | null>(null);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // 🔹 NEW: track expanded output per model
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // load run count + last run preview
  useEffect(() => {
    const runs = readRuns();
    setRunsCount(runs.length);
    if (runs.length > 0) setLastResults(runs[0].results || null);
  }, []);

  // load config models
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/config-models", { cache: "no-store" });
        const data = await res.json();
        const models: ConfigModel[] = Array.isArray(data?.models) ? data.models : [];
        setConfigModels(models);

        if (!judgeModel && models.length) setJudgeModel(models[0].model);
        if (selectedModels.length === 0 && models.length) {
          setSelectedModels(models.slice(0, Math.min(3, models.length)).map((m) => m.model));
        }
      } catch {
        setConfigModels([]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleModel(model: string) {
    setSelectedModels((prev) =>
      prev.includes(model) ? prev.filter((m) => m !== model) : [...prev, model]
    );
  }

  async function runBenchmark() {
    setErr("");
    setLoading(true);
    setLastResults(null);
    setExpanded({}); // reset expanded states

    try {
      if (!prompt.trim()) throw new Error("Prompt is empty.");
      if (!judgeModel.trim()) throw new Error("Judge model is empty.");
      if (selectedModels.length === 0) throw new Error("Please select at least 1 model.");

      const res = await fetch("/api/benchmark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          prompt,
          judgeModel,
          models: selectedModels,
        }),
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Benchmark API failed.");
      }

      const data = await res.json();
      const results: BenchResult[] = Array.isArray(data?.results) ? data.results : [];

      if (!results.length) throw new Error("No results returned from /api/benchmark.");

      const run: SavedRun = {
        ts: Date.now(),
        prompt,
        judgeModel,
        models: selectedModels,
        results,
      };

      const newCount = saveRun(run);
      setRunsCount(newCount);
      setLastResults(results);
    } catch (e: any) {
      setErr(e?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function clearRuns() {
    localStorage.removeItem(LS_KEY);
    setRunsCount(0);
    setLastResults(null);
    setExpanded({});
  }

  return (
    <div className="container">
      {/* Header */}
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 900 }}>Benchmark (Home)</div>
          <div className="muted" style={{ maxWidth: 920, marginTop: 6 }}>
            Run a benchmark here. Results are saved to localStorage and shown on the leaderboard page.
          </div>

          <div className="row" style={{ marginTop: 12, flexWrap: "wrap" }}>
            <span className="badge">Runs saved: {runsCount}</span>
            <span className="badge">Config models: {modelOptions.length}</span>
          </div>
        </div>

        <a className="badge" href="/leaderboard">
          View Leaderboard →
        </a>
      </div>

      {/* Benchmark Setup */}
      <div className="card" style={{ marginTop: 18 }}>
        <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 12 }}>Benchmark setup</div>

        <div className="grid" style={{ gap: 14 }}>
          <div>
            <div className="muted" style={{ marginBottom: 6 }}>Prompt</div>
            <textarea
              className="textarea"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>

          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
            <div>
              <div className="muted" style={{ marginBottom: 6 }}>Judge model</div>
              {modelOptions.length ? (
                <select className="select" value={judgeModel} onChange={(e) => setJudgeModel(e.target.value)}>
                  {modelOptions.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              ) : (
                <input className="input" value={judgeModel} onChange={(e) => setJudgeModel(e.target.value)} />
              )}
            </div>

            <div>
              <div className="muted" style={{ marginBottom: 6 }}>Models to run</div>
              <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
                {modelOptions.map((m) => {
                  const on = selectedModels.includes(m);
                  return (
                    <button
                      key={m}
                      type="button"
                      className="badge"
                      onClick={() => toggleModel(m)}
                    >
                      {on ? "✓" : "+"} {m}
                    </button>
                  );
                })}
              </div>
              <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
                Selected: {selectedModels.length}
              </div>
            </div>
          </div>

          {err && <div style={{ color: "#ff8a8a" }}>{err}</div>}

          <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
            <div className="row" style={{ gap: 10 }}>
              <button className="btn" onClick={runBenchmark} disabled={loading}>
                {loading ? "Running..." : "Run Benchmark"}
              </button>
              <button className="btn" onClick={clearRuns} disabled={loading || runsCount === 0}>
                Clear Saved Runs
              </button>
            </div>
            <div className="muted" style={{ fontSize: 12 }}>
              Saves to <code>{LS_KEY}</code>
            </div>
          </div>
        </div>
      </div>

      {/* Last Results */}
      <div className="card" style={{ marginTop: 18 }}>
        <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 10 }}>Last run results</div>

        {!lastResults ? (
          <div className="muted">Run a benchmark to see results here.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Model</th>
                  <th>Total (0–40)</th>
                  <th>Latency (ms)</th>
                  <th>Output</th>
                </tr>
              </thead>
              <tbody>
                {lastResults
                  .slice()
                  .sort((a, b) => (b.scores?.total ?? 0) - (a.scores?.total ?? 0))
                  .map((r) => (
                    <tr key={r.model}>
                      <td><span className="badge">{r.model}</span></td>
                      <td>{r.scores?.total ?? "—"}</td>
                      <td>{r.latency_ms}</td>
                      <td style={{ maxWidth: 520 }}>
                        <div style={{ whiteSpace: "pre-wrap" }}>
                          {expanded[r.model]
                            ? r.output
                            : r.output.slice(0, 160) + (r.output.length > 160 ? "…" : "")}
                        </div>

                        {r.output.length > 160 && (
                          <button
                            className="badge"
                            onClick={() =>
                              setExpanded((prev) => ({
                                ...prev,
                                [r.model]: !prev[r.model],
                              }))
                            }
                            style={{ marginTop: 6 }}
                          >
                            {expanded[r.model] ? "Show less" : "Show full"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}