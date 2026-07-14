import { useMemo, useState } from 'react'
import { Clipboard, FileText, Sparkles, X } from 'lucide-react'
import { useWorkspace } from '../../app/AppState'
import type { CvVariant } from '../../domain/model'
import { copyText } from '../../platform/clipboard'
import { buildCvTuningPrompt } from './cvTuning'
import { useI18n } from '../../i18n/I18n'
import { AI_HANDOFF_COPY } from '../../content/aiHandoff'

export function CvTuningPanel({ cv, onClose }: { cv: CvVariant; onClose: () => void }) {
  const { state } = useWorkspace()
  const { language } = useI18n()
  const [target, setTarget] = useState(cv.role)
  const [instructions, setInstructions] = useState('')
  const [prompt, setPrompt] = useState('')
  const [message, setMessage] = useState('')
  const context = useMemo(() => {
    if (!state) return null
    const profile = state.profiles.find((item) => item.id === cv.profileId) ?? state.profiles[0]
    return { profile, skills: state.skills.filter((skill) => skill.profileId === cv.profileId) }
  }, [cv.profileId, state])

  if (!state || !context) return null

  function generate() {
    const generated = buildCvTuningPrompt({ profile: context!.profile, cv, skills: context!.skills, target, instructions })
    setPrompt(language === 'hu' ? `${generated}\n\nIMPORTANT LANGUAGE INSTRUCTION: Write the rewritten CV and all explanations in polished, natural Hungarian unless the target vacancy explicitly requires another language.` : generated)
    setMessage(`Prompt ready with ${context!.skills.length} skill profile${context!.skills.length === 1 ? '' : 's'}.`)
  }

  async function copy() {
    const copied = await copyText(prompt)
    setMessage(copied ? 'Prompt copied. Attach or paste the current CV when you send it to the AI.' : 'Clipboard access was blocked. Select and copy the prompt manually.')
  }

  return <section className="panel cv-tuning-panel">
    <header className="cv-tuning-head"><div><p className="eyebrow">REWRITE WITH AI</p><h2>Tune {cv.name}</h2><p>Enter the role you want. The generated prompt will tell an AI how to rewrite this CV using your saved experience.</p></div><button className="icon-btn" aria-label="Close CV tuning" onClick={onClose}><X size={18}/></button></header>
    <div className="cv-tuning-context"><span><FileText size={16}/><b>{cv.attachment?.fileName ?? (cv.fileName || 'No CV file attached')}</b></span><span><Sparkles size={16}/><b>{context.skills.length} skills included</b></span></div>
    <div className="cv-tuning-fields"><label>Target role or job description<span className="field-guidance">Paste the vacancy, or describe the kind of role this CV should target.</span><textarea value={target} onChange={(event) => setTarget(event.target.value)} maxLength={12_000} placeholder="Paste the job description or describe the target roleâ€¦"/></label><label>Editing preferences <span className="field-guidance">Optional: length, tone, format, emphasis, or details to preserve.</span><textarea value={instructions} onChange={(event) => setInstructions(event.target.value)} maxLength={2_000} placeholder="For example: keep it to two pages and emphasize automation impact."/></label></div>
    <button className="primary" onClick={generate}><Sparkles size={17}/> Create AI prompt</button>
    {prompt && <div className="cv-tuning-output"><div><h3>Send the prompt and your CV to an AI</h3><p>{AI_HANDOFF_COPY.attachCv}</p></div><textarea aria-label="Generated CV tuning prompt" className="code-area" readOnly value={prompt}/><button className="primary" onClick={copy}><Clipboard size={17}/> Copy prompt</button></div>}
    {message && <p className="notice" role="status">{message}</p>}
  </section>
}
