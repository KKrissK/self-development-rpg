import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { createInitialState } from '../domain/actions'
import type { AppState } from '../domain/model'
import { appStateSchema } from '../domain/schema'
import { acquireStorage, createLocalRepository } from '../platform/storage/localRepository'

interface WorkspaceContextValue {
  state: AppState | null
  storageWarning: string
  createProfile(input: { name: string; title: string }): void
  update(recipe: (current: AppState) => AppState): void
  reset(): void
  importState(next: AppState): void
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const repository = useMemo(() => createLocalRepository(acquireStorage()), [])
  const loaded = useMemo(() => repository.load(), [repository])
  const [state, setState] = useState<AppState | null>(loaded.status === 'valid' ? loaded.state : null)
  const [storageWarning, setStorageWarning] = useState(loaded.status === 'invalid' ? loaded.reason : loaded.status === 'unavailable' ? 'Private mode is blocking local storage. Changes will last only for this session.' : '')

  useEffect(() => {
    if (!state) return
    document.documentElement.dataset.theme = state.theme
  }, [state])

  const value = useMemo<WorkspaceContextValue>(() => ({
    state,
    storageWarning,
    createProfile(input) {
      const next = createInitialState(input)
      const saved = repository.save(next)
      if (saved.status !== 'saved') setStorageWarning(saved.status === 'failed' ? saved.reason : 'Changes cannot be saved in this browser.')
      setState(next)
    },
    update(recipe) {
      setState((current) => {
        if (!current) return current
        const candidate = recipe(current)
        const validated = appStateSchema.safeParse(candidate)
        if (!validated.success) {
          setStorageWarning('That change was not saved because it would make the workspace invalid.')
          return current
        }
        const saved = repository.save(validated.data as AppState)
        setStorageWarning(saved.status === 'saved' ? '' : saved.status === 'failed' ? saved.reason : 'Changes cannot be saved in this browser.')
        return validated.data as AppState
      })
    },
    reset() {
      const result = repository.clear()
      if (result.status === 'saved') { setState(null); setStorageWarning('') }
      else setStorageWarning(result.status === 'failed' ? result.reason : 'This browser could not erase the saved workspace.')
    },
    importState(next) {
      const validated = appStateSchema.safeParse(next)
      if (!validated.success) { setStorageWarning('That workspace is invalid and was not imported.'); return }
      const saved = repository.save(validated.data as AppState)
      setStorageWarning(saved.status === 'saved' ? '' : saved.status === 'failed' ? saved.reason : 'Changes cannot be saved in this browser.')
      setState(validated.data as AppState)
    },
  }), [repository, state, storageWarning])

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext)
  if (!value) throw new Error('useWorkspace must be used within WorkspaceProvider')
  return value
}

export const uid = () => crypto.randomUUID()
