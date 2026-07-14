import { Clipboard, FileJson, Upload } from 'lucide-react'
import { useState } from 'react'
import { useWorkspace } from '../../app/AppState'
import { applyBulkImport, bulkImportTemplate, parseBulkImport, type BulkSummary } from './bulkImport'

const summaryLabels: Record<keyof BulkSummary, string> = {
  skills: 'skills',
  quests: 'goals',
  knowledgeNotes: 'knowledge notes',
  resources: 'resources',
  incomeSources: 'income sources',
  cvs: 'CVs',
  advice: 'advice',
}

export function BulkImportPanel() {
  const { update } = useWorkspace()
  const [raw, setRaw] = useState('')
  const [summary, setSummary] = useState<BulkSummary | null>(null)
  const [message, setMessage] = useState('')

  function validate() {
    const result = parseBulkImport(raw)
    if (result.status === 'invalid') { setSummary(null); setMessage(result.reason); return }
    setSummary(result.summary)
    const total = Object.values(result.summary).reduce((sum, count) => sum + count, 0)
    setMessage(`Valid import: ${total} records plus any profile or money-plan updates. Review the counts, then import.`)
  }

  function importData() {
    if (!summary) return
    try {
      update((state) => applyBulkImport(state, raw))
      setRaw('')
      setSummary(null)
      setMessage('Bulk data imported into this browser-local profile.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Import failed.')
    }
  }

  return <section className="panel bulk-import-panel">
    <div className="panel-title"><div><p className="eyebrow">AI-FRIENDLY DATA EXCHANGE</p><h2>Bulk JSON import</h2></div><FileJson/></div>
    <p>Paste one validated JSON object to add or update many skills, Goals, knowledge notes, resources, income sources, CVs, advice items, profile fields, and money-plan fields at once. Skill names are upserted instead of duplicated.</p>
    <div className="data-actions"><button className="secondary" onClick={async () => { await navigator.clipboard?.writeText(bulkImportTemplate); setMessage('JSON template copied.') }}><Clipboard size={18}/> Copy template</button><button className="secondary" onClick={() => setRaw(bulkImportTemplate)}>Load template</button></div>
    <label>Bulk import JSON<textarea className="code-area bulk-json" value={raw} onChange={(event) => { setRaw(event.target.value); setSummary(null) }} placeholder='{"schemaVersion":1,"skills":[…]}'/></label>
    <div className="data-actions"><button className="secondary" onClick={validate} disabled={!raw.trim()}>Validate & preview</button>{summary && <button className="primary" onClick={importData}><Upload size={18}/> Import selected payload</button>}</div>
    {summary && <div className="import-summary" aria-label="Import preview">{(Object.entries(summary) as [keyof BulkSummary, number][]).map(([label, count]) => <span key={label}><b>{count}</b>{summaryLabels[label]}</span>)}</div>}
    {message && <p className="notice" role="status">{message}</p>}
  </section>
}
