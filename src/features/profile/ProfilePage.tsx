import { useRef, useState } from 'react'
import { Download, Trash2, Upload } from 'lucide-react'
import { useWorkspace } from '../../app/AppState'
import { createWorkspaceBackup, MAX_BACKUP_FILE_SIZE, parseWorkspaceBackup } from './workspaceBackup'

export function ProfilePage() {
  const { state, update, reset, restoreWorkspace, attachments, achievementImages } = useWorkspace()
  const input = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  if (!state) return null
  const profile = state.profiles.find((item) => item.id === state.activeProfileId) ?? state.profiles[0]
  const attachedCount = state.cvs.filter((cv) => cv.attachment).length
  const imageCount = state.achievements.filter((achievement) => achievement.image).length

  async function exportBackup() {
    setBusy(true)
    setMessage('Collecting workspace data and local files…')
    try {
      const files = []
      for (const cv of state!.cvs) {
        if (!cv.attachment) continue
        const stored = await attachments.get(cv.attachment.id)
        if (!stored) throw new Error(`${cv.attachment.fileName} is missing from browser storage. Attach it again before backing up.`)
        files.push(stored)
      }
      const images = []
      for (const achievement of state!.achievements) {
        if (!achievement.image) continue
        const stored = await achievementImages.get(achievement.image.id)
        if (!stored) throw new Error(`${achievement.image.fileName} is missing from browser storage. Add it again before backing up.`)
        images.push(stored)
      }
      const raw = await createWorkspaceBackup(state!, files, images)
      const blob = new Blob([raw], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `untitled-backup-${new Date().toISOString().slice(0, 10)}.json`
      anchor.click()
      setTimeout(() => URL.revokeObjectURL(url), 1_000)
      setMessage(`Complete backup created: ${state!.profiles.length} profile${state!.profiles.length === 1 ? '' : 's'}, all workspace records, ${files.length} CV file${files.length === 1 ? '' : 's'}, and ${images.length} achievement image${images.length === 1 ? '' : 's'}.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The backup could not be created.')
    } finally { setBusy(false) }
  }

  async function importBackup(file?: File) {
    if (input.current) input.current.value = ''
    if (!file) return
    if (file.size > MAX_BACKUP_FILE_SIZE) { setMessage('Choose an Untitled backup smaller than 300 MB.'); return }
    setBusy(true)
    setMessage('Checking backup…')
    try {
      const parsed = parseWorkspaceBackup(await file.text())
      if (parsed.status === 'invalid') { setMessage(parsed.reason); return }
      const description = parsed.legacy ? 'This is an older metadata-only workspace export.' : `It contains ${parsed.state.profiles.length} profile${parsed.state.profiles.length === 1 ? '' : 's'}, ${parsed.files.length} attached CV file${parsed.files.length === 1 ? '' : 's'}, and ${parsed.images.length} achievement image${parsed.images.length === 1 ? '' : 's'}.`
      if (!confirm(`Restore “${file.name}”?\n\n${description}\n\nThis replaces the workspace and locally stored files currently in this browser.`)) { setMessage('Restore cancelled. Your current workspace was not changed.'); return }
      const restored = await restoreWorkspace(parsed.state, parsed.files, parsed.images)
      if (restored) setMessage(parsed.legacy ? 'Older workspace restored. It did not contain local file contents.' : 'Complete workspace and local files restored.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The backup could not be restored.')
    } finally { setBusy(false) }
  }

  async function resetWorkspace() { if (!confirm('Erase this workspace and every locally stored CV file and achievement image from this browser?')) return; await reset() }
  async function wipeTestData() { if (!confirm('Wipe all test data and restart the app?')) return; const cleared = await reset(); if (cleared) window.location.reload() }

  return <div className="page profile-page">
    <header className="page-head"><div><p className="eyebrow">CHARACTER & DATA</p><h1>Profile</h1><p>Tune your identity and keep ownership of everything you record.</p></div></header>
    <section className="panel profile-editor"><div className="avatar huge">{profile.name.slice(0, 2).toUpperCase()}</div><label>Display name<input required maxLength={80} value={profile.name} onChange={(event) => update((current) => ({ ...current, profiles: current.profiles.map((item) => item.id === profile.id ? { ...item, name: event.target.value } : item) }))}/></label><label>Role / direction<input maxLength={100} value={profile.title} onChange={(event) => update((current) => ({ ...current, profiles: current.profiles.map((item) => item.id === profile.id ? { ...item, title: event.target.value } : item) }))}/></label><label className="wide">Short bio<textarea maxLength={1000} value={profile.bio} onChange={(event) => update((current) => ({ ...current, profiles: current.profiles.map((item) => item.id === profile.id ? { ...item, bio: event.target.value } : item) }))}/></label></section>
    <section className="panel data-panel backup-panel"><div><p className="eyebrow">COMPLETE LOCAL BACKUP</p><h2>Your data</h2><p>Back up and restore every profile, skill, Goal, Task, Library item, achievement, career and finance record, preference, CV file, and achievement picture. The backup stays on your device unless you move or share it.</p><div className="backup-coverage"><span>{state.profiles.length} profile{state.profiles.length === 1 ? '' : 's'}</span><span>{state.skills.length + state.quests.length + state.tasks.length + state.resources.length + state.achievements.length} growth records</span><span>{attachedCount} attached CV file{attachedCount === 1 ? '' : 's'}</span><span>{imageCount} achievement image{imageCount === 1 ? '' : 's'}</span></div></div><div className="data-actions"><button className="primary" disabled={busy} onClick={exportBackup}><Download size={18}/> Export complete backup</button><button className="secondary" disabled={busy} onClick={() => input.current?.click()}><Upload size={18}/> Restore backup</button><input ref={input} hidden type="file" accept="application/json,.json" onChange={(event) => void importBackup(event.target.files?.[0])}/><button className="danger" disabled={busy} onClick={resetWorkspace}><Trash2 size={18}/> Reset workspace</button></div>{message && <p className="notice" role="status">{message}</p>}</section>
    {import.meta.env.DEV && <section className="panel data-panel dev-tools"><div><p className="eyebrow">DEVELOPMENT ONLY</p><h2>Testing reset</h2><p>Wipes the workspace and all IndexedDB files, then reloads the onboarding screen. Console: <code>untitledDev.wipeAndRestart()</code></p></div><button className="danger" onClick={wipeTestData}><Trash2 size={18}/> Wipe test data & restart</button></section>}
  </div>
}
