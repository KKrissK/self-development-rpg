import { useRef, useState } from 'react'
import { ArrowRight, Upload } from 'lucide-react'
import { useWorkspace } from '../../app/AppState'
import { brand } from '../../config/brand'
import { MAX_BACKUP_FILE_SIZE, parseWorkspaceBackup } from '../profile/workspaceBackup'

export function Onboarding({ onBack }: { onBack?: () => void }) {
  const { createProfile, restoreWorkspace } = useWorkspace()
  const [name, setName] = useState('')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  async function restore(file?: File) {
    if (input.current) input.current.value = ''
    if (!file) return
    if (file.size > MAX_BACKUP_FILE_SIZE) { setMessage('Choose an Untitled backup smaller than 300 MB.'); return }
    setBusy(true)
    setMessage('Checking backup…')
    try {
      const parsed = parseWorkspaceBackup(await file.text())
      if (parsed.status === 'invalid') { setMessage(parsed.reason); return }
      const restored = await restoreWorkspace(parsed.state, parsed.files, parsed.images)
      if (!restored) setMessage('The backup could not be saved in this browser.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The backup could not be restored.')
    } finally {
      setBusy(false)
    }
  }

  return <main className="onboarding">{onBack && <button className="onboarding-back" onClick={onBack}>← Back to overview</button>}<section className="onboarding-card"><div className="brand-mark large">{brand.mark}</div><p className="eyebrow">{brand.eyebrow}</p><h1>Build your character.</h1><p className="lede">Not a fantasy avatar—the real you. Map what you know, choose what comes next, and turn growth into visible progress.</p><form onSubmit={(event) => { event.preventDefault(); if (name.trim()) createProfile({ name, title }) }}><label>Your name<input autoFocus required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="Kris"/></label><label>Current role or direction<input maxLength={100} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Builder, analyst, designer…"/></label><button className="primary" type="submit">Open dashboard <ArrowRight size={18}/></button></form><div className="onboarding-restore"><span>Already have an Untitled backup?</span><button className="secondary" disabled={busy} onClick={() => input.current?.click()}><Upload size={17}/> Restore complete backup</button><input ref={input} hidden type="file" accept="application/json,.json" onChange={(event) => void restore(event.target.files?.[0])}/></div>{message && <p className="notice" role="status">{message}</p>}<small>Your data stays in this browser. No account required.</small></section></main>
}
