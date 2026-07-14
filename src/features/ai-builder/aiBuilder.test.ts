import { describe, expect, it } from 'vitest'
import { createInitialState } from '../../domain/actions'
import {
  applyAiItemImport,
  applySkillAssessment,
  buildItemPrompt,
  buildQuickSkillEstimatePrompt,
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

  it('anchors an AI-generated goal to all selected overlapping skills', () => {
    const prompt = buildItemPrompt('quests', 'Give me a useful next outcome.', {
      ...context,
      focusSkills: [
        { name: 'Java', level: 4, evidence: 'Builds services.', strengths: ['OOP'], growthAreas: ['Testing'] },
        { name: 'QA automation', level: 3, evidence: 'Writes Java test suites.', strengths: ['Test design'], growthAreas: ['Framework design'] },
      ],
    })
    expect(prompt).toContain('"focusSkills"')
    expect(prompt).toContain('"name": "Java"')
    expect(prompt).toContain('"name": "QA automation"')
    expect(prompt).toContain('return every focusSkills name exactly in skillNames')
  })

  it('accepts an AI response wrapped in Hungarian commentary', () => {
    const wrapped = 'Íme a kért válasz:\n```json\n{"schemaVersion":1,"skills":[{"name":"SQL","category":"Adat","level":3,"status":"learning","evidence":"Egyszerű lekérdezések"}]}\n```\nRemélem, hasznos.'
    expect(parseAiItemResponse(wrapped, 'skills').status).toBe('valid')
  })

  it('accepts only the requested item collection', () => {
    const skills = JSON.stringify({ schemaVersion: 1, skills: [{ name: 'TypeScript', category: 'Technical', level: 3, status: 'learning', evidence: 'Built a small app.' }] })
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

  it('plans Goal Tasks from recorded skill level and evidence', () => {
    const taskContext = {
      ...context,
      existingSkills: [{ name: 'Java', level: 4, evidence: 'Maintains Spring services independently.', strengths: ['Routine API work'], growthAreas: ['Concurrency'] }],
      selectedGoal: { title: 'Improve Java skills', notes: 'Become reliable on non-routine backend work.', dueDate: '2026-08-01', linkedSkill: { name: 'Java', level: 4, evidence: 'Maintains Spring services independently.', strengths: ['Routine API work'], growthAreas: ['Concurrency'] }, linkedSkills: [{ name: 'Java', level: 4, evidence: 'Maintains Spring services independently.', strengths: ['Routine API work'], growthAreas: ['Concurrency'] }], supportingResources: [{ title: 'Java Concurrency in Practice', kind: 'book', status: 'queued' }], existingTasks: [{ title: 'Review thread basics', notes: '', status: 'todo' }] },
    }
    const prompt = buildItemPrompt('tasks', 'Use practical projects.', taskContext)
    expect(prompt).toContain('Improve Java skills')
    expect(prompt).toContain('Maintains Spring services independently.')
    expect(prompt).toContain('Java Concurrency in Practice')
    expect(prompt).toContain('Review thread basics')
    expect(prompt).toContain('2026-08-01')
    expect(prompt).toContain('"level": 4')
    expect(prompt).toContain('do not assume missing ability')
    expect(prompt).toContain('avoid duplicating existing Tasks')

    const state = createInitialState({ name: 'Kris', title: 'Builder' })
    state.quests.push({ id: 'goal-java', profileId: state.activeProfileId, title: 'Improve Java skills', notes: '', priority: 'medium', status: 'now', xp: 30 })
    const parsed = parseAiItemResponse(JSON.stringify({ schemaVersion: 1, tasks: [{ title: 'Build a concurrent worker', notes: 'Explain synchronization choices.', status: 'todo', goalTitle: 'Improve Java skills' }] }), 'tasks')
    expect(parsed.status).toBe('valid')
    if (parsed.status !== 'valid') return
    const imported = applyAiItemImport(state, parsed.data)
    expect(imported.tasks[0]).toMatchObject({ goalId: 'goal-java', title: 'Build a concurrent worker', status: 'todo' })
  })
})

describe('AI skill assessment exchange', () => {
  it('builds a fast experience estimate without a knowledge test', () => {
    const prompt = buildQuickSkillEstimatePrompt('Estimate my Java skill.', context)
    expect(prompt).toContain('one compact batch of 5-8 easy questions')
    expect(prompt).toContain('yes/no, multiple-choice, a number, or a few-word answer')
    expect(prompt).toContain('Do not ask trivia, theory quizzes, coding questions, or practical tests')
    expect(prompt).toContain('self-reported exposure, not proof of mastery')
    expect(prompt).toContain('1 = awareness only')
    expect(prompt).toContain('10 = field-shaping mastery')
  })

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
    const raw = JSON.stringify({ schemaVersion: 1, skill: { name: 'TypeScript', category: 'Technical', level: 2, status: 'learning', evidence: 'Recognized basic types but could not explain narrowing.', assessmentSummary: 'Basic familiarity without independent execution.', strengths: ['Recognizes basic types'], gaps: ['Cannot yet explain narrowing'] } })
    const parsed = parseSkillAssessmentResponse(raw)
    expect(parsed.status).toBe('valid')
    if (parsed.status !== 'valid') return
    const next = applySkillAssessment(createInitialState({ name: 'Kris', title: 'Builder' }), parsed.data)
    expect(next.skills[0]).toMatchObject({ name: 'TypeScript', level: 2 })
    expect(next.skills[0].evidence).toBe('Recognized basic types but could not explain narrowing.')
    expect(next.skills[0].assessment).toMatchObject({ strengths: ['Recognizes basic types'], gaps: ['Cannot yet explain narrowing'] })
  })

  it('keeps long assessment evidence and reasoning in separate bounded fields', () => {
    const raw = JSON.stringify({ schemaVersion: 1, skill: { name: 'TypeScript', category: 'Technical', level: 4, status: 'practicing', evidence: 'E'.repeat(900), assessmentSummary: 'S'.repeat(900), strengths: ['Builds routine components'], gaps: ['Needs non-routine debugging practice'] } })
    const parsed = parseSkillAssessmentResponse(raw)
    expect(parsed.status).toBe('valid')
    if (parsed.status !== 'valid') return
    const next = applySkillAssessment(createInitialState({ name: 'Kris', title: 'Builder' }), parsed.data)
    expect(next.skills[0].evidence).toHaveLength(900)
    expect(next.skills[0].assessment?.summary).toHaveLength(900)
    expect(next.skills[0].assessment).not.toHaveProperty('confidence')
  })
})
