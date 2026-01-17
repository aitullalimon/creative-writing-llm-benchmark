// lib/models.ts

export const MODELS = [
    { label: "OpenAI · GPT-4o Mini", value: "openai/gpt-4o-mini" },
    { label: "OpenAI · GPT-4.1 Mini", value: "openai/gpt-4.1-mini" },
  ];
  
  export type Scores = {
    character_clarity: number; // 0-10
    originality: number; // 0-10
    sensory_detail: number; // 0-10
    tone_consistency: number; // 0-10
    total: number; // 0-40
  };
  
  export type BenchResult = {
    model: string;
    output: string;
    latency_ms: number;
    scores: Scores;
  };
  
  export type BenchRun = {
    ts: number; // Date.now()
    prompt: string;
    models: string[];
    judgeModel: string;
    results: BenchResult[];
  };
  