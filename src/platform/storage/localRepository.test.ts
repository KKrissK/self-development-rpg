import { describe, expect, it } from 'vitest'
import { createInitialState } from '../../domain/actions'
import { createLocalRepository } from './localRepository'

class MemoryStorage implements Storage {
  private data = new Map<string, string>()
  get length() { return this.data.size }
  clear() { this.data.clear() }
  getItem(key: string) { return this.data.get(key) ?? null }
  key(index: number) { return [...this.data.keys()][index] ?? null }
  removeItem(key: string) { this.data.delete(key) }
  setItem(key: string, value: string) { this.data.set(key, value) }
}

describe('local repository', () => {
  it('roundtrips valid state', () => {
    const repository = createLocalRepository(new MemoryStorage())
    const state = createInitialState({ name: 'Kris', title: 'Builder' })

    expect(repository.save(state).status).toBe('saved')
    expect(repository.load()).toEqual({ status: 'valid', state })
  })

  it('distinguishes empty, invalid, and unavailable storage', () => {
    expect(createLocalRepository(new MemoryStorage()).load()).toEqual({ status: 'empty' })
    const corrupt = new MemoryStorage()
    corrupt.setItem('untitled.workspace.v1', '{bad')
    expect(createLocalRepository(corrupt).load().status).toBe('invalid')
    expect(createLocalRepository(null).load()).toEqual({ status: 'unavailable' })
  })

  it('refuses invalid state without replacing the last valid workspace', () => {
    const storage = new MemoryStorage()
    const repository = createLocalRepository(storage)
    const valid = createInitialState({ name: 'Kris', title: 'Builder' })
    repository.save(valid)

    const invalid = { ...valid, profiles: [{ ...valid.profiles[0], name: '' }] }
    expect(repository.save(invalid).status).toBe('failed')
    expect(repository.load()).toEqual({ status: 'valid', state: valid })
  })

  it('reports deletion failure instead of claiming the workspace was cleared', () => {
    const storage = new MemoryStorage()
    storage.removeItem = () => { throw new Error('denied') }
    expect(createLocalRepository(storage).clear().status).toBe('failed')
  })

  it('migrates workspaces saved before knowledge notes existed', () => {
    const storage = new MemoryStorage()
    const legacy: Partial<ReturnType<typeof createInitialState>> = { ...createInitialState({ name: 'Kris', title: 'Builder' }) }
    delete legacy.knowledgeNotes
    storage.setItem('untitled.workspace.v1', JSON.stringify(legacy))

    const result = createLocalRepository(storage).load()
    expect(result.status).toBe('valid')
    if (result.status === 'valid') expect(result.state.knowledgeNotes).toEqual([])
  })
})
