export type ScoreSet = {
    character_clarity: number;
    originality: number;
    sensory_detail: number;
    tone_consistency: number;
    total: number; // 0..40
  };
  
  export type BenchResult = {
    model: string;
    output: string;
    latency_ms: number;
    scores: ScoreSet;
  };
  
  export type SavedRun = {
    ts: number;
    prompt: string;
    judgeModel: string;
    models: string[];
    results: BenchResult[];
  };
  
  const KEY = "cw_benchmark_runs";
  
  export function loadRuns(): SavedRun[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  
  export function saveRun(run: SavedRun) {
    const prev = loadRuns();
    const next = [run, ...prev].slice(0, 200); // keep latest 200
    localStorage.setItem(KEY, JSON.stringify(next));
  }
  
  export function clearRuns() {
    if (typeof window === "undefined") return;
    localStorage.removeItem(KEY);
  }
  
  // aggregate per-model stats from saved runs
  export function computeModelStats(runs: SavedRun[]) {
    const per: Record<
      string,
      { totalSum: number; n: number; wins: number; latencySumMs: number }
    > = {};
  
    for (const r of runs) {
      // winner = highest total in this run
      const sorted = [...(r.results || [])].sort((a, b) => b.scores.total - a.scores.total);
      const winner = sorted[0]?.model;
  
      for (const res of r.results || []) {
        per[res.model] ||= { totalSum: 0, n: 0, wins: 0, latencySumMs: 0 };
        per[res.model].totalSum += res.scores.total;
        per[res.model].latencySumMs += res.latency_ms || 0;
        per[res.model].n += 1;
      }
      if (winner && per[winner]) per[winner].wins += 1;
    }
  
    return Object.entries(per).map(([model, s]) => {
      const avgTotal = s.n ? s.totalSum / s.n : 0;
      const avgLatencyS = s.n ? (s.latencySumMs / s.n) / 1000 : 0;
      return { model, avgTotal, wins: s.wins, avgLatencyS, runs: s.n };
    });
  }
  
  // stable color per model (hash → HSL)
  export function colorForModel(model: string) {
    let h = 0;
    for (let i = 0; i < model.length; i++) h = (h * 31 + model.charCodeAt(i)) >>> 0;
    const hue = h % 360;
    return `hsl(${hue} 85% 60%)`;
  }
  
  // creates a different stagger each time page loads (but stable during this render)
  export function makePageSeed() {
    return Math.random();
  }
  