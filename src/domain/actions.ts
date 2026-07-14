import type { AppState, NewQuest, Quest } from './model'

const id = () => crypto.randomUUID()
const now = () => new Date().toISOString()

export function createInitialState(input: { name: string; title: string }): AppState {
  const profileId = id()
  return {
    schemaVersion: 1,
    activeProfileId: profileId,
    profiles: [{ id: profileId, name: input.name.trim(), title: input.title.trim(), bio: '', level: 1, xp: 0, createdAt: now() }],
    skills: [],
    quests: [],
    resources: [],
    incomeSources: [],
    moneyPlan: { monthlyTarget: 0, monthlyExpenses: 0, savingsGoal: 0, currency: 'HUF' },
    cvs: [],
    knowledgeNotes: [],
    advice: [],
    theme: 'dark',
  }
}

export function addQuest(state: AppState, quest: NewQuest): AppState {
  const item: Quest = {
    id: id(),
    profileId: state.activeProfileId,
    title: quest.title.trim(),
    notes: quest.notes?.trim() ?? '',
    priority: quest.priority,
    status: quest.status,
    xp: quest.xp,
    skillId: quest.skillId,
    dueDate: quest.dueDate,
  }
  return { ...state, quests: [item, ...state.quests] }
}

export function completeQuest(state: AppState, questId: string): AppState {
  const quest = state.quests.find((item) => item.id === questId)
  if (!quest || quest.status === 'done') return state
  const quests = state.quests.map((item) => item.id === questId ? { ...item, status: 'done' as const, completedAt: now() } : item)
  const profiles = state.profiles.map((profile) => {
    if (profile.id !== quest.profileId) return profile
    const xp = profile.xp + quest.xp
    return { ...profile, xp, level: Math.floor(xp / 100) + 1 }
  })
  return { ...state, quests, profiles }
}
