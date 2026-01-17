import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

/**
 * We keep parsing intentionally simple (no extra deps).
 * Supports:
 * - model_list entries: model_name: xxx
 * - optional model_info block (recommended) to supply context/pricing
 *
 * If model_info is missing, we still return the model list.
 */
type ConfigModel = {
  model: string;                 // e.g. openai/gpt-4o-mini
  context?: string;              // e.g. 128k
  inputCost?: number;            // $ / 1M
  outputCost?: number;           // $ / 1M
  speed?: number;                // tokens/sec (optional)
  latency?: number;              // seconds (optional)
};

function readLitellmConfigText(): string {
  const p = path.join(process.cwd(), "litellm-config.yaml");
  if (!fs.existsSync(p)) return "";
  return fs.readFileSync(p, "utf8");
}

// Very small YAML-ish extraction (good enough for demo config)
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

    // if we hit a new top-level key, stop
    if (inModelList && /^[a-zA-Z0-9_]+\s*:/.test(line) && !line.startsWith("-")) {
      // allow "  - model_name" lines, but stop on other top-level keys
      if (!line.startsWith("model_name:") && !line.includes("model_name:")) {
        // still could be nested, but for our simple demo we stop.
      }
    }

    if (!inModelList) continue;

    // match: - model_name: openai/gpt-4o-mini
    const m = raw.match(/model_name:\s*([^\s#]+)/);
    if (m?.[1]) models.push(m[1]);
  }

  // unique
  return Array.from(new Set(models));
}

/**
 * Optional recommended config format in litellm-config.yaml:
 *
 * model_info:
 *   openai/gpt-4o-mini:
 *     context: 128k
 *     input_cost: 0.15
 *     output_cost: 0.6
 *     speed: 250
 *     latency: 0.9
 *
 * (You can add these for demo pricing/context.)
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
    if (/^[a-zA-Z0-9_]+\s*:/.test(line) && !/^\s+/.test(line)) {
      // top-level key
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

export async function GET() {
  const yamlText = readLitellmConfigText();
  if (!yamlText) {
    return NextResponse.json(
      { models: [], source: "missing", hint: "Put litellm-config.yaml in project root." },
      { status: 200 }
    );
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
