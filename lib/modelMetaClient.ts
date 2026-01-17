// lib/modelMetaClient.ts
"use client";

export type ModelMeta = {
  model: string;
  context_tokens: number | null;
  context: string;
  inputCostPer1M: number | null;
  outputCostPer1M: number | null;
};

export async function fetchModelMeta(): Promise<ModelMeta[]> {
  const res = await fetch("/api/model-metadata", { cache: "no-store" });
  const data = await res.json();
  return Array.isArray(data?.models) ? (data.models as ModelMeta[]) : [];
}
