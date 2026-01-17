// app/api/model-metadata/route.ts
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import YAML from "yaml";

type ModelInfo = {
  max_input_tokens?: number;
  input_cost_per_token?: number;
  output_cost_per_token?: number;
};

type ModelListItem = {
  model_name?: string;
  model_info?: ModelInfo;
};

function toK(n?: number) {
  if (!n || n <= 0) return "";
  if (n >= 1_000_000) return `${Math.round(n / 1_000_000)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

export async function GET() {
  try {
    // assumes litellm-config.yaml is in project root
    const configPath = path.join(process.cwd(), "litellm-config.yaml");

    if (!fs.existsSync(configPath)) {
      return NextResponse.json(
        { error: "litellm-config.yaml not found at project root", models: [] },
        { status: 200 }
      );
    }

    const raw = fs.readFileSync(configPath, "utf8");
    const doc = YAML.parse(raw) as { model_list?: ModelListItem[] };

    const modelList = Array.isArray(doc?.model_list) ? doc.model_list : [];

    const models = modelList
      .map((m) => {
        const name = m.model_name || "";
        const info = m.model_info || {};

        const maxTokens = info.max_input_tokens;
        const inPerTok = info.input_cost_per_token;
        const outPerTok = info.output_cost_per_token;

        return {
          model: name,
          context_tokens: maxTokens ?? null,
          context: maxTokens ? toK(maxTokens) : "",
          inputCostPer1M: typeof inPerTok === "number" ? +(inPerTok * 1_000_000).toFixed(4) : null,
          outputCostPer1M: typeof outPerTok === "number" ? +(outPerTok * 1_000_000).toFixed(4) : null,
        };
      })
      .filter((x) => x.model);

    return NextResponse.json({ models });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to read config", models: [] },
      { status: 200 }
    );
  }
}
