export const MODEL_COLORS: Record<string, string> = {
    "openai/gpt-4o-mini": "#3b82f6",   // blue
    "openai/gpt-4.1-mini": "#facc15",  // yellow
    // add more later if you want:
    // "anthropic/claude-3-5-sonnet": "#a78bfa",
    // "google/gemini-1.5-flash": "#22c55e",
  };
  
  export function colorForModel(model: string) {
    return MODEL_COLORS[model] ?? "rgba(255,255,255,0.35)";
  }
  