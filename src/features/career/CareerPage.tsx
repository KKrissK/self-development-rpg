import { useEffect, useState } from 'react'
import { Download, FileText, Plus, Trash2, Upload } from 'lucide-react'
import { uid, useWorkspace } from '../../app/AppState'
import type { CvVariant, IncomeSource } from '../../domain/model'
import { CV_FILE_ACCEPT, validateCvFile } from '../../platform/storage/cvAttachmentRepository'

const today = () => new Date().toISOString()
const money = (amount: number, currency: string) => new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
const formatFileSize = (bytes: number) => bytes < 1_000_000 ? `${Math.max(1, Math.round(bytes / 1_000))} KB` : `${(bytes / 1_000_000).toFixed(1)} MB`
const formatAmount = (value: string | number) => {
  const digits = String(value).replace(/\D/g, '').replace(/^0+(?=\d)/, '')
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}
const parseAmount = (value: FormDataEntryValue | string) => Math.max(0, Number(String(value).replace(/,/g, '')) || 0)

function MoneyAmountField({ label, value, currency, onCommit }: { label: string; value: number; currency: string; onCommit: (value: number) => void }) {
  const [draft, setDraft] = useState(value ? formatAmount(value) : '')
  useEffect(() => setDraft(value ? formatAmount(value) : ''), [value])
  function commit() {
    const amount = parseAmount(draft)
    onCommit(amount)
    setDraft(amount ? formatAmount(amount) : '')
  }
  return <div className="metric"><span>{label}</span><input aria-label={label} type="text" inputMode="numeric" value={draft} placeholder="Enter monthly amount" onChange={(event) => setDraft(formatAmount(event.target.value))} onBlur={commit} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur() }}/><small>{currency} per month · saves when you leave the field</small></div>
}

export function CareerPage() {
  const { state, update, attachments } = useWorkspace()
  const [tab, setTab] = useState<'money' | 'cvs'>('money')
  const [fileMessage, setFileMessage] = useState('')
  const [busyCvId, setBusyCvId] = useState('')
  if (!state) return null
  const profileId = state.activeProfileId
  const currency = state.moneyPlan.currency
  const total = state.incomeSources.filter((item) => item.active).reduce((sum, item) => sum + item.monthlyAmount, 0)

  function addIncome(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const item: IncomeSource = { id: uid(), profileId, name: String(form.get('incomeSourceName')), type: String(form.get('incomeSourceType')), monthlyAmount: parseAmount(form.get('incomeSourceAmount') ?? ''), currency, active: true }
    update((current) => ({ ...current, incomeSources: [item, ...current.incomeSources] }))
    event.currentTarget.reset()
  }

  async function addCv(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const element = event.currentTarget
    const form = new FormData(element)
    const file = form.get('cvFile')
    const cvId = uid()
    try {
      const attachment = file instanceof File && file.size > 0 ? await attachments.save(uid(), file) : undefined
      const item: CvVariant = {
        id: cvId,
        profileId,
        name: String(form.get('name')),
        employer: String(form.get('employer')),
        role: String(form.get('role')),
        language: form.get('language') as CvVariant['language'],
        status: 'draft',
        fileName: attachment?.fileName ?? '',
        attachment,
        notes: '',
        updatedAt: today(),
      }
      update((current) => ({ ...current, cvs: [item, ...current.cvs] }))
      element.reset()
      setFileMessage(attachment ? `${attachment.fileName} is stored locally in this browser.` : 'CV entry created. You can attach a file at any time.')
    } catch (error) {
      setFileMessage(error instanceof Error ? error.message : 'The CV file could not be stored.')
    }
  }

  async function replaceFile(cv: CvVariant, file?: File) {
    if (!file) return
    const validationError = validateCvFile(file)
    if (validationError) { setFileMessage(validationError); return }
    setBusyCvId(cv.id)
    try {
      const attachment = await attachments.save(cv.attachment?.id ?? uid(), file)
      update((current) => ({ ...current, cvs: current.cvs.map((item) => item.id === cv.id ? { ...item, attachment, fileName: attachment.fileName, updatedAt: today() } : item) }))
      setFileMessage(`${attachment.fileName} is now stored for ${cv.name}.`)
    } catch (error) {
      setFileMessage(error instanceof Error ? error.message : 'The CV file could not be stored.')
    } finally {
      setBusyCvId('')
    }
  }

  async function downloadFile(cv: CvVariant) {
    if (!cv.attachment) return
    setBusyCvId(cv.id)
    try {
      const stored = await attachments.get(cv.attachment.id)
      if (!stored) throw new Error('This file is missing from local storage. Attach it again to restore it.')
      const url = URL.createObjectURL(stored.blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = stored.fileName
      anchor.click()
      setTimeout(() => URL.revokeObjectURL(url), 1_000)
      setFileMessage(`${stored.fileName} downloaded.`)
    } catch (error) {
      setFileMessage(error instanceof Error ? error.message : 'The CV file could not be opened.')
    } finally {
      setBusyCvId('')
    }
  }

  async function removeFile(cv: CvVariant) {
    if (!cv.attachment || !confirm(`Remove ${cv.attachment.fileName} from this browser?`)) return
    setBusyCvId(cv.id)
    try {
      await attachments.delete(cv.attachment.id)
      update((current) => ({ ...current, cvs: current.cvs.map((item) => item.id === cv.id ? { ...item, attachment: undefined, fileName: '', updatedAt: today() } : item) }))
      setFileMessage(`Removed the stored file from ${cv.name}.`)
    } catch (error) {
      setFileMessage(error instanceof Error ? error.message : 'The stored file could not be removed.')
    } finally {
      setBusyCvId('')
    }
  }

  async function removeCv(cv: CvVariant) {
    if (!confirm(`Delete the CV entry “${cv.name}”${cv.attachment ? ' and its stored file' : ''}?`)) return
    setBusyCvId(cv.id)
    try {
      if (cv.attachment) await attachments.delete(cv.attachment.id)
      update((current) => ({ ...current, cvs: current.cvs.filter((item) => item.id !== cv.id) }))
      setFileMessage(`Deleted ${cv.name}.`)
    } catch (error) {
      setFileMessage(error instanceof Error ? error.message : 'The CV could not be deleted.')
    } finally {
      setBusyCvId('')
    }
  }

  return <div className="page"><header className="page-head"><div><p className="eyebrow">CAREER & RESOURCES</p><h1>Career</h1><p>See the work, money, and application assets behind your next move.</p></div></header><div className="tabs"><button className={tab === 'money' ? 'active' : ''} onClick={() => setTab('money')}>Income & plan</button><button className={tab === 'cvs' ? 'active' : ''} onClick={() => setTab('cvs')}>CV vault</button></div>{tab === 'money' ? <>
    <div className="metric-grid"><div className="metric"><span>Current monthly income</span><b>{money(total, currency)}</b><small>Sum of active income sources below</small></div><MoneyAmountField label="Monthly income target" value={state.moneyPlan.monthlyTarget} currency={currency} onCommit={(value) => update((current) => ({ ...current, moneyPlan: { ...current.moneyPlan, monthlyTarget: value } }))}/><MoneyAmountField label="Monthly expenses" value={state.moneyPlan.monthlyExpenses} currency={currency} onCommit={(value) => update((current) => ({ ...current, moneyPlan: { ...current.moneyPlan, monthlyExpenses: value } }))}/></div>
    <form className="panel income-add-form" autoComplete="off" onSubmit={addIncome}><label className="income-name-field">Income source name<input name="incomeSourceName" required maxLength={120} autoComplete="off" placeholder="What is this income source called?"/></label><label>Income type<input name="incomeSourceType" maxLength={80} autoComplete="off" placeholder="Salary, freelance, business…"/></label><label>Monthly amount ({currency})<input name="incomeSourceAmount" required type="text" inputMode="numeric" pattern="[0-9,]+" autoComplete="off" placeholder="0" onInput={(event) => { event.currentTarget.value = formatAmount(event.currentTarget.value) }}/></label><button className="primary"><Plus size={18}/> Add income source</button></form>
    <div className="list-panel panel">{state.incomeSources.map((item) => <div className="income-row" key={item.id}><div><b>{item.name}</b><small>{item.type}</small></div><strong>{money(item.monthlyAmount, item.currency)}</strong><button className="icon-btn" aria-label={`Delete income source ${item.name}`} onClick={() => update((current) => ({ ...current, incomeSources: current.incomeSources.filter((income) => income.id !== item.id) }))}><Trash2 size={17}/></button></div>)}</div>
  </> : <>
    <form className="inline-form cv-add-form" onSubmit={addCv}><label>CV name<input name="name" required placeholder="Name this CV variant"/></label><label>Employer<input name="employer"/></label><label>Role<input name="role"/></label><label>Language<select name="language"><option>English</option><option>Hungarian</option><option>Other</option></select></label><label className="wide">CV file <span className="field-guidance">Optional · PDF, Word, ODT, RTF, or TXT · up to 20 MB</span><input name="cvFile" type="file" accept={CV_FILE_ACCEPT}/></label><button className="primary"><Plus size={18}/> Add to vault</button></form>
    {fileMessage && <p className="notice" role="status">{fileMessage}</p>}
    {state.cvs.length === 0 ? <div className="panel"><p className="empty">No CVs stored yet.</p></div> : <div className="card-grid">{state.cvs.map((cv) => <article className="panel cv-card" key={cv.id}><div className="cv-card-head"><FileText/><span className="kind">{cv.language}</span><button className="icon-btn" aria-label={`Delete CV ${cv.name}`} disabled={busyCvId === cv.id} onClick={() => removeCv(cv)}><Trash2 size={17}/></button></div><h2>{cv.name}</h2><p>{cv.employer || 'General'} · {cv.role || 'Role not set'}</p><select aria-label={`Status for ${cv.name}`} value={cv.status} onChange={(event) => update((current) => ({ ...current, cvs: current.cvs.map((item) => item.id === cv.id ? { ...item, status: event.target.value as CvVariant['status'], updatedAt: today() } : item) }))}><option>draft</option><option>ready</option><option>sent</option><option>archived</option></select>{cv.attachment ? <div className="cv-file"><div><b>{cv.attachment.fileName}</b><small>{formatFileSize(cv.attachment.size)} · stored on this device</small></div><div className="cv-file-actions"><button className="secondary" disabled={busyCvId === cv.id} onClick={() => downloadFile(cv)}><Download size={16}/> Download</button><label className="secondary file-button"><Upload size={16}/> Replace<input hidden type="file" accept={CV_FILE_ACCEPT} disabled={busyCvId === cv.id} onChange={(event) => { void replaceFile(cv, event.target.files?.[0]); event.currentTarget.value = '' }}/></label><button className="icon-btn" aria-label={`Remove file ${cv.attachment.fileName}`} disabled={busyCvId === cv.id} onClick={() => removeFile(cv)}><Trash2 size={16}/></button></div></div> : <div className="cv-file empty-file"><span>{cv.fileName ? `Legacy reference: ${cv.fileName}` : 'No file attached'}</span><label className="secondary file-button"><Upload size={16}/> Attach file<input hidden type="file" accept={CV_FILE_ACCEPT} disabled={busyCvId === cv.id} onChange={(event) => { void replaceFile(cv, event.target.files?.[0]); event.currentTarget.value = '' }}/></label></div>}</article>)}</div>}
  </>}</div>
}
