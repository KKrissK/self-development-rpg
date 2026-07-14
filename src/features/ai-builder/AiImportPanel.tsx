import { useMemo, useState } from 'react'
import { Clipboard, Sparkles, Upload } from 'lucide-react'
import { useWorkspace } from '../../app/AppState'
import { copyText } from '../../platform/clipboard'
import type { BulkImport } from '../bulk-import/bulkImport'
import {
  applyAiItemImport,
  applySkillAssessment,
  buildItemPrompt,
  buildSkillAssessmentPrompt,
  parseAiItemResponse,
  parseSkillAssessmentResponse,
  type ItemTarget,
  type SkillAssessment,
} from './aiBuilder'

export type AiImportMode = 'create' | 'assess'

const targetCopy: Record<ItemTarget, { label: string; guidance: string; placeholder: string }> = {
  skills: { label: 'skills', guidance: 'Describe one or several skills. Include real work, projects or other experience, approximate current ability, and the level you want to reach. Say whether you prefer one broad skill or several specific ones.', placeholder: 'Describe the skills, your experience, and target level.' },
  quests: { label: 'goals', guidance: 'Describe the outcome, timeframe, constraints, and what success looks like. Mention any existing skill the Goals should develop.', placeholder: 'Describe the outcome, timeframe, constraints, and definition of done.' },
  resources: { label: 'library items', guidance: 'Describe the topic, current level, preferred formats, language, budget or time constraints, and how many resources you want.', placeholder: 'Describe the topic, current level, preferred formats, constraints, and quantity.' },
}

function ItemPreview({ data, target }: { data: BulkImport; target: ItemTarget }) {
  if (target === 'skills') return <>{data.skills.map((item, index) => <article key={`${item.name}-${index}`}><span className="kind">Skill</span><div><b>{item.name}</b><p>{item.category} · Level {item.level} → {item.targetLevel}</p><small>{item.evidence || 'No experience supplied.'}</small></div></article>)}</>
  if (target === 'quests') return <>{data.quests.map((item, index) => <article key={`${item.title}-${index}`}><span className={`status ${item.priority}`}>{item.priority}</span><div><b>{item.title}</b><p>{item.notes || 'No notes.'}</p><small>{item.status} · +{item.xp} XP{item.skillName ? ` · ${item.skillName}` : ''}</small></div></article>)}</>
  return <>{data.resources.map((item, index) => <article key={`${item.title}-${index}`}><span className="kind">{item.kind}</span><div><b>{item.title}</b><p>{item.creator || 'Creator not specified'}</p><small>{item.notes || 'No notes.'}</small></div></article>)}</>
}

export function AiImportPanel({ target, mode }: { target: ItemTarget; mode: AiImportMode }) {
  const { state, update } = useWorkspace()
  const [request, setRequest] = useState('')
  const [prompt, setPrompt] = useState('')
  const [raw, setRaw] = useState('')
  const [itemPreview, setItemPreview] = useState<BulkImport | null>(null)
  const [assessmentPreview, setAssessmentPreview] = useState<SkillAssessment | null>(null)
  const [message, setMessage] = useState('')

  const context = useMemo(() => {
    if (!state) return null
    const profile = state.profiles.find((item) => item.id === state.activeProfileId) ?? state.profiles[0]
    return {
      profile: { title: profile.title, bio: profile.bio },
      existingSkills: state.skills.filter((item) => item.profileId === profile.id).map(({ name, level }) => ({ name, level })),
    }
  }, [state])

  if (!state || !context) return null

  function generatePrompt() {
    if (!request.trim()) { setMessage(mode === 'assess' ? 'Name the skill and add any useful context.' : `Describe the ${targetCopy[target].label} you want to create.`); return }
    setPrompt(mode === 'assess' ? buildSkillAssessmentPrompt(request, context!) : buildItemPrompt(target, request, context!))
    setRaw('')
    setItemPreview(null)
    setAssessmentPreview(null)
    setMessage('Prompt ready. Copy it into any AI model.')
  }

  async function copyPrompt() {
    const copied = await copyText(prompt)
    setMessage(copied ? 'Prompt copied. Paste it into your preferred AI.' : 'Clipboard access was blocked. Select the prompt text and copy it manually.')
  }

  function validate() {
    if (mode === 'create') {
      const result = parseAiItemResponse(raw, target)
      if (result.status === 'invalid') { setItemPreview(null); setMessage(result.reason); return }
      setItemPreview(result.data)
      setMessage('Response validated. Review every item before importing.')
      return
    }
    const result = parseSkillAssessmentResponse(raw)
    if (result.status === 'invalid') { setAssessmentPreview(null); setMessage(result.reason); return }
    setAssessmentPreview(result.data)
    setMessage('Assessment validated. Review the level and reasoning before importing.')
  }

  function importItems() {
    if (mode === 'create' && itemPreview) update((current) => applyAiItemImport(current, itemPreview))
    else if (mode === 'assess' && assessmentPreview) update((current) => applySkillAssessment(current, assessmentPreview))
    else return
    const imported = mode === 'assess' ? 'assessed skill' : targetCopy[target].label
    setRaw('')
    setItemPreview(null)
    setAssessmentPreview(null)
    setMessage(`Imported ${imported} into your workspace.`)
  }

  const itemCount = itemPreview ? itemPreview[target].length : 0
  const assessment = mode === 'assess'
  return <div className="embedded-ai-flow">
    <section className="panel ai-request-panel">
      <div className="step"><span>1</span><div><h2>{assessment ? 'Describe the skill to assess' : `Describe the ${targetCopy[target].label} to add`}</h2><p>{assessment ? 'The AI commits to 4–8 progress-labelled questions, adapts to your answers, and includes a small practical check.' : 'Plain language is enough. The generated prompt forces a small response format this app can validate.'}</p></div></div>
      <label>{assessment ? 'Skill and context' : `What ${targetCopy[target].label} should the AI create?`}<span className="field-guidance">{assessment ? 'Enter exactly one skill. Describe where you use it, tasks you complete independently, concrete experience, and areas where you are uncertain.' : targetCopy[target].guidance}</span><textarea className="request-area" value={request} maxLength={5000} onChange={(event) => setRequest(event.target.value)} placeholder={assessment ? 'Describe one skill, how you use it, experience, and uncertainties.' : targetCopy[target].placeholder}/></label>
      <button className="primary" onClick={generatePrompt}><Sparkles size={18}/> Generate copy-paste prompt</button>
    </section>

    {prompt && <div className="ai-exchange-grid"><section className="panel"><div className="step"><span>2</span><div><h2>Use the prompt with any AI</h2><p>{assessment ? 'Answer one question at a time there, then copy only its final JSON.' : 'The prompt requests only the exact JSON this section can import.'}</p></div></div><textarea aria-label="Generated AI prompt" className="code-area" readOnly value={prompt}/><button className="primary" onClick={copyPrompt}><Clipboard size={18}/> Copy prompt</button></section><section className="panel"><div className="step"><span>3</span><div><h2>Paste the final JSON</h2><p>Nothing is saved until validation succeeds and you confirm the preview.</p></div></div><textarea aria-label="AI response JSON" className="code-area" value={raw} onChange={(event) => setRaw(event.target.value)} placeholder='{"schemaVersion":1,…}'/><button className="secondary" disabled={!raw.trim()} onClick={validate}>Validate & preview</button></section></div>}

    {message && <p className="notice" role="status">{message}</p>}
    {itemPreview && <section className="panel preview ai-import-preview"><p className="eyebrow">IMPORT PREVIEW</p><h2>{itemCount} {targetCopy[target].label} ready</h2><ItemPreview data={itemPreview} target={target}/><button className="primary" onClick={importItems}><Upload size={18}/> Import {itemCount} items</button></section>}
    {assessmentPreview && <section className="panel preview ai-import-preview assessment-preview"><p className="eyebrow">ASSESSMENT PREVIEW</p><h2>{assessmentPreview.skill.name}: level {assessmentPreview.skill.level}/10</h2><div className="assessment-preview-head"><b>{assessmentPreview.skill.category} · target {assessmentPreview.skill.targetLevel}</b></div><div className="assessment-preview-grid"><section><span className="skill-section-label">Assessment summary</span><p>{assessmentPreview.skill.assessmentSummary}</p></section><section><span className="skill-section-label">Experience</span><p>{assessmentPreview.skill.evidence || 'No concrete experience recorded.'}</p></section><section><span className="skill-section-label">Demonstrated strengths</span><ul>{assessmentPreview.skill.strengths.map((item) => <li key={item}>{item}</li>)}</ul></section><section><span className="skill-section-label">Growth areas</span><ul>{assessmentPreview.skill.gaps.map((item) => <li key={item}>{item}</li>)}</ul></section></div><p className="assessment-note">AI assessment is an estimate, not a credential. Keep the level only if the reasoning matches the experience.</p><button className="primary" onClick={importItems}><Upload size={18}/> Import assessed skill</button></section>}
  </div>
}
