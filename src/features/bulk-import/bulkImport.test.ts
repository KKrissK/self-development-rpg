import { describe, expect, it } from 'vitest'
import { createInitialState } from '../../domain/actions'
import { applyBulkImport, parseBulkImport } from './bulkImport'

const payload = JSON.stringify({
  schemaVersion: 1,
  profile: { title: 'QA / Software Developer', bio: 'Software engineering graduate.' },
  skills: [
    { name: 'Java', category: 'Software Development', level: 6, targetLevel: 8, status: 'practicing', evidence: 'Practical experience.' },
    { name: 'Linux', category: 'Operating Systems', level: 2, targetLevel: 6, status: 'learning', evidence: 'Basic usage.' },
  ],
  quests: [{ title: 'Ship a project', priority: 'high', status: 'now', xp: 20 }],
  knowledgeNotes: [{ title: 'Jenkins triage workflow', body: 'Known tickets and root causes.', tags: ['jenkins', 'qa'] }],
})

describe('bulk JSON import', () => {
  it('validates a bounded portable payload and summarizes its contents', () => {
    const result = parseBulkImport(payload)
    expect(result.status).toBe('valid')
    if (result.status === 'valid') expect(result.summary).toMatchObject({ skills: 2, quests: 1, knowledgeNotes: 1 })
  })

  it('upserts skills by name and creates local ids for imported records', () => {
    const state = createInitialState({ name: 'Kris', title: 'Builder' })
    const first = applyBulkImport(state, payload, () => 'generated-id')
    const updated = applyBulkImport(first, JSON.stringify({ schemaVersion: 1, skills: [{ name: 'Java', category: 'Software Development', level: 7, targetLevel: 9, status: 'proven', evidence: 'Updated.' }] }), () => 'other-id')

    expect(first.skills).toHaveLength(2)
    expect(first.quests[0].profileId).toBe(state.activeProfileId)
    expect(first.knowledgeNotes[0].id).toBe('generated-id')
    expect(updated.skills.filter((skill) => skill.name === 'Java')).toHaveLength(1)
    expect(updated.skills.find((skill) => skill.name === 'Java')?.level).toBe(7)
  })

  it('rejects unknown keys, unsafe URLs, and oversized input', () => {
    expect(parseBulkImport(JSON.stringify({ schemaVersion: 1, surprise: true })).status).toBe('invalid')
    expect(parseBulkImport(JSON.stringify({ schemaVersion: 1, resources: [{ title: 'Bad', kind: 'article', status: 'queued', creator: '', url: 'javascript:alert(1)', notes: '' }] })).status).toBe('invalid')
    expect(parseBulkImport('x'.repeat(200_001)).status).toBe('invalid')
  })
})
