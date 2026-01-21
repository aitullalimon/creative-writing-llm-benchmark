import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

type ConfigModel = {
  model: string;      // e.g. openai/gpt-4o-mini
  context?: string;   // e.g. 128k
  inputCost?: number; // $ / 1M
  outputCost?: number;// $ / 1M
  speed?: number;     // tokens/sec (optional)
  latency?: number;   // seconds (optional)
};

function readLitellmConfigText(): string {
  const p = path.join(process.cwd(), "litellm-config.yaml");
  if (!fs.existsSync(p)) return "";
  return fs.readFileSync(p, "utf8");
}

function extractModelList(yamlText: string): string[] {
  const lines = yamlText.split("\n");
  const models: string[] = [];
  let inModelList = false;

  for (const raw of lines) {
    const line = raw.trim();

    if (line.startsWith("model_list:")) {
      inModelList = true;
      continue;
    }

    if (!inModelList) continue;

    // match: - model_name: openai/gpt-4o-mini
    const m = raw.match(/model_name:\s*([^\s#]+)/);
    if (m?.[1]) models.push(m[1]);

    // stop if we hit another top-level key after model_list
    if (inModelList && /^[a-zA-Z0-9_]+\s*:/.test(line) && !line.startsWith("-") && !line.includes("model_name:")) {
      // very simple stop condition (good enough here)
      // (we don't "break" because model_list might be followed by nested keys)
    }
  }

  return Array.from(new Set(models));
}

function extractModelInfo(yamlText: string): Record<string, Partial<ConfigModel>> {
  const out: Record<string, Partial<ConfigModel>> = {};
  const lines = yamlText.split("\n");

  let inModelInfo = false;
  let currentModel: string | null = null;

  for (const raw of lines) {
    const line = raw.replace(/\t/g, "  ");

    if (/^\s*model_info\s*:/.test(line)) {
      inModelInfo = true;
      currentModel = null;
      continue;
    }

    if (!inModelInfo) continue;

    // Stop if we reach another top-level key
    if (/^[a-zA-Z0-9_]+\s*:/.test(line) && !/^\s+/.test(line)) {
      if (!/^\s*model_info\s*:/.test(line)) break;
    }

    // model key line: "  openai/gpt-4o-mini:"
    const modelKey = line.match(/^\s{2}([^\s:]+)\s*:\s*$/);
    if (modelKey?.[1]) {
      currentModel = modelKey[1];
      out[currentModel] = out[currentModel] || {};
      continue;
    }

    if (!currentModel) continue;

    const kv = line.match(/^\s{4}([a-zA-Z_]+)\s*:\s*([^\s#]+)\s*$/);
    if (!kv) continue;

    const key = kv[1];
    const val = kv[2];

    if (key === "context") out[currentModel].context = val;
    if (key === "input_cost") out[currentModel].inputCost = Number(val);
    if (key === "output_cost") out[currentModel].outputCost = Number(val);
    if (key === "speed") out[currentModel].speed = Number(val);
    if (key === "latency") out[currentModel].latency = Number(val);
  }

  return out;
}

function isSupportedModelForThisBuild(model: string) {
  // You said you don't have Anthropic key. So we *only* allow OpenAI here.
  // This prevents the UI from ever showing Claude and breaking benchmarks.
  return model.startsWith("openai/");
}

export async function GET() {
  const yamlText = readLitellmConfigText();
  if (!yamlText) {
    return NextResponse.json(
      { models: [], source: "missing", hint: "Put litellm-config.yaml in project root." },
      { status: 200 }
    );
  }

  const list = extractModelList(yamlText).filter(isSupportedModelForThisBuild);
  const info = extractModelInfo(yamlText);

  const models: ConfigModel[] = list.map((m) => ({
    model: m,
    ...(info[m] || {}),
  }));

  return NextResponse.json(
    {
      source: "litellm-config.yaml",
      models,
    },
    { status: 200 }
  );
}
