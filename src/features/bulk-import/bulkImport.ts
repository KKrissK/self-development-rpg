import { z } from 'zod'
import { createId } from '../../domain/id'
import { goalXpForPriority, priorityForGoalDifficulty } from '../../domain/goalRewards'
import type { AppState, CvVariant, GoalTask, IncomeSource, KnowledgeNote, LearningResource, Quest, Skill } from '../../domain/model'
import { extractJsonObject } from '../../platform/json'

const safeUrl = z.string().max(1000).refine((value) => !value || /^https?:\/\//i.test(value), 'Only HTTP(S) links are supported.')
const profilePatch = z.object({ name: z.string().min(1).max(80).optional(), title: z.string().max(100).optional(), bio: z.string().max(1000).optional() }).strict()
const skillInput = z.object({ name: z.string().min(1).max(100), category: z.string().max(60).default('General'), level: z.number().int().min(1).max(10), status: z.enum(['learning', 'practicing', 'proven']).default('learning'), evidence: z.string().max(1000).default('') }).strict()
const questInput = z.object({ title: z.string().min(1).max(160), notes: z.string().max(2000).default(''), priority: z.enum(['low', 'medium', 'high']).optional(), difficulty: z.enum(['easy', 'medium', 'hard']).optional(), status: z.enum(['now', 'next', 'later', 'done']).default('next'), xp: z.number().int().min(0).max(100).optional(), dueDate: z.string().max(10).optional(), skillName: z.string().max(100).optional(), skillNames: z.array(z.string().min(1).max(100)).max(10).optional() }).strict().transform((input) => { const priority = input.difficulty ? priorityForGoalDifficulty(input.difficulty) : input.priority ?? 'low'; return { ...input, priority, xp: goalXpForPriority(priority) } })
const taskInput = z.object({ title: z.string().min(1).max(200), notes: z.string().max(2000).default(''), status: z.enum(['todo', 'in-progress', 'done']).default('todo'), dueDate: z.string().max(10).optional(), goalTitle: z.string().min(1).max(160) }).strict()
const knowledgeInput = z.object({ title: z.string().min(1).max(160), body: z.string().max(5000).default(''), tags: z.array(z.string().min(1).max(40)).max(20).default([]) }).strict()
const resourceInput = z.object({ title: z.string().min(1).max(200), kind: z.enum(['book', 'video', 'course', 'article', 'podcast', 'other']), status: z.enum(['queued', 'in-progress', 'completed']).default('queued'), creator: z.string().max(120).default(''), url: safeUrl.default(''), notes: z.string().max(2000).default(''), skillName: z.string().max(100).optional() }).strict()
const incomeInput = z.object({ name: z.string().min(1).max(120), type: z.string().max(80).default(''), monthlyAmount: z.number().finite().min(0), currency: z.string().min(3).max(4).default('HUF'), active: z.boolean().default(true) }).strict()
const cvInput = z.object({ name: z.string().min(1).max(160), employer: z.string().max(160).default(''), role: z.string().max(160).default(''), language: z.enum(['English', 'Hungarian', 'Other']), status: z.enum(['draft', 'ready', 'sent', 'archived']).default('draft'), fileName: z.string().max(500).default(''), notes: z.string().max(2000).default('') }).strict()
const adviceInput = z.object({ title: z.string().min(1).max(160), rationale: z.string().max(1000).default(''), nextStep: z.string().max(500).default(''), impact: z.enum(['low', 'medium', 'high']).default('medium') }).strict()
const moneyPlanInput = z.object({ monthlyTarget: z.number().finite().min(0).optional(), monthlyExpenses: z.number().finite().min(0).optional(), savingsGoal: z.number().finite().min(0).optional(), currency: z.string().min(3).max(4).optional() }).strict()

export const bulkImportSchema = z.object({
  schemaVersion: z.literal(1),
  profile: profilePatch.optional(),
  skills: z.array(skillInput).max(100).default([]),
  quests: z.array(questInput).max(200).default([]),
  tasks: z.array(taskInput).max(500).default([]),
  knowledgeNotes: z.array(knowledgeInput).max(200).default([]),
  resources: z.array(resourceInput).max(200).default([]),
  incomeSources: z.array(incomeInput).max(50).default([]),
  cvs: z.array(cvInput).max(100).default([]),
  advice: z.array(adviceInput).max(100).default([]),
  moneyPlan: moneyPlanInput.optional(),
}).strict()

export type BulkImport = z.infer<typeof bulkImportSchema>
export type BulkSummary = { skills: number; quests: number; tasks: number; knowledgeNotes: number; resources: number; incomeSources: number; cvs: number; advice: number }
export type BulkParseResult = { status: 'valid'; data: BulkImport; summary: BulkSummary } | { status: 'invalid'; reason: string }

const summarize = (data: BulkImport): BulkSummary => ({ skills: data.skills.length, quests: data.quests.length, tasks: data.tasks.length, knowledgeNotes: data.knowledgeNotes.length, resources: data.resources.length, incomeSources: data.incomeSources.length, cvs: data.cvs.length, advice: data.advice.length })

export function parseBulkImport(raw: string): BulkParseResult {
  if (raw.length > 200_000) return { status: 'invalid', reason: 'Import is larger than 200 KB.' }
  try {
    const result = bulkImportSchema.safeParse(JSON.parse(extractJsonObject(raw)))
    return result.success ? { status: 'valid', data: result.data, summary: summarize(result.data) } : { status: 'invalid', reason: result.error.issues[0]?.message ?? 'Import did not match the required format.' }
  } catch { return { status: 'invalid', reason: 'Import is not valid JSON.' } }
}

export function applyBulkImport(state: AppState, raw: string, makeId: () => string = createId): AppState {
  const parsed = parseBulkImport(raw)
  if (parsed.status === 'invalid') throw new Error(parsed.reason)
  const data = parsed.data
  const profileId = state.activeProfileId
  const timestamp = new Date().toISOString()
  const profiles = state.profiles.map((profile) => profile.id === profileId ? { ...profile, ...data.profile } : profile)

  const skills = [...state.skills]
  for (const input of data.skills) {
    const existing = skills.findIndex((skill) => skill.profileId === profileId && skill.name.trim().toLocaleLowerCase() === input.name.trim().toLocaleLowerCase())
    const item: Skill = { id: existing >= 0 ? skills[existing].id : makeId(), profileId, ...input }
    if (existing >= 0) skills[existing] = item
    else skills.unshift(item)
  }
  const skillId = (name?: string) => name ? skills.find((skill) => skill.profileId === profileId && skill.name.toLocaleLowerCase() === name.toLocaleLowerCase())?.id : undefined

  const quests: Quest[] = [...data.quests.map((input) => {
    const skillIds = [...new Set((input.skillNames ?? (input.skillName ? [input.skillName] : [])).map((name) => skillId(name)).filter((id): id is string => Boolean(id)))]
    return { id: makeId(), profileId, title: input.title, notes: input.notes, priority: input.priority, status: input.status, xp: goalXpForPriority(input.priority), dueDate: input.dueDate, skillId: skillIds[0], skillIds }
  }), ...state.quests]
  const goalId = (title: string) => quests.find((goal) => goal.profileId === profileId && goal.title.trim().toLocaleLowerCase() === title.trim().toLocaleLowerCase())?.id
  const tasks: GoalTask[] = [...data.tasks.map((input) => {
    const resolvedGoalId = goalId(input.goalTitle)
    if (!resolvedGoalId) throw new Error(`The Goal “${input.goalTitle}” does not exist. Create it before importing its tasks.`)
    return { id: makeId(), profileId, goalId: resolvedGoalId, title: input.title, notes: input.notes, status: input.status, dueDate: input.dueDate, createdAt: timestamp, completedAt: input.status === 'done' ? timestamp : undefined }
  }), ...state.tasks]
  const knowledgeNotes: KnowledgeNote[] = [...data.knowledgeNotes.map((input) => ({ id: makeId(), profileId, ...input, createdAt: timestamp })), ...(state.knowledgeNotes ?? [])]
  const resources: LearningResource[] = [...data.resources.map((input) => ({ id: makeId(), profileId, title: input.title, kind: input.kind, status: input.status, creator: input.creator, url: input.url, notes: input.notes, skillId: skillId(input.skillName) })), ...state.resources]
  const incomeSources: IncomeSource[] = [...data.incomeSources.map((input) => ({ id: makeId(), profileId, ...input })), ...state.incomeSources]
  const cvs: CvVariant[] = [...data.cvs.map((input) => ({ id: makeId(), profileId, ...input, updatedAt: timestamp })), ...state.cvs]
  const advice = [...data.advice.map((input) => ({ id: makeId(), profileId, ...input, importedAt: timestamp })), ...state.advice]

  return { ...state, profiles, skills, quests, tasks, knowledgeNotes, resources, incomeSources, cvs, advice, moneyPlan: data.moneyPlan ? { ...state.moneyPlan, ...data.moneyPlan } : state.moneyPlan }
}

export const bulkImportTemplate = JSON.stringify({
  schemaVersion: 1,
  profile: { title: 'Role or direction', bio: 'Short bio' },
  skills: [{ name: 'Example skill', category: 'Category', level: 3, status: 'learning', evidence: 'Evidence or experience' }],
  quests: [{ title: 'Concrete next action', notes: '', difficulty: 'easy', status: 'next', skillNames: ['Example skill'] }],
  tasks: [{ title: 'First practical step', notes: '', status: 'todo', goalTitle: 'Concrete next action' }],
  knowledgeNotes: [{ title: 'What I know', body: 'Reusable knowledge note', tags: ['topic'] }],
  resources: [{ title: 'Resource title', kind: 'book', status: 'queued', creator: '', url: '', notes: '', skillName: 'Example skill' }],
  incomeSources: [{ name: 'Income source', type: 'Employment', monthlyAmount: 0, currency: 'HUF', active: true }],
  cvs: [{ name: 'CV name', employer: '', role: '', language: 'English', status: 'draft', fileName: '', notes: '' }],
  advice: [{ title: 'Advice title', rationale: '', nextStep: '', impact: 'medium' }],
  moneyPlan: { monthlyTarget: 0, monthlyExpenses: 0, savingsGoal: 0, currency: 'HUF' },
}, null, 2)
