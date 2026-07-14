import { describe, expect, it } from 'vitest'
import { createInitialState } from './actions'
import { appStateSchema } from './schema'

describe('workspace semantic integrity', () => {
  it('rejects an active profile id that does not exist', () => {
    const state = createInitialState({ name: 'Kris', title: 'Builder' })
    expect(appStateSchema.safeParse({ ...state, activeProfileId: 'missing' }).success).toBe(false)
  })

  it('rejects duplicate entity ids and orphaned profile ownership', () => {
    const state = createInitialState({ name: 'Kris', title: 'Builder' })
    const quest = { id: 'same', profileId: 'missing', title: 'One', notes: '', priority: 'medium', status: 'now', xp: 15 }
    expect(appStateSchema.safeParse({ ...state, quests: [quest, { ...quest, title: 'Two' }] }).success).toBe(false)
  })

  it('accepts multiple achievement skills and rejects missing links', () => {
    const state = createInitialState({ name: 'Kris', title: 'Builder' })
    state.skills.push(
      { id: 'java', profileId: state.activeProfileId, name: 'Java', category: 'Development', level: 4, status: 'practicing', evidence: '' },
      { id: 'qa', profileId: state.activeProfileId, name: 'QA automation', category: 'Testing', level: 3, status: 'practicing', evidence: '' },
    )
    const achievement = { id: 'achievement', profileId: state.activeProfileId, title: 'Automation suite', kind: 'project' as const, description: '', url: '', skillId: 'java', skillIds: ['java', 'qa'], createdAt: new Date().toISOString() }
    expect(appStateSchema.safeParse({ ...state, achievements: [achievement] }).success).toBe(true)
    expect(appStateSchema.safeParse({ ...state, achievements: [{ ...achievement, skillIds: ['java', 'missing'] }] }).success).toBe(false)
  })
})
