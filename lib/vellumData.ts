export type TaskBar = { model: string; score: number };

export const TOP_TASKS: { title: string; subtitle: string; bars: TaskBar[] }[] = [
  {
    title: "Best Overall (Humanity's Last Exam)",
    subtitle: "Example layout (replace with your own benchmark tasks later).",
    bars: [
      { model: "Gemini 3 Pro", score: 46 },
      { model: "Kimi K2 Thinking", score: 44 },
      { model: "GPT-5", score: 35 },
      { model: "Grok 4", score: 25 },
      { model: "Gemini 2.5 Pro", score: 22 },
    ],
  },
  {
    title: "Best in Visual Reasoning (ARC-AGI 2)",
    subtitle: "Example layout (replace with your tasks later).",
    bars: [
      { model: "Claude Opus 4.5", score: 100 },
      { model: "GPT 5.2", score: 53 },
      { model: "Gemini 3 Pro", score: 31 },
      { model: "GPT 5.1", score: 18 },
      { model: "GPT-5", score: 18 },
    ],
  },
  {
    title: "Best in Multilingual Reasoning (MMMLU)",
    subtitle: "Example layout (replace with your tasks later).",
    bars: [
      { model: "Gemini 3 Pro", score: 93 },
      { model: "Claude Opus 4.5", score: 92 },
      { model: "Claude Opus 4.1", score: 90 },
      { model: "Gemini 2.5 Pro", score: 90 },
      { model: "Claude Sonnet 4.5", score: 90 },
    ],
  },
];

export type ModelRow = {
  model: string;
  context: string;
  inputCost: number;   // per 1M tokens
  outputCost: number;  // per 1M tokens
  speed: number;       // tokens/sec
  latency: number;     // seconds
};

export const MODEL_ROWS: ModelRow[] = [
  { model: "openai/gpt-4o-mini", context: "128k", inputCost: 0.15, outputCost: 0.60, speed: 250, latency: 0.9 },
  { model: "openai/gpt-4.1-mini", context: "128k", inputCost: 0.30, outputCost: 1.20, speed: 210, latency: 1.1 },
  { model: "anthropic/claude-3-5-sonnet", context: "200k", inputCost: 3.00, outputCost: 15.00, speed: 140, latency: 1.5 },
  { model: "google/gemini-1.5-flash", context: "1M", inputCost: 0.08, outputCost: 0.30, speed: 300, latency: 1.0 },
];
