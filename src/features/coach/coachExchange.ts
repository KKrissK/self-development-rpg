import { z } from 'zod'

export interface CoachContext {
  profile: { name: string; title: string }
  skills: { name: string; level: number; targetLevel: number }[]
  currentGoals: string[]
}

const responseSchema = z.object({
  schemaVersion: z.literal(1),
  summary: z.string().min(1).max(1000),
  recommendations: z.array(z.object({
    title: z.string().min(1).max(160),
    rationale: z.string().min(1).max(1000),
    nextStep: z.string().min(1).max(500),
    impact: z.enum(['low', 'medium', 'high']),
    kind: z.enum(['goal', 'quest', 'advice']),
    xp: z.number().int().min(5).max(50).optional(),
  })).min(1).max(12),
})

export type CoachResponse = z.infer<typeof responseSchema>
export type ParseResult = { status: 'valid'; data: CoachResponse } | { status: 'invalid'; reason: string }

export function buildCoachPrompt(context: CoachContext): string {
  return `You are a practical career and self-improvement coach. Analyze the supplied context and propose specific, realistic outcomes. Do not diagnose health conditions, invent credentials, or claim certainty.\n\nCONTEXT\n${JSON.stringify(context, null, 2)}\n\nReturn JSON only. No markdown fences or commentary. Use this exact contract:\n{\n  "schemaVersion": 1,\n  "summary": "max 1000 characters",\n  "recommendations": [\n    { "title": "max 160 characters", "rationale": "max 1000 characters", "nextStep": "max 500 characters", "impact": "low|medium|high", "kind": "goal|advice", "xp": 5 }\n  ]\n}\nReturn 1–8 recommendations. XP, when included, must be 5–50.`
}

export function parseCoachResponse(raw: string): ParseResult {
  if (raw.length > 50_000) return { status: 'invalid', reason: 'Response is too large.' }
  try {
    const parsed = responseSchema.safeParse(JSON.parse(raw))
    return parsed.success ? { status: 'valid', data: parsed.data } : { status: 'invalid', reason: parsed.error.issues[0]?.message ?? 'Response did not match the required format.' }
  } catch { return { status: 'invalid', reason: 'Response is not valid JSON.' } }
}
