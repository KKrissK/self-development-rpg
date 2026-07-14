import { describe, expect, it } from 'vitest'
import { buildCvTuningPrompt } from './cvTuning'

describe('CV tuning prompt', () => {
  it('includes skill evidence and protects against invented CV claims', () => {
    const prompt = buildCvTuningPrompt({
      profile: { name: 'Kris', title: 'QA engineer', bio: 'Automation-focused.' },
      cv: { name: 'QA CV', employer: '', role: 'Senior QA', language: 'English', notes: '', fileName: 'qa.pdf', attachment: undefined },
      skills: [{ name: 'Playwright', category: 'Testing', level: 5, targetLevel: 7, status: 'practicing', evidence: 'Built dashboard filtering tests.', assessment: { summary: 'Independent routine work.', strengths: ['API-first judgment'], gaps: ['Advanced flakiness diagnosis'] } }],
      target: 'Senior QA role using Playwright',
      instructions: 'One page if possible.',
    })

    expect(prompt).toContain('Built dashboard filtering tests.')
    expect(prompt).toContain('Senior QA role using Playwright')
    expect(prompt).toContain('Never invent')
    expect(prompt).toContain('Never print numeric levels')
    expect(prompt).toContain('ask me for it and stop')
  })
})
