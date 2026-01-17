// lib/storage.ts
"use client";

import type { BenchRun } from "./models";

const KEY = "cw_benchmark_runs";

export function loadRuns(): BenchRun[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as BenchRun[]) : [];
  } catch {
    return [];
  }
}

export function saveRun(run: BenchRun) {
  if (typeof window === "undefined") return;
  const prev = loadRuns();
  const next = [run, ...prev].slice(0, 50); // keep latest 50 runs
  localStorage.setItem(KEY, JSON.stringify(next));
}

export function clearRuns() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}
