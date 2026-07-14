import { describe, expect, it } from 'vitest'
import { buildCoachPrompt, parseCoachResponse } from './coachExchange'

const context = {
  profile: { name: 'Kris', title: 'Builder' },
  skills: [{ name: 'TypeScript', level: 5, targetLevel: 8 }],
  currentQuests: ['Ship alpha'],
}

describe('AI coach exchange', () => {
  it('builds a portable prompt with an explicit response contract', () => {
    const prompt = buildCoachPrompt(context)
    expect(prompt).toContain('Return JSON only')
    expect(prompt).toContain('TypeScript')
    expect(prompt).toContain('schemaVersion')
  })

  it('accepts bounded valid advice and rejects malformed responses', () => {
    const valid = JSON.stringify({
      schemaVersion: 1,
      summary: 'Focus your next week.',
      recommendations: [{ title: 'Build one component', rationale: 'Creates evidence', nextStep: 'Work for 45 minutes', impact: 'high', kind: 'quest', xp: 20 }],
    })
    expect(parseCoachResponse(valid).status).toBe('valid')
    expect(parseCoachResponse('not json').status).toBe('invalid')
    expect(parseCoachResponse('x'.repeat(50001)).status).toBe('invalid')
  })
})
