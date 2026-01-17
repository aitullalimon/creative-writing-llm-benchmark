export type ModelMetaRow = {
    model: string;
    context: string;
    inputCost: number;  // $ per 1M input tokens (mock)
    outputCost: number; // $ per 1M output tokens (mock)
  };
  
  export const MODEL_META: ModelMetaRow[] = [
    { model: "openai/gpt-4o-mini", context: "128k", inputCost: 0.15, outputCost: 0.60 },
    { model: "openai/gpt-4.1-mini", context: "128k", inputCost: 0.30, outputCost: 1.20 },
  
    // Add more later if you want (still mock)
    { model: "anthropic/claude-3.5-sonnet", context: "200k", inputCost: 3.00, outputCost: 15.00 },
    { model: "google/gemini-1.5-flash", context: "1M", inputCost: 0.08, outputCost: 0.30 },
  ];
  
  export function getMeta(model: string): ModelMetaRow {
    const found = MODEL_META.find((m) => m.model === model);
    return (
      found || {
        model,
        context: "—",
        inputCost: 0,
        outputCost: 0,
      }
    );
  }
  