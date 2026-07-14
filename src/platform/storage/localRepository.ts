import type { AppState } from '../../domain/model'
import { appStateSchema } from '../../domain/schema'

const KEY = 'untitled.workspace.v1'
export type LoadResult = { status: 'empty' } | { status: 'valid'; state: AppState } | { status: 'invalid'; reason: string } | { status: 'unavailable' }
export type SaveResult = { status: 'saved' } | { status: 'unavailable' } | { status: 'failed'; reason: string }

export function acquireStorage(): Storage | null {
  try { return window.localStorage } catch { return null }
}

export function createLocalRepository(storage: Storage | null) {
  return {
    load(): LoadResult {
      if (!storage) return { status: 'unavailable' }
      try {
        const raw = storage.getItem(KEY)
        if (!raw) return { status: 'empty' }
        const parsed = appStateSchema.safeParse(JSON.parse(raw))
        return parsed.success ? { status: 'valid', state: parsed.data as AppState } : { status: 'invalid', reason: 'Saved data did not match this app version.' }
      } catch { return { status: 'invalid', reason: 'Saved data could not be read.' } }
    },
    save(state: AppState): SaveResult {
      if (!storage) return { status: 'unavailable' }
      const validated = appStateSchema.safeParse(state)
      if (!validated.success) return { status: 'failed', reason: 'Invalid changes were not saved.' }
      try { storage.setItem(KEY, JSON.stringify(validated.data)); return { status: 'saved' } }
      catch { return { status: 'failed', reason: 'This browser could not save changes.' } }
    },
    clear(): SaveResult {
      if (!storage) return { status: 'unavailable' }
      try { storage.removeItem(KEY); return { status: 'saved' } }
      catch { return { status: 'failed', reason: 'This browser could not clear saved data.' } }
    },
  }
}
