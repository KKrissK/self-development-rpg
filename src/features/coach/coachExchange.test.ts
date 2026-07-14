import { describe, expect, it } from 'vitest'
import { buildCoachPrompt, parseCoachResponse } from './coachExchange'

const context = {
  profile: { name: 'Kris', title: 'Builder', bio: '' },
  skills: [{ name: 'TypeScript', category: 'Technical', level: 5, status: 'practicing', experience: 'Built React tools.', assessmentSummary: 'Reliable routine work.', strengths: ['API design'], growthAreas: ['Performance diagnosis'] }],
  currentGoals: [{ title: 'Ship alpha', notes: 'Finish core flow', status: 'now', priority: 'high', relatedSkill: 'TypeScript', supportingLibraryItems: [] }],
  currentLibrary: [{ title: 'Effective TypeScript', kind: 'book', status: 'queued', relatedSkill: 'TypeScript' }],
}

describe('AI coach exchange', () => {
  it('builds a portable prompt with connected skill, goal, and library context', () => {
    const prompt = buildCoachPrompt(context)
    expect(prompt).toContain('Return JSON only')
    expect(prompt).toContain('Built React tools.')
    expect(prompt).toContain('Ship alpha')
    expect(prompt).toContain('Effective TypeScript')
    expect(prompt).toContain('supportsGoalTitle')
  })

  it('accepts goal and library recommendations and rejects malformed responses', () => {
    const valid = JSON.stringify({
      schemaVersion: 1,
      summary: 'Focus your next week.',
      recommendations: [
        { title: 'Build one component', rationale: 'Creates evidence', nextStep: 'Work for 45 minutes', impact: 'high', kind: 'goal', xp: 20 },
        { title: 'TypeScript handbook', rationale: 'Targets the gap', nextStep: 'Read narrowing chapter', impact: 'medium', kind: 'library', resourceKind: 'book', creator: 'Microsoft', url: '', skillName: 'TypeScript', supportsGoalTitle: 'Ship alpha' },
      ],
    })
    expect(parseCoachResponse(valid).status).toBe('valid')
    expect(parseCoachResponse(`Itt az eredmény:\n\`\`\`json\n${valid}\n\`\`\`\nKész.`).status).toBe('valid')
    expect(parseCoachResponse('not json').status).toBe('invalid')
    expect(parseCoachResponse('x'.repeat(50001)).status).toBe('invalid')
  })
})
