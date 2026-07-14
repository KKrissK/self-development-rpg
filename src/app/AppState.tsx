import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { createInitialState } from '../domain/actions'
import { createId } from '../domain/id'
import type { AppState } from '../domain/model'
import { appStateSchema } from '../domain/schema'
import { createCvAttachmentRepository, type CvAttachmentRepository } from '../platform/storage/cvAttachmentRepository'
import { acquireStorage, createLocalRepository } from '../platform/storage/localRepository'

interface WorkspaceContextValue {
  state: AppState | null
  storageWarning: string
  attachments: CvAttachmentRepository
  createProfile(input: { name: string; title: string }): void
  update(recipe: (current: AppState) => AppState): void
  reset(): Promise<boolean>
  importState(next: AppState): void
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const repository = useMemo(() => createLocalRepository(acquireStorage()), [])
  const attachments = useMemo(() => createCvAttachmentRepository(), [])
  const loaded = useMemo(() => repository.load(), [repository])
  const [state, setState] = useState<AppState | null>(loaded.status === 'valid' ? loaded.state : null)
  const [storageWarning, setStorageWarning] = useState(loaded.status === 'invalid' ? loaded.reason : loaded.status === 'unavailable' ? 'Private mode is blocking local storage. Changes will last only for this session.' : '')

  useEffect(() => {
    if (!state) return
    document.documentElement.dataset.theme = state.theme
  }, [state])

  useEffect(() => {
    if (!import.meta.env.DEV) return
    window.untitledDev = {
      async wipeAndRestart() {
        await attachments.clear()
        const result = repository.clear()
        if (result.status !== 'saved') throw new Error(result.status === 'failed' ? result.reason : 'Browser storage is unavailable.')
        window.location.reload()
      },
    }
    return () => { delete window.untitledDev }
  }, [attachments, repository])

  const value = useMemo<WorkspaceContextValue>(() => ({
    state,
    storageWarning,
    attachments,
    createProfile(input) {
      const next = createInitialState(input)
      const saved = repository.save(next)
      if (saved.status !== 'saved') setStorageWarning(saved.status === 'failed' ? saved.reason : 'Changes cannot be saved in this browser.')
      setState(next)
    },
    update(recipe) {
      setState((current) => {
        if (!current) return current
        try {
          const candidate = recipe(current)
          const validated = appStateSchema.safeParse(candidate)
          if (!validated.success) {
            setStorageWarning('That change was not saved because it would make the workspace invalid.')
            return current
          }
          const saved = repository.save(validated.data as AppState)
          setStorageWarning(saved.status === 'saved' ? '' : saved.status === 'failed' ? saved.reason : 'Changes cannot be saved in this browser.')
          return validated.data as AppState
        } catch (error) {
          setStorageWarning(error instanceof Error ? `That change was not saved: ${error.message}` : 'That change could not be saved.')
          return current
        }
      })
    },
    async reset() {
      try {
        await attachments.clear()
      } catch (error) {
        setStorageWarning(error instanceof Error ? error.message : 'This browser could not erase stored CV files.')
        return false
      }
      const result = repository.clear()
      if (result.status === 'saved') { setState(null); setStorageWarning(''); return true }
      setStorageWarning(result.status === 'failed' ? result.reason : 'This browser could not erase the saved workspace.')
      return false
    },
    importState(next) {
      const validated = appStateSchema.safeParse(next)
      if (!validated.success) { setStorageWarning('That workspace is invalid and was not imported.'); return }
      const saved = repository.save(validated.data as AppState)
      setStorageWarning(saved.status === 'saved' ? '' : saved.status === 'failed' ? saved.reason : 'Changes cannot be saved in this browser.')
      setState(validated.data as AppState)
    },
  }), [attachments, repository, state, storageWarning])

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext)
  if (!value) throw new Error('useWorkspace must be used within WorkspaceProvider')
  return value
}

export const uid = createId
