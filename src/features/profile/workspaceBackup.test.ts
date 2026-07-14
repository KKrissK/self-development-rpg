import { describe, expect, it } from 'vitest'
import { createInitialState } from '../../domain/actions'
import type { AchievementImage, AppState, CvAttachment } from '../../domain/model'
import { createWorkspaceBackup, parseWorkspaceBackup } from './workspaceBackup'

function stateWithCv() {
  const state = createInitialState({ name: 'Kris', title: 'Builder' })
  const attachment: CvAttachment = { id: 'file-1', fileName: 'kris-cv.pdf', mimeType: 'application/pdf', size: 6, storedAt: '2026-07-14T10:00:00.000Z' }
  return { ...state, cvs: [{ id: 'cv-1', profileId: state.activeProfileId, name: 'Main CV', employer: '', role: 'Builder', language: 'English' as const, status: 'ready' as const, fileName: attachment.fileName, attachment, notes: '', updatedAt: attachment.storedAt }] } satisfies AppState
}

describe('full workspace backup', () => {
  it('roundtrips workspace data, CV files, and achievement images', async () => {
    const base = stateWithCv()
    const image: AchievementImage = { id: 'image-1', fileName: 'project.png', mimeType: 'image/png', size: 4, storedAt: '2026-07-14T11:00:00.000Z' }
    const state: AppState = { ...base, quests: [{ id: 'goal-1', profileId: base.activeProfileId, title: 'Improve Java skills', notes: '', priority: 'medium', status: 'now', xp: 30 }], tasks: [{ id: 'task-1', profileId: base.activeProfileId, goalId: 'goal-1', title: 'Build a service', notes: '', status: 'todo', createdAt: image.storedAt }], achievements: [{ id: 'achievement-1', profileId: base.activeProfileId, title: 'Untitled app', kind: 'project', description: 'Built a useful tool.', url: 'https://example.com/', image, createdAt: image.storedAt }] }
    const raw = await createWorkspaceBackup(
      state,
      [{ ...state.cvs[0].attachment!, blob: new Blob(['resume'], { type: 'application/pdf' }) }],
      [{ ...image, blob: new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'image/png' }) }],
    )
    const parsed = parseWorkspaceBackup(raw)
    expect(parsed.status).toBe('valid')
    if (parsed.status === 'valid') {
      expect(parsed.legacy).toBe(false)
      expect(parsed.state.profiles[0].name).toBe('Kris')
      expect(parsed.state.tasks[0]).toMatchObject({ title: 'Build a service', goalId: 'goal-1' })
      expect(parsed.files[0]).toMatchObject({ id: 'file-1', fileName: 'kris-cv.pdf', size: 6 })
      expect(parsed.images[0]).toMatchObject({ id: 'image-1', fileName: 'project.png', size: 4 })
    }
  })

  it('rejects missing attachments and accepts older metadata-only exports', async () => {
    await expect(createWorkspaceBackup(stateWithCv(), [])).rejects.toThrow('missing')
    const legacy = createInitialState({ name: 'Kris', title: 'Builder' })
    expect(parseWorkspaceBackup(JSON.stringify(legacy))).toMatchObject({ status: 'valid', legacy: true, files: [], images: [] })
  })
})
