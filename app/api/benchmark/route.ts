import { NextResponse } from "next/server";
import { runBenchmark } from "@/lib/bench";

type Body = {
  prompt?: string;
  models?: string[];
  judgeModel?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;

    const prompt = String(body?.prompt || "").trim();
    const models = Array.isArray(body?.models) ? body.models.map(String) : [];

    // Use env judge model unless UI sends one
    const judgeModel = String(body?.judgeModel || process.env.JUDGE_MODEL || "openai/gpt-4o-mini");

    if (!prompt || models.length === 0) {
      return NextResponse.json({ error: "Missing prompt or models" }, { status: 400 });
    }

    // ✅ Vercel should only talk to LiteLLM
    const base = process.env.LITELLM_BASE_URL;
    const masterKey = process.env.LITELLM_MASTER_KEY;

    if (!base) {
      return NextResponse.json(
        { error: "Missing LITELLM_BASE_URL in Vercel environment variables" },
        { status: 400 }
      );
    }
    if (!masterKey) {
      return NextResponse.json(
        { error: "Missing LITELLM_MASTER_KEY in Vercel environment variables" },
        { status: 400 }
      );
    }

    // ✅ Ensure judge model is available for scoring step
    process.env.JUDGE_MODEL = judgeModel;

    // Runs generation + judging through lib/bench.ts (LiteLLM)
    const results = await runBenchmark(models, prompt);

    return NextResponse.json({ mode: "litellm", results }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}