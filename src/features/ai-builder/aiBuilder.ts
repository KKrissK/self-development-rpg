import { z } from 'zod'
import type { AppState } from '../../domain/model'
import { createId } from '../../domain/id'
import { applyBulkImport, parseBulkImport, type BulkImport, type BulkSummary } from '../bulk-import/bulkImport'

export type ItemTarget = 'skills' | 'quests' | 'tasks' | 'resources'

export interface AiBuilderContext {
  profile: { title: string; bio: string }
  existingSkills: { name: string; level: number; targetLevel?: number; evidence?: string; assessmentSummary?: string; strengths?: string[]; growthAreas?: string[] }[]
  existingGoals?: { title: string; status: string; skillName?: string }[]
  selectedGoal?: { title: string; notes: string; dueDate?: string; linkedSkill: AiBuilderContext['existingSkills'][number] | null }
}

export type AiItemParseResult =
  | { status: 'valid'; data: BulkImport; summary: BulkSummary }
  | { status: 'invalid'; reason: string }

const assessmentSchema = z.object({
  schemaVersion: z.literal(1),
  skill: z.object({
    name: z.string().min(1).max(100),
    category: z.string().max(60),
    level: z.number().int().min(1).max(10),
    targetLevel: z.number().int().min(1).max(10),
    status: z.enum(['learning', 'practicing', 'proven']),
    evidence: z.string().max(1000),
    assessmentSummary: z.string().min(1).max(1000),
    strengths: z.array(z.string().min(1).max(200)).min(1).max(8),
    gaps: z.array(z.string().min(1).max(200)).min(1).max(8),
    confidence: z.enum(['low', 'medium', 'high']).optional(),
  }).strict(),
}).strict()

export type SkillAssessment = z.infer<typeof assessmentSchema>
export type AssessmentParseResult =
  | { status: 'valid'; data: SkillAssessment }
  | { status: 'invalid'; reason: string }

const contracts: Record<ItemTarget, string> = {
  skills: `{
  "schemaVersion": 1,
  "skills": [
    { "name": "max 100 chars", "category": "max 60 chars", "level": 1, "targetLevel": 5, "status": "learning|practicing|proven", "evidence": "max 1000 chars" }
  ]
}`,
  quests: `{
  "schemaVersion": 1,
  "quests": [
    { "title": "max 160 chars", "notes": "max 2000 chars", "difficulty": "easy|medium|hard", "status": "now|next|later", "skillName": "optional exact existing skill name" }
  ]
}`,
  tasks: `{
  "schemaVersion": 1,
  "tasks": [
    { "title": "one concrete action, max 200 chars", "notes": "useful instructions or definition of done, max 2000 chars", "status": "todo", "dueDate": "optional YYYY-MM-DD", "goalTitle": "exact selected Goal title" }
  ]
}`,
  resources: `{
  "schemaVersion": 1,
  "resources": [
    { "title": "max 200 chars", "kind": "book|video|course|article|podcast|other", "status": "queued", "creator": "max 120 chars", "url": "an http(s) URL or empty string", "notes": "max 2000 chars", "skillName": "optional exact existing skill name" }
  ]
}`,
}

const labels: Record<ItemTarget, string> = {
  skills: 'skills',
  quests: 'concrete outcome-oriented goals',
  tasks: 'practical tasks for the selected Goal',
  resources: 'learning-library items',
}

export function buildItemPrompt(target: ItemTarget, request: string, context: AiBuilderContext): string {
  return `You convert a person's plain-language request into structured items for a local self-development app.

TASK
Create one or more ${labels[target]} from the request between <user_request> tags. Preserve the user's intent, use concise language, and do not invent experience, credentials, completed work, or links. For skills, treat self-described ability conservatively and put only stated experience in evidence. For goals, make each outcome broad enough to contain several tasks but still observable and finishable, then choose easy, medium, or hard honestly; never supply XP because the app calculates it. For tasks, create a realistic ordered path toward the selected Goal: adapt difficulty and starting point to the linked skill evidence when present, do not assume missing ability, avoid vague actions, and use the selected Goal title exactly in every goalTitle. For resources, only include a URL when you are confident it is real; otherwise use an empty string.

USER CONTEXT
${JSON.stringify(context, null, 2)}

<user_request>
${request.trim()}
</user_request>

Return JSON only: no markdown fences, explanation, or extra keys. Return 1-20 items using exactly this contract:
${contracts[target]}`
}

export function buildSkillAssessmentPrompt(skillDescription: string, context: AiBuilderContext): string {
  return `Act as a candid skill assessor. Your job is to estimate demonstrated current ability, not protect the user's feelings and not reward confidence, vocabulary, credentials, or years of exposure by themselves.

Assess exactly one skill described between <skill_to_assess> tags. Interview the user interactively in this chat:
1. Before the first question, choose and state a fixed total of 4-8 questions based on the skill, for example: "This assessment will take 6 questions."
2. Ask one short question at a time and label every question with visible progress, exactly like "Question 2 of 6". Never send a batch of questions.
3. Adapt later questions to earlier answers. Include at least one practical scenario and one small knowledge or judgment check appropriate to the skill.
4. Ask for concrete examples and experience. Distinguish recognition from independent execution.
5. If an answer is too vague to score, you may ask one focused follow-up. Label it "Follow-up for question 2"; it does not increase or reset the announced total.
6. After each answer, briefly acknowledge progress without scoring the user, then continue. Do not exceed the announced question total, restart the interview, or add bonus questions.
7. After the final announced question (and any necessary follow-up), say the interview is complete and output the final JSON. Do not reveal a score or output JSON earlier.

Use this 1-10 rubric strictly:
1 = awareness only; 2 = basic vocabulary and recognition; 3 = can do simple work with guidance; 4 = can independently handle routine work; 5 = reliable intermediate across common situations; 6 = handles non-routine complexity; 7 = advanced, diagnoses and teaches; 8 = deep expert across difficult contexts; 9 = recognized authority with exceptional breadth; 10 = field-shaping mastery. Most working practitioners should fall between 3 and 7.

USER CONTEXT
${JSON.stringify(context, null, 2)}

<skill_to_assess>
${skillDescription.trim()}
</skill_to_assess>

When the interview is complete, return JSON only, without markdown fences or commentary, using exactly this contract:
{
  "schemaVersion": 1,
  "skill": {
    "name": "max 100 chars",
    "category": "max 60 chars",
    "level": 1,
    "targetLevel": 5,
    "status": "learning|practicing|proven",
    "evidence": "concrete experience observed or reported, max 1000 chars",
    "assessmentSummary": "concise reason this level fits, max 320 chars",
    "strengths": ["1-5 demonstrated capabilities, each max 160 chars"],
    "gaps": ["1-5 specific limitations or next growth areas, each max 160 chars"]
  }
}`
}

function unwrapJson(raw: string): string {
  const trimmed = raw.trim()
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  return fenced?.[1] ?? trimmed
}

export function parseAiItemResponse(raw: string, expectedTarget: ItemTarget): AiItemParseResult {
  const parsed = parseBulkImport(unwrapJson(raw))
  if (parsed.status === 'invalid') return parsed

  const populated = (['skills', 'quests', 'tasks', 'resources'] as const).filter((key) => parsed.data[key].length > 0)
  if (populated.length === 0) return { status: 'invalid', reason: 'The response contains no importable items.' }
  if (populated.length !== 1 || populated[0] !== expectedTarget) {
    return { status: 'invalid', reason: `The response must contain only ${expectedTarget}.` }
  }
  if (parsed.data.profile || parsed.data.knowledgeNotes.length || parsed.data.incomeSources.length || parsed.data.cvs.length || parsed.data.advice.length || parsed.data.moneyPlan) {
    return { status: 'invalid', reason: `The response must contain only ${expectedTarget}.` }
  }
  return parsed
}

export function parseSkillAssessmentResponse(raw: string): AssessmentParseResult {
  if (raw.length > 50_000) return { status: 'invalid', reason: 'Response is too large.' }
  try {
    const parsed = assessmentSchema.safeParse(JSON.parse(unwrapJson(raw)))
    return parsed.success
      ? { status: 'valid', data: parsed.data }
      : { status: 'invalid', reason: parsed.error.issues[0]?.message ?? 'Assessment did not match the required format.' }
  } catch {
    return { status: 'invalid', reason: 'Response is not valid JSON.' }
  }
}

export function applyAiItemImport(state: AppState, data: BulkImport): AppState {
  return applyBulkImport(state, JSON.stringify(data))
}

export function applySkillAssessment(state: AppState, assessment: SkillAssessment): AppState {
  const { assessmentSummary, strengths, gaps } = assessment.skill
  const skill = { name: assessment.skill.name, category: assessment.skill.category, level: assessment.skill.level, targetLevel: assessment.skill.targetLevel, status: assessment.skill.status, evidence: assessment.skill.evidence }
  const profileId = state.activeProfileId
  const existing = state.skills.findIndex((item) => item.profileId === profileId && item.name.trim().toLocaleLowerCase() === skill.name.trim().toLocaleLowerCase())
  const item = {
    id: existing >= 0 ? state.skills[existing].id : createId(),
    profileId,
    ...skill,
    assessment: { summary: assessmentSummary, strengths, gaps },
  }
  const skills = [...state.skills]
  if (existing >= 0) skills[existing] = item
  else skills.unshift(item)
  return { ...state, skills }
}
