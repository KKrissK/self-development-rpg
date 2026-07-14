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
})
