import { judgePrompt, normalizeScores } from "./judge";
import type { BenchResult } from "./models";

type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

type LiteLLMChatResponse = {
  choices?: Array<{
    message?: { content?: string };
  }>;
};

function mustEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing ${name} environment variable`);
  }
  return v;
}

/**
 * ALWAYS call LiteLLM proxy (Render), never OpenAI/Anthropic directly from Vercel.
 */
async function litellmChat(model: string, messages: ChatMsg[]) {
  const base = mustEnv("LITELLM_BASE_URL").replace(/\/+$/, ""); // remove trailing slash
  const key = mustEnv("LITELLM_MASTER_KEY");

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
    throw new Error(`LiteLLM error ${res.status}: ${text}`);
  }

  return (await res.json()) as LiteLLMChatResponse;
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
  // IMPORTANT:
  // This judge model is STILL called via litellmChat() -> your Render LiteLLM proxy.
  // Vercel should NOT need OPENAI_API_KEY / ANTHROPIC_API_KEY.
  const judgeModel = process.env.JUDGE_MODEL ?? "openai/gpt-4o-mini";

  const data = await litellmChat(judgeModel, [
    {
      role: "system",
      content: "You are a strict evaluator. Return JSON only. No markdown.",
    },
    {
      role: "user",
      content: judgePrompt(prompt, output),
    },
  ]);

  const rawText = (data?.choices?.[0]?.message?.content ?? "").trim();

  // Robust JSON parse: some models may add text before/after JSON
  let raw: any = {};
  try {
    raw = JSON.parse(rawText);
  } catch {
    const match = rawText.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error(`Judge did not return valid JSON. Got: ${rawText}`);
    }
    raw = JSON.parse(match[0]);
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