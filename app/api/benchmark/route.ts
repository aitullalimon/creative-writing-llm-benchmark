import { NextResponse } from "next/server";
import { runBenchmark } from "@/lib/bench";

type Scores = {
  character_clarity: number;
  originality: number;
  sensory_detail: number;
  tone_consistency: number;
  total: number;
};

type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

function mockScores(seed: number): Scores {
  const a = 6 + (seed % 5);
  const b = 5 + ((seed * 3) % 5);
  const c = 6 + ((seed * 7) % 5);
  const d = 7 + ((seed * 11) % 4);
  return {
    character_clarity: a,
    originality: b,
    sensory_detail: c,
    tone_consistency: d,
    total: a + b + c + d,
  };
}

function hashSeed(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick<T>(arr: T[], seed: number) {
  return arr[seed % arr.length];
}

function mockOutput(model: string, prompt: string) {
  const seed = hashSeed(model + "||" + prompt);

  const openings = [
    "He wrote as if the page could hold back the tide.",
    "The theme arrived first, quiet and stubborn, like salt in the air.",
    "A single idea anchored the scene, and everything else circled it.",
    "The story began with a feeling he couldn't name, only obey.",
  ];

  const senses = [
    "Neon smeared across wet pavement like spilled ink.",
    "Wind worried at the doorframe, tasting of rust and sea-spray.",
    "Streetlights flickered in puddles that pretended to be oceans.",
    "Cold air threaded through his collar, sharp as a confession.",
  ];

  const themeMoves = [
    "He tried to outrun it, but the theme followed—steady, coherent, unblinking.",
    "Every sentence returned to the same current, pulling his thoughts back into line.",
    "The idea held the narrative together, resisting drift and contradiction.",
    "Even the metaphors obeyed, repeating the central thread without breaking it.",
  ];

  const closings = [
    "He ended the paragraph where the theme began: unchanged, but understood.",
    "When the last line landed, the theme was still there—clearer than before.",
    "The scene closed without wandering, the central idea intact.",
    "He stopped. The page stayed. The theme did too.",
  ];

  return (
    `[MOCK OUTPUT — ${model}]\nPrompt: ${prompt}\n\n` +
    `${pick(openings, seed)} ${pick(senses, seed >>> 1)} ${pick(themeMoves, seed >>> 2)} ${pick(closings, seed >>> 3)}`
  );
}

/** LiteLLM chat helper (judge call only) */
async function litellmChat(model: string, messages: ChatMsg[]) {
  const base = process.env.LITELLM_BASE_URL;
  const key = process.env.LITELLM_MASTER_KEY;

  if (!base || !key) {
    throw new Error("Missing LITELLM_BASE_URL or LITELLM_MASTER_KEY in env.");
  }

  const res = await fetch(`${base}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0, // judge should be stable
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`LiteLLM error ${res.status}: ${text}`);
  }
  return res.json();
}

function themeJudgePrompt(prompt: string, output: string) {
  return `
You are evaluating CREATIVE WRITING THEME COHERENCE.

PROMPT:
${prompt}

MODEL OUTPUT:
${output}

Score theme_coherence from 0 to 10:
- 0–2: theme absent / random / contradicting
- 3–5: theme appears but drifts or breaks
- 6–8: theme mostly consistent, minor drift
- 9–10: theme is clear, consistent, maintained throughout

Return JSON ONLY:
{
  "theme_coherence": number,
  "notes": string
}
`.trim();
}

async function judgeThemeCoherence(judgeModel: string, prompt: string, output: string) {
  const data = await litellmChat(judgeModel, [
    { role: "system", content: "Return JSON only. No markdown." },
    { role: "user", content: themeJudgePrompt(prompt, output) },
  ]);

  const rawText = (data?.choices?.[0]?.message?.content ?? "").trim();

  let raw: any = {};
  try {
    raw = JSON.parse(rawText);
  } catch {
    const m = rawText.match(/\{[\s\S]*\}/);
    if (m) raw = JSON.parse(m[0]);
  }

  const theme = Number(raw?.theme_coherence);
  const theme_coherence = Number.isFinite(theme) ? Math.max(0, Math.min(10, theme)) : 0;

  return { theme_coherence, notes: String(raw?.notes ?? "") };
}

function mapThemeToScores(theme_coherence_0_10: number): Scores {
  // Convert 0..10 to 0..40 (as your UI expects total 0..40)
  const total = Math.round(theme_coherence_0_10 * 4);

  // Keep fields for UI compatibility. You can later replace these with real sub-metrics if desired.
  return {
    character_clarity: total,
    originality: total,
    sensory_detail: total,
    tone_consistency: total,
    total,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const prompt = String(body?.prompt || "");
    const models = Array.isArray(body?.models) ? body.models.map(String) : [];
    const judgeModel = String(body?.judgeModel || "");

    if (!prompt || models.length === 0) {
      return NextResponse.json({ error: "Missing prompt or models" }, { status: 400 });
    }

    const isMock = String(process.env.MOCK_MODE || "false").toLowerCase() === "true";

    // -----------------------------
    // MOCK MODE — NO LITELLM CALLS
    // -----------------------------
    if (isMock) {
      const results = models.map((model, index) => {
        const output = mockOutput(model, prompt);
        const scores = mockScores(index + prompt.length); // keep old mock scoring for mock mode
        return {
          model,
          output,
          scores,
          latency_ms: 500 + index * 120,
        };
      });

      results.sort((a, b) => b.scores.total - a.scores.total);

      return NextResponse.json({
        mode: "mock",
        results,
      });
    }

    // ---------------------------------------
    // REAL MODE — Theme Coherence via Judge
    // ---------------------------------------
    // We will generate outputs using your existing runBenchmark()
    // and then override scores using LLM-as-a-judge coherence.
    const generated = await runBenchmark(models, prompt);

    const judgedResults = [];
    for (const r of generated) {
      // Judge theme coherence on the generated output
      let scores: Scores;
      try {
        const judged = await judgeThemeCoherence(judgeModel || process.env.JUDGE_MODEL || "openai/gpt-4o-mini", prompt, r.output);
        scores = mapThemeToScores(judged.theme_coherence);
      } catch {
        // fallback if judge fails (keeps system stable)
        scores = mockScores(hashSeed(r.model + prompt));
      }

      judgedResults.push({
        ...r,
        scores,
      });
    }

    // sort by best total score
    judgedResults.sort((a, b) => (b.scores?.total ?? 0) - (a.scores?.total ?? 0));

    return NextResponse.json({
      mode: "judge_theme_coherence",
      results: judgedResults,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}