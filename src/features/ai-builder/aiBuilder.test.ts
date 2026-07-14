import { describe, expect, it } from 'vitest'
import { createInitialState } from '../../domain/actions'
import {
  applyAiItemImport,
  applySkillAssessment,
  buildItemPrompt,
  buildSkillAssessmentPrompt,
  parseAiItemResponse,
  parseSkillAssessmentResponse,
} from './aiBuilder'

const context = {
  profile: { title: 'Frontend developer', bio: 'Builds small web apps.' },
  existingSkills: [{ name: 'React', level: 4 }],
}

describe('portable contextual AI imports', () => {
  it('builds a narrow portable item prompt from plain language', () => {
    const prompt = buildItemPrompt('skills', 'Add TypeScript and testing.', context)
    expect(prompt).toContain('<user_request>')
    expect(prompt).toContain('Add TypeScript and testing.')
    expect(prompt).toContain('"skills"')
    expect(prompt).toContain('Return JSON only')
  })

  it('accepts only the requested item collection', () => {
    const skills = JSON.stringify({ schemaVersion: 1, skills: [{ name: 'TypeScript', category: 'Technical', level: 3, targetLevel: 7, status: 'learning', evidence: 'Built a small app.' }] })
    const quests = JSON.stringify({ schemaVersion: 1, quests: [{ title: 'Ship a demo', notes: '', priority: 'high', status: 'next', xp: 20 }] })
    expect(parseAiItemResponse(skills, 'skills').status).toBe('valid')
    expect(parseAiItemResponse(quests, 'skills')).toMatchObject({ status: 'invalid', reason: 'The response must contain only skills.' })
  })

  it('imports validated items through the workspace bulk-import path', () => {
    const state = createInitialState({ name: 'Kris', title: 'Builder' })
    const result = parseAiItemResponse(JSON.stringify({ schemaVersion: 1, resources: [{ title: 'SQL guide', kind: 'book', status: 'queued', creator: '', url: '', notes: '' }] }), 'resources')
    expect(result.status).toBe('valid')
    if (result.status !== 'valid') return
    expect(applyAiItemImport(state, result.data).resources[0].title).toBe('SQL guide')
  })
})

describe('AI skill assessment exchange', () => {
  it('builds an adaptive interview prompt with a strict level rubric', () => {
    const prompt = buildSkillAssessmentPrompt('Assess my TypeScript.', context)
    expect(prompt).toContain('fixed total of 4-8 questions')
    expect(prompt).toContain('Question 2 of 6')
    expect(prompt).toContain('does not increase or reset the announced total')
    expect(prompt).toContain('1 = awareness only')
    expect(prompt).toContain('10 = field-shaping mastery')
    expect(prompt).toContain('Most working practitioners should fall between 3 and 7')
    expect(prompt).toContain('"strengths"')
    expect(prompt).toContain('"gaps"')
  })

  it('validates and imports one assessed skill with its reasoning', () => {
    const raw = JSON.stringify({ schemaVersion: 1, skill: { name: 'TypeScript', category: 'Technical', level: 2, targetLevel: 6, status: 'learning', evidence: 'Recognized basic types but could not explain narrowing.', assessmentSummary: 'Basic familiarity without independent execution.', strengths: ['Recognizes basic types'], gaps: ['Cannot yet explain narrowing'] } })
    const parsed = parseSkillAssessmentResponse(raw)
    expect(parsed.status).toBe('valid')
    if (parsed.status !== 'valid') return
    const next = applySkillAssessment(createInitialState({ name: 'Kris', title: 'Builder' }), parsed.data)
    expect(next.skills[0]).toMatchObject({ name: 'TypeScript', level: 2, targetLevel: 6 })
    expect(next.skills[0].evidence).toBe('Recognized basic types but could not explain narrowing.')
    expect(next.skills[0].assessment).toMatchObject({ strengths: ['Recognizes basic types'], gaps: ['Cannot yet explain narrowing'] })
  })

  it('keeps long assessment evidence and reasoning in separate bounded fields', () => {
    const raw = JSON.stringify({ schemaVersion: 1, skill: { name: 'TypeScript', category: 'Technical', level: 4, targetLevel: 7, status: 'practicing', evidence: 'E'.repeat(900), assessmentSummary: 'S'.repeat(900), strengths: ['Builds routine components'], gaps: ['Needs non-routine debugging practice'] } })
    const parsed = parseSkillAssessmentResponse(raw)
    expect(parsed.status).toBe('valid')
    if (parsed.status !== 'valid') return
    const next = applySkillAssessment(createInitialState({ name: 'Kris', title: 'Builder' }), parsed.data)
    expect(next.skills[0].evidence).toHaveLength(900)
    expect(next.skills[0].assessment?.summary).toHaveLength(900)
    expect(next.skills[0].assessment).not.toHaveProperty('confidence')
  })
})
