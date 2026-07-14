import { describe, expect, it } from 'vitest'
import { addQuest, completeQuest, createInitialState, setQuestStatus } from './actions'

describe('career state actions', () => {
  it('creates a versioned workspace for the first character', () => {
    const state = createInitialState({ name: 'Kris', title: 'Builder' })

    expect(state.schemaVersion).toBe(1)
    expect(state.profiles).toHaveLength(1)
    expect(state.profiles[0]).toMatchObject({ name: 'Kris', title: 'Builder', level: 1, xp: 0 })
    expect(state.activeProfileId).toBe(state.profiles[0].id)
  })

  it('adds a quest and awards xp only when it is completed', () => {
    const initial = createInitialState({ name: 'Kris', title: 'Builder' })
    const withQuest = addQuest(initial, {
      title: 'Ship the first slice',
      priority: 'high',
      status: 'now',
      xp: 25,
    })
    const completed = completeQuest(withQuest, withQuest.quests[0].id)
    const completedAgain = completeQuest(completed, withQuest.quests[0].id)

    expect(withQuest.quests[0].status).toBe('now')
    expect(completed.quests[0].status).toBe('done')
    expect(completed.profiles[0].xp).toBe(25)
    expect(completedAgain.profiles[0].xp).toBe(25)
  })

  it('never awards XP again after a completed quest is reopened', () => {
    const initial = createInitialState({ name: 'Kris', title: 'Builder' })
    const withQuest = addQuest(initial, { title: 'Repeat-proof quest', priority: 'medium', status: 'now', xp: 40 })
    const questId = withQuest.quests[0].id
    const firstCompletion = completeQuest(withQuest, questId)
    const reopened = setQuestStatus(firstCompletion, questId, 'now')
    const secondCompletion = completeQuest(reopened, questId)

    expect(firstCompletion.profiles[0].xp).toBe(40)
    expect(reopened.quests[0]).toMatchObject({ status: 'now', xpAwardedAt: firstCompletion.quests[0].completedAt })
    expect(reopened.quests[0].completedAt).toBeUndefined()
    expect(secondCompletion.profiles[0].xp).toBe(40)
    expect(secondCompletion.quests[0].status).toBe('done')
  })
})
