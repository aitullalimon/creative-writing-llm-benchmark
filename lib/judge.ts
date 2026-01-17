import type { Scores } from "./models";

function clamp0to10(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(10, Math.round(n)));
}

export function normalizeScores(raw: Partial<Scores>): Scores {
  const character_clarity = clamp0to10(raw.character_clarity ?? 0);
  const originality = clamp0to10(raw.originality ?? 0);
  const sensory_detail = clamp0to10(raw.sensory_detail ?? 0);
  const tone_consistency = clamp0to10(raw.tone_consistency ?? 0);
  const total = character_clarity + originality + sensory_detail + tone_consistency;
  return { character_clarity, originality, sensory_detail, tone_consistency, total };
}

export function judgePrompt(userPrompt: string, modelOutput: string) {
  return `
You are a strict creative-writing judge.

Rate the writing from 0 to 10 in each category:
- character_clarity (is the character vivid and understandable?)
- originality (fresh, non-generic ideas)
- sensory_detail (concrete imagery: sights/sounds/smells/tactile)
- tone_consistency (tone stays consistent and intentional)

Return ONLY valid JSON with exactly these keys:
{
  "character_clarity": number,
  "originality": number,
  "sensory_detail": number,
  "tone_consistency": number
}

Prompt:
${userPrompt}

Model Output:
${modelOutput}
`.trim();
}
