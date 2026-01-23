import { judgePrompt, normalizeScores } from "./judge";
import type { BenchResult } from "./models";

type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

function getLitellmEnv() {
  const base = process.env.LITELLM_BASE_URL;
  const key = process.env.LITELLM_MASTER_KEY;

  if (!base) throw new Error("Missing env: LITELLM_BASE_URL");
  if (!key) throw new Error("Missing env: LITELLM_MASTER_KEY");

  return { base, key };
}

function isAnthropicBillingError(rawText: string) {
  const t = rawText.toLowerCase();
  return (
    t.includes("anthropic") &&
    (t.includes("credit balance is too low") ||
      t.includes("billing") ||
      t.includes("purchase credits") ||
      t.includes("insufficient"))
  );
}

async function litellmChat(model: string, messages: ChatMsg[]) {
  const { base, key } = getLitellmEnv();

  const res = await fetch(`${base}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.9,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    // keep the text so we can detect billing errors
    throw new Error(`LiteLLM error ${res.status}: ${text}`);
  }

  return res.json();
}

export async function runOneModel(
  model: string,
  prompt: string
): Promise<{ output: string; latency_ms: number }> {
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

  let raw: any = {};
  try {
    raw = JSON.parse(rawText);
  } catch {
    const m = rawText.match(/\{[\s\S]*\}/);
    if (m) raw = JSON.parse(m[0]);
  }

  return normalizeScores(raw);
}

export async function runBenchmark(models: string[], prompt: string): Promise<BenchResult[]> {
  const results: BenchResult[] = [];

  for (const m of models) {
    try {
      const { output, latency_ms } = await runOneModel(m, prompt);
      const scores = await scoreOutput(prompt, output);
      results.push({ model: m, output, scores, latency_ms });
    } catch (err: any) {
      const msg = String(err?.message || err);

      // ✅ If Claude billing/credits issue → skip gracefully
      if (m.startsWith("anthropic/") && isAnthropicBillingError(msg)) {
        results.push({
          model: m,
          output: "Claude is configured, but Anthropic billing/credits are not enabled for this API key. Please add credits in Anthropic Console to run this model.",
          scores: { character_clarity: 0, originality: 0, sensory_detail: 0, tone_consistency: 0, total: 0 },
          latency_ms: 0,
        });
        continue;
      }

      // For any other error, still show the error but don't crash everything
      results.push({
        model: m,
        output: `Error running model: ${msg}`,
        scores: { character_clarity: 0, originality: 0, sensory_detail: 0, tone_consistency: 0, total: 0 },
        latency_ms: 0,
      });
    }
  }

  // sort best first (but keep error models at bottom)
  results.sort((a, b) => (b.scores.total || 0) - (a.scores.total || 0));
  return results;
}