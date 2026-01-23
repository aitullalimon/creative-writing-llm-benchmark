import { NextResponse } from "next/server";

type Scores = {
  character_clarity: number;
  originality: number;
  sensory_detail: number;
  tone_consistency: number;
  total: number;
};

type ChatMsg = {
  role: "system" | "user" | "assistant";
  content: string;
};

function assertEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} environment variable`);
  return v;
}

async function litellmChat(model: string, messages: ChatMsg[], temperature = 0.7) {
  const base = assertEnv("LITELLM_BASE_URL"); // MUST be LiteLLM service
  const key = assertEnv("LITELLM_MASTER_KEY");

  const res = await fetch(`${base}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
    }),
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(`LiteLLM ${res.status}: ${text}`);
  }

  return JSON.parse(text);
}

function normalizeScores(raw: any): Scores {
  const c = Number(raw.character_clarity ?? 0);
  const o = Number(raw.originality ?? 0);
  const s = Number(raw.sensory_detail ?? 0);
  const t = Number(raw.tone_consistency ?? 0);
  return {
    character_clarity: c,
    originality: o,
    sensory_detail: s,
    tone_consistency: t,
    total: c + o + s + t,
  };
}

function judgePrompt(prompt: string, output: string) {
  return `
Evaluate the creative writing below.

PROMPT:
${prompt}

OUTPUT:
${output}

Return JSON ONLY:
{
  "character_clarity": number (0-10),
  "originality": number (0-10),
  "sensory_detail": number (0-10),
  "tone_consistency": number (0-10)
}
`.trim();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const prompt = String(body.prompt || "");
    const models = Array.isArray(body.models) ? body.models : [];
    const judgeModel = body.judgeModel || "openai/gpt-4o-mini";

    if (!prompt || models.length === 0) {
      return NextResponse.json(
        { error: "Missing prompt or models" },
        { status: 400 }
      );
    }

    const results = [];

    for (const model of models) {
      const t0 = Date.now();

      const gen = await litellmChat(model, [
        { role: "system", content: "You are a creative writer." },
        { role: "user", content: prompt },
      ]);

      const output = gen.choices?.[0]?.message?.content ?? "";

      const judge = await litellmChat(judgeModel, [
        { role: "system", content: "Return JSON only." },
        { role: "user", content: judgePrompt(prompt, output) },
      ], 0);

      const rawScores = JSON.parse(
        judge.choices?.[0]?.message?.content ?? "{}"
      );

      results.push({
        model,
        output,
        scores: normalizeScores(rawScores),
        latency_ms: Date.now() - t0,
      });
    }

    results.sort((a, b) => b.scores.total - a.scores.total);

    return NextResponse.json({ mode: "litellm", results });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Server error" },
      { status: 500 }
    );
  }
}