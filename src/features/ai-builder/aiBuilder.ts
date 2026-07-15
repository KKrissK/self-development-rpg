import { z } from 'zod'
import type { AppState } from '../../domain/model'
import { createId } from '../../domain/id'
import { applyBulkImport, parseBulkImport, type BulkImport, type BulkSummary } from '../bulk-import/bulkImport'
import { extractJsonObject } from '../../platform/json'

export type ItemTarget = 'skills' | 'quests' | 'tasks' | 'resources'

export interface AiBuilderContext {
  profile: { title: string; bio: string }
  financialSnapshot?: { currentMonthlyIncome: number; currency: string; monthlyTarget: number; monthlyExpenses: number; savingsGoal: number; activeIncomeSources: { name: string; type: string; monthlyAmount: number; currency: string }[] }
  existingSkills: { name: string; level: number; evidence?: string; assessmentSummary?: string; strengths?: string[]; growthAreas?: string[] }[]
  existingGoals?: { title: string; status: string; skillNames?: string[] }[]
  selectedGoal?: { title: string; notes: string; dueDate?: string; linkedSkill: AiBuilderContext['existingSkills'][number] | null; linkedSkills?: AiBuilderContext['existingSkills']; supportingResources?: { title: string; kind: string; status: string; notes?: string }[]; existingTasks?: { title: string; notes: string; status: string; dueDate?: string }[] }
  focusSkills?: AiBuilderContext['existingSkills']
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
    { "name": "max 100 chars", "category": "max 60 chars", "level": 1, "status": "learning|practicing|proven", "evidence": "max 1000 chars" }
  ]
}`,
  quests: `{
  "schemaVersion": 1,
  "quests": [
    { "title": "max 160 chars", "notes": "max 2000 chars", "difficulty": "easy|medium|hard", "status": "now|next|later", "skillNames": ["optional exact existing skill names"] }
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
Create one or more ${labels[target]} from the request between <user_request> tags. Preserve the user's intent, use concise language, and do not invent experience, credentials, completed work, problems, or links. For skills, treat self-described ability conservatively and put only stated experience in evidence. For goals, make each outcome broad enough to contain several tasks but still observable and finishable, then choose easy, medium, or hard honestly; never supply XP because the app calculates it. For resources, only include a URL when you are confident it is real; otherwise use an empty string.

GOAL SKILL-LINKING RULES
1. Existing skills are background context, not automatically relevant to a new Goal. Do not put a name in skillNames merely because that skill could plausibly be used.
2. Link a skill only when the user's request explicitly commits to using or improving it, or the user confirms it through the clarification process. Otherwise return an empty skillNames array or omit it.
3. Do not infer an implementation choice from the user's inventory. For example, "build a carrier tracking app" does not imply Java just because Java exists in USER CONTEXT; the app could use another stack.
4. If a missing implementation, domain, or capability choice would materially change the Goal or its skill links, ask about it in the single numbered clarification batch before returning JSON.
5. When USER CONTEXT contains focusSkills, the user already selected those skills explicitly. In that case, create a general improvement Goal combining the selected overlapping skills, use every selected skill's recorded experience and growth areas without aiming for a numeric level, and return every focusSkills name exactly in skillNames for every returned Goal.

TASK VALIDITY RULES
When creating tasks, derive the plan entirely from selectedGoal: its outcome, notes, deadline, all linked skill evidence and assessments, supporting Library resources, and existing Tasks.
1. First test whether each proposed task addresses a current, evidenced need and has a plausible causal link to completing the selected Goal. A linked skill is context, not proof that it needs improvement.
2. Never invent cleanup, reliability, documentation, practice, portfolio, certification, networking, or maintenance work merely because it is commonly useful. For example, do not propose improving reliable Jenkins jobs unless the user identifies a current reliability problem or that work is demonstrably required by the Goal.
3. For salary, promotion, or career-change Goals, distinguish controllable actions from the desired outcome. Use financialSnapshot as the known current financial baseline. Never ask for the current monthly income, target, expenses, savings goal, currency, or income-source details when that value is already present there. Ask only for genuinely missing context such as whether an entered amount is net or gross when that distinction materially affects the plan, the actual blocker, employer situation, market, target role, negotiation timing, and evidence needed. Do not substitute unrelated technical busywork for a career strategy.
4. Compare proposals against existing Tasks and stated completed capabilities. Remove duplicates and work that the context indicates is already solved.
5. Every task must state why it advances the Goal and include an observable definition of done. Create the smallest realistic ordered path; do not pad the list.
6. Do not assume missing ability or a current problem from silence. If validity depends on unknown current-state facts, use the clarification process below before producing JSON.
7. Use the selected Goal title exactly in every goalTitle.

CLARIFICATION PROCESS
If material information is missing or a proposal would rely on an assumption, do not output JSON yet. Ask one compact batch of 2-7 numbered questions in a single message, ordered by importance. Make each question easy to answer in the same numbered format and offer choices, "Not sure", or "Not applicable" where useful. Explain in one sentence that the answers prevent irrelevant tasks. Never ask questions one at a time and never start a second interview loop. After the user's one reply, make conservative assumptions for anything still unknown and return the final JSON. If no clarification is materially needed, return the final JSON immediately.

USER CONTEXT
${JSON.stringify(context, null, 2)}

<user_request>
${request.trim()}
</user_request>

When ready to produce the final result: Return JSON only, with no markdown fences, explanation, or extra keys. Return 1-20 items using exactly this contract:
${contracts[target]}`
}

export function buildSkillAssessmentPrompt(skillDescription: string, context: AiBuilderContext): string {
  return `Act as a candid skill assessor. Your job is to estimate demonstrated current ability, not protect the user's feelings and not reward confidence, vocabulary, credentials, or years of exposure by themselves.

Assess exactly one skill described between <skill_to_assess> tags. Ask one compact batch of 4-8 numbered questions, then wait for one reply:
1. Include concrete experience questions, at least one practical scenario, and one small knowledge or judgment check appropriate to the skill.
2. Distinguish recognition from independent execution and ask for examples where useful.
3. Make every question easy to answer in one numbered response. Include choices, "Not sure", and "Not applicable" where useful.
4. Never ask questions one at a time. Ask at most one short clarification after the user's reply, and only when a missing answer would materially change the assessment.
5. Otherwise, after the user's single reply, say the assessment is complete and output the final JSON. Do not reveal a score or output JSON earlier.

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
    "status": "learning|practicing|proven",
    "evidence": "concrete experience observed or reported, max 1000 chars",
    "assessmentSummary": "concise reason this level fits, max 320 chars",
    "strengths": ["1-5 demonstrated capabilities, each max 160 chars"],
    "gaps": ["1-5 specific limitations or next growth areas, each max 160 chars"]
  }
}`
}

export function buildQuickSkillEstimatePrompt(skillDescription: string, context: AiBuilderContext): string {
  return `Act as a quick, conservative skill-level estimator. Estimate demonstrated current ability without running a knowledge test or asking the user to perform exercises.

Assess exactly one skill described between <skill_to_estimate> tags. Ask one compact batch of 5-8 easy questions, then wait for one reply:
1. Prefer yes/no, multiple-choice, a number, or a few-word answer.
2. Ask how long and how recently the user has used the skill, and how often they use it.
3. Ask whether they have seen, tried, or independently completed several representative activities at beginner, routine, and advanced levels for this specific skill.
4. Ask about real projects, work, outcomes, and whether they needed guidance. Do not ask trivia, theory quizzes, coding questions, or practical tests.
5. Make each question easy to answer in a numbered list. Include "Not sure" and "Not applicable" where useful.
6. After the user's single reply, ask at most one short clarification only if a missing answer would materially change the estimate. Otherwise output the final JSON immediately.
7. Treat yes answers as self-reported exposure, not proof of mastery. Score conservatively and explain uncertainty in the assessment summary.

Use this 1-10 rubric strictly:
1 = awareness only; 2 = basic vocabulary and recognition; 3 = can do simple work with guidance; 4 = can independently handle routine work; 5 = reliable intermediate across common situations; 6 = handles non-routine complexity; 7 = advanced, diagnoses and teaches; 8 = deep expert across difficult contexts; 9 = recognized authority with exceptional breadth; 10 = field-shaping mastery. Most working practitioners should fall between 3 and 7.

USER CONTEXT
${JSON.stringify(context, null, 2)}

<skill_to_estimate>
${skillDescription.trim()}
</skill_to_estimate>

After the answers, return JSON only, without markdown fences or commentary, using exactly this contract:
{
  "schemaVersion": 1,
  "skill": {
    "name": "max 100 chars",
    "category": "max 60 chars",
    "level": 1,
    "status": "learning|practicing|proven",
    "evidence": "concise self-reported experience, max 1000 chars",
    "assessmentSummary": "concise estimate and uncertainty, max 1000 chars",
    "strengths": ["1-5 likely capabilities supported by answers, each max 200 chars"],
    "gaps": ["1-5 unverified or missing capabilities, each max 200 chars"]
  }
}`
}

export function parseAiItemResponse(raw: string, expectedTarget: ItemTarget): AiItemParseResult {
  const parsed = parseBulkImport(extractJsonObject(raw))
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
    const parsed = assessmentSchema.safeParse(JSON.parse(extractJsonObject(raw)))
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
  const skill = { name: assessment.skill.name, category: assessment.skill.category, level: assessment.skill.level, status: assessment.skill.status, evidence: assessment.skill.evidence }
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
