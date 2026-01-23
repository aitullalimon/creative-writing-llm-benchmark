import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

type ConfigModel = {
  model: string;       // e.g. openai/gpt-4o-mini, anthropic/claude-3-5-sonnet
  context?: string;    // e.g. 128k / 200k
  inputCost?: number;  // $ / 1M (your UI convention)
  outputCost?: number; // $ / 1M (your UI convention)
  speed?: number;      // tokens/sec (optional)
  latency?: number;    // seconds (optional)
};

function readLitellmConfigText(): string {
  const p = path.join(process.cwd(), "litellm-config.yaml");
  if (!fs.existsSync(p)) return "";
  return fs.readFileSync(p, "utf8");
}

/**
 * Extracts model_list -> model_name entries from litellm-config.yaml
 */
function extractModelList(yamlText: string): string[] {
  const lines = yamlText.split("\n");
  const models: string[] = [];

  let inModelList = false;

  for (const raw of lines) {
    const trimmed = raw.trim();

    if (trimmed.startsWith("model_list:")) {
      inModelList = true;
      continue;
    }

    // Stop once a new top-level key starts (no indentation) after model_list
    if (inModelList && trimmed && !raw.startsWith(" ") && /^[a-zA-Z0-9_]+\s*:/.test(trimmed)) {
      break;
    }

    if (!inModelList) continue;

    // match: - model_name: openai/gpt-4o-mini
    const m = raw.match(/model_name:\s*([^\s#]+)/);
    if (m?.[1]) models.push(m[1]);
  }

  return Array.from(new Set(models));
}

/**
 * Extracts model_info block.
 * Supports keys:
 * - context
 * - input_cost / output_cost
 * - inputCost / outputCost
 * - speed / latency
 *
 * NOTE: This is a "YAML-ish" parser (no deps), good enough for your config structure.
 */
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
    if (!/^\s+/.test(line) && /^[a-zA-Z0-9_]+\s*:/.test(line) && !/^\s*model_info\s*:/.test(line)) {
      break;
    }

    // model key line: "  openai/gpt-4o-mini:"
    const modelKey = line.match(/^\s{2}([^\s:]+)\s*:\s*$/);
    if (modelKey?.[1]) {
      currentModel = modelKey[1];
      out[currentModel] = out[currentModel] || {};
      continue;
    }

    if (!currentModel) continue;

    // kv line: "    input_cost: 0.15"
    const kv = line.match(/^\s{4}([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*([^\s#]+)\s*$/);
    if (!kv) continue;

    const key = kv[1];
    const valRaw = kv[2];

    // keep context as string (128k/200k)
    if (key === "context") out[currentModel].context = valRaw;

    // accept both snake_case and camelCase
    if (key === "input_cost" || key === "inputCost") out[currentModel].inputCost = Number(valRaw);
    if (key === "output_cost" || key === "outputCost") out[currentModel].outputCost = Number(valRaw);

    if (key === "speed") out[currentModel].speed = Number(valRaw);
    if (key === "latency") out[currentModel].latency = Number(valRaw);
  }

  return out;
}

export async function GET() {
  const yamlText = readLitellmConfigText();

  if (!yamlText) {
    return NextResponse.json(
      { models: [], source: "missing", hint: "Put litellm-config.yaml in project root." },
      { status: 200 }
    );
  }

  // Optional debug (only in dev)
  if (process.env.NODE_ENV !== "production") {
    console.log("CONFIG MODELS YAML PREVIEW:", yamlText.slice(0, 800));
  }

  const list = extractModelList(yamlText);
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