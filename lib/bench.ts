import { judgePrompt, normalizeScores } from "./judge";
import type { BenchResult } from "./models";

type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

async function litellmChat(model: string, messages: ChatMsg[]) {
  const base = process.env.LITELLM_BASE_URL!;
  const key = process.env.LITELLM_MASTER_KEY!;
  const res = await fetch(`${base}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.9,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`LiteLLM error ${res.status}: ${text}`);
  }
  return res.json();
}

export async function runOneModel(model: string, prompt: string): Promise<{ output: string; latency_ms: number }> {
  const t0 = Date.now();
  const data = await litellmChat(model, [
    { role: "system", content: "You are a helpful creative-writing assistant." },
    { role: "user", content: prompt },
  ]);
  const latency_ms = Date.now() - t0;

  const output = data?.choices?.[0]?.message?.content ?? "";
  return { output, latency_ms };
}

export async function scoreOutput(prompt: string, output: string) {
  const judgeModel = process.env.JUDGE_MODEL || "openai/gpt-4o-mini";
  const data = await litellmChat(judgeModel, [
    { role: "system", content: "Return JSON only. No markdown." },
    { role: "user", content: judgePrompt(prompt, output) },
  ]);

  const rawText = (data?.choices?.[0]?.message?.content ?? "").trim();

  // Robust JSON parse (models sometimes wrap with whitespace)
  let raw: any = {};
  try {
    raw = JSON.parse(rawText);
  } catch {
    // fallback: try to extract JSON block
    const m = rawText.match(/\{[\s\S]*\}/);
    if (m) raw = JSON.parse(m[0]);
  }

  return normalizeScores(raw);
}

export async function runBenchmark(models: string[], prompt: string): Promise<BenchResult[]> {
  const results: BenchResult[] = [];
  for (const m of models) {
    const { output, latency_ms } = await runOneModel(m, prompt);
    const scores = await scoreOutput(prompt, output);
    results.push({ model: m, output, scores, latency_ms });
  }

  // sort best first
  results.sort((a, b) => b.scores.total - a.scores.total);
  return results;
}
