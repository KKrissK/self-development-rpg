import { z } from 'zod'

const profile = z.object({ id: z.string().min(1), name: z.string().min(1).max(80), title: z.string().max(100), bio: z.string().max(1000), level: z.number().int().min(1), xp: z.number().int().min(0), createdAt: z.string() })
const skillAssessment = z.object({ summary: z.string().min(1).max(1000), strengths: z.array(z.string().min(1).max(200)).max(8), gaps: z.array(z.string().min(1).max(200)).max(8), confidence: z.enum(['low', 'medium', 'high']).optional() })
const skill = z.object({ id: z.string(), profileId: z.string(), name: z.string().min(1).max(100), category: z.string().max(60), level: z.number().int().min(1).max(10), status: z.enum(['learning', 'practicing', 'proven']), evidence: z.string().max(1000), assessment: skillAssessment.optional() })
const quest = z.object({ id: z.string(), profileId: z.string(), title: z.string().min(1).max(160), notes: z.string().max(2000), priority: z.enum(['low', 'medium', 'high']), status: z.enum(['now', 'next', 'later', 'done']), xp: z.number().int().min(0).max(100), skillId: z.string().optional(), skillIds: z.array(z.string()).max(20).optional(), resourceIds: z.array(z.string()).max(50).optional(), dueDate: z.string().optional(), completedAt: z.string().optional(), xpAwardedAt: z.string().optional() })
const goalTask = z.object({ id: z.string(), profileId: z.string(), goalId: z.string(), title: z.string().min(1).max(200), notes: z.string().max(2000), status: z.enum(['todo', 'in-progress', 'done']), dueDate: z.string().max(10).optional(), createdAt: z.string(), completedAt: z.string().optional() })
const resource = z.object({ id: z.string(), profileId: z.string(), title: z.string().min(1).max(200), kind: z.enum(['book', 'video', 'course', 'article', 'podcast', 'other']), status: z.enum(['queued', 'in-progress', 'completed']), creator: z.string().max(120), url: z.string().max(1000).refine((value) => !value || /^https?:\/\//i.test(value), 'Only HTTP(S) links are supported.'), skillId: z.string().optional(), notes: z.string().max(2000) })
const income = z.object({ id: z.string(), profileId: z.string(), name: z.string().min(1).max(120), type: z.string().max(80), monthlyAmount: z.number().min(0), currency: z.string().min(3).max(4), active: z.boolean() })
const cvAttachment = z.object({ id: z.string().min(1), fileName: z.string().min(1).max(255), mimeType: z.string().max(200), size: z.number().int().min(1).max(20_000_000), storedAt: z.string() })
const cv = z.object({ id: z.string(), profileId: z.string(), name: z.string(), employer: z.string(), role: z.string(), language: z.enum(['English', 'Hungarian', 'Other']), status: z.enum(['draft', 'ready', 'sent', 'archived']), fileName: z.string(), attachment: cvAttachment.optional(), notes: z.string(), updatedAt: z.string() })
const knowledgeNote = z.object({ id: z.string(), profileId: z.string(), title: z.string().min(1).max(160), body: z.string().max(5000), tags: z.array(z.string().min(1).max(40)).max(20), createdAt: z.string() })
const advice = z.object({ id: z.string(), profileId: z.string(), title: z.string(), rationale: z.string(), nextStep: z.string(), impact: z.enum(['low', 'medium', 'high']), importedAt: z.string() })
const achievementImage = z.object({ id: z.string().min(1), fileName: z.string().min(1).max(255), mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']), size: z.number().int().min(1).max(10_000_000), storedAt: z.string() })
const achievement = z.object({ id: z.string(), profileId: z.string(), title: z.string().min(1).max(160), kind: z.enum(['project', 'milestone', 'award', 'certification', 'contribution', 'other']), description: z.string().max(3000), url: z.string().max(1000).refine((value) => !value || /^https?:\/\//i.test(value), 'Only HTTP(S) links are supported.'), achievedAt: z.string().max(10).optional(), skillId: z.string().optional(), skillIds: z.array(z.string()).max(20).optional(), image: achievementImage.optional(), createdAt: z.string() })

export const appStateSchema = z.object({
  schemaVersion: z.literal(1),
  activeProfileId: z.string(),
  profiles: z.array(profile).min(1).max(10),
  skills: z.array(skill).max(500),
  quests: z.array(quest).max(2000),
  tasks: z.array(goalTask).max(10000).default([]),
  resources: z.array(resource).max(1000),
  incomeSources: z.array(income).max(100),
  moneyPlan: z.object({ monthlyTarget: z.number().min(0), monthlyExpenses: z.number().min(0), savingsGoal: z.number().min(0), currency: z.string().min(3).max(4) }),
  cvs: z.array(cv).max(500),
  knowledgeNotes: z.array(knowledgeNote).max(2000).default([]),
  advice: z.array(advice).max(500),
  achievements: z.array(achievement).max(1000).default([]),
  theme: z.enum(['light', 'dark']),
}).superRefine((state, context) => {
  const profileIds = new Set(state.profiles.map((item) => item.id))
  if (!profileIds.has(state.activeProfileId)) context.addIssue({ code: 'custom', path: ['activeProfileId'], message: 'Active profile does not exist.' })

  const collections = [state.profiles, state.skills, state.quests, state.tasks, state.resources, state.incomeSources, state.cvs, state.knowledgeNotes, state.advice, state.achievements]
  const ids = collections.flatMap((items) => items.map((item) => item.id))
  if (new Set(ids).size !== ids.length) context.addIssue({ code: 'custom', path: ['id'], message: 'Entity IDs must be unique.' })

  const owned = [state.skills, state.quests, state.tasks, state.resources, state.incomeSources, state.cvs, state.knowledgeNotes, state.advice, state.achievements]
  for (const items of owned) for (const item of items) {
    if (!profileIds.has(item.profileId)) context.addIssue({ code: 'custom', path: ['profileId'], message: 'Entity owner does not exist.' })
  }
  const skillIds = new Set(state.skills.map((item) => item.id))
  for (const item of [...state.quests, ...state.resources, ...state.achievements]) {
    if (item.skillId && !skillIds.has(item.skillId)) context.addIssue({ code: 'custom', path: ['skillId'], message: 'Referenced skill does not exist.' })
  }
  for (const item of [...state.quests, ...state.achievements]) for (const skillId of item.skillIds ?? []) {
    if (!skillIds.has(skillId)) context.addIssue({ code: 'custom', path: ['skillIds'], message: 'Referenced skill does not exist.' })
  }
  const resourceIds = new Set(state.resources.map((item) => item.id))
  for (const goal of state.quests) for (const resourceId of goal.resourceIds ?? []) {
    if (!resourceIds.has(resourceId)) context.addIssue({ code: 'custom', path: ['resourceIds'], message: 'Referenced library item does not exist.' })
  }
  const goalIds = new Set(state.quests.map((item) => item.id))
  for (const task of state.tasks) if (!goalIds.has(task.goalId)) context.addIssue({ code: 'custom', path: ['goalId'], message: 'Referenced Goal does not exist.' })
})
