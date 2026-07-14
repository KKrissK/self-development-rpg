import { z } from 'zod'
import { extractJsonObject } from '../../platform/json'

export interface CoachContext {
  profile: { name: string; title: string; bio?: string }
  skills: {
    name: string
    category?: string
    level: number
    status?: string
    experience?: string
    assessmentSummary?: string
    strengths?: string[]
    growthAreas?: string[]
  }[]
  currentGoals: (string | {
    title: string
    notes: string
    status: string
    priority: string
    dueDate?: string
    relatedSkill?: string
    supportingLibraryItems: string[]
  })[]
  currentLibrary?: { title: string; kind: string; status: string; relatedSkill?: string }[]
}

const recommendationBase = {
  title: z.string().min(1).max(160),
  rationale: z.string().min(1).max(1000),
  nextStep: z.string().min(1).max(500),
  impact: z.enum(['low', 'medium', 'high']),
}

const recommendationSchema = z.discriminatedUnion('kind', [
  z.object({ ...recommendationBase, kind: z.enum(['goal', 'quest']), difficulty: z.enum(['easy', 'medium', 'hard']).default('easy'), xp: z.number().int().min(0).max(100).optional() }).strict(),
  z.object({ ...recommendationBase, kind: z.literal('advice') }).strict(),
  z.object({
    ...recommendationBase,
    kind: z.literal('library'),
    resourceKind: z.enum(['book', 'video', 'course', 'article', 'podcast', 'other']),
    creator: z.string().max(120),
    url: z.string().max(1000).refine((value) => !value || /^https?:\/\//i.test(value), 'Only HTTP(S) links are supported.'),
    skillName: z.string().max(100).optional(),
    supportsGoalTitle: z.string().max(160).optional(),
  }).strict(),
])

const responseSchema = z.object({
  schemaVersion: z.literal(1),
  summary: z.string().min(1).max(1000),
  recommendations: z.array(recommendationSchema).min(1).max(12),
}).strict()

export type CoachResponse = z.infer<typeof responseSchema>
export type CoachRecommendation = CoachResponse['recommendations'][number]
export type ParseResult = { status: 'valid'; data: CoachResponse } | { status: 'invalid'; reason: string }

export function buildCoachPrompt(context: CoachContext): string {
  return `You are a practical career and self-development coach. Use the person's recorded skills, active Goals, and current Library as one connected system. Recommend specific, realistic actions and learning material that address demonstrated growth areas or help an existing Goal move forward.

RULES
- Ground recommendations in the supplied context. Do not invent credentials, experience, completed work, or personal facts.
- Prefer a small number of high-value recommendations over generic productivity advice.
- A goal recommendation must be observable and finishable.
- A library recommendation must explain why it fits this person's present level or Goal. Do not recommend an item already present in currentLibrary.
- Only provide a resource URL when you are confident it is the real canonical HTTP(S) URL; otherwise use an empty string.
- Use skillName and supportsGoalTitle only when they exactly match names supplied in the context. This lets the app connect imported items automatically.
- Do not diagnose health conditions or claim certainty.

CONTEXT
${JSON.stringify(context, null, 2)}

Return JSON only, with no markdown fences, commentary, or extra keys. Use this exact contract:
{
  "schemaVersion": 1,
  "summary": "max 1000 characters",
  "recommendations": [
    { "title": "max 160 characters", "rationale": "max 1000 characters", "nextStep": "max 500 characters", "impact": "low|medium|high", "kind": "goal", "difficulty": "easy|medium|hard" },
    { "title": "max 160 characters", "rationale": "max 1000 characters", "nextStep": "max 500 characters", "impact": "low|medium|high", "kind": "advice" },
    { "title": "real resource title", "rationale": "why it fits", "nextStep": "how to use it", "impact": "low|medium|high", "kind": "library", "resourceKind": "book|video|course|article|podcast|other", "creator": "creator or empty string", "url": "real URL or empty string", "skillName": "optional exact skill name", "supportsGoalTitle": "optional exact active Goal title" }
  ]
}
Return 1-8 recommendations. Include Library items when a specific resource would materially help a Goal or skill gap. Choose Goal difficulty honestly: easy for a small straightforward outcome, medium for meaningful multi-step effort, and hard only for a substantial demanding outcome. The app calculates XP itself.`
}

export function parseCoachResponse(raw: string): ParseResult {
  if (raw.length > 50_000) return { status: 'invalid', reason: 'Response is too large.' }
  try {
    const parsed = responseSchema.safeParse(JSON.parse(extractJsonObject(raw)))
    return parsed.success ? { status: 'valid', data: parsed.data } : { status: 'invalid', reason: parsed.error.issues[0]?.message ?? 'Response did not match the required format.' }
  } catch { return { status: 'invalid', reason: 'Response is not valid JSON.' } }
}
