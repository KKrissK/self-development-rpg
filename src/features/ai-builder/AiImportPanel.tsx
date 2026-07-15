import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Clipboard, ClipboardPaste, Sparkles, Upload } from 'lucide-react'
import { useWorkspace } from '../../app/AppState'
import { copyText } from '../../platform/clipboard'
import type { BulkImport } from '../bulk-import/bulkImport'
import { useI18n } from '../../i18n/I18n'
import { AI_HANDOFF_COPY } from '../../content/aiHandoff'
import {
  applyAiItemImport,
  applySkillAssessment,
  buildItemPrompt,
  buildQuickSkillEstimatePrompt,
  buildSkillAssessmentPrompt,
  parseAiItemResponse,
  parseSkillAssessmentResponse,
  type ItemTarget,
  type SkillAssessment,
} from './aiBuilder'

export type AiImportMode = 'create' | 'assess' | 'estimate'

const targetCopy: Record<ItemTarget, { label: string; guidance: string; placeholder: string }> = {
  skills: { label: 'skills', guidance: 'Describe one or several skills. Include real work, projects or other experience, and your approximate current ability.', placeholder: 'Describe the skills and your experience.' },
  quests: { label: 'goals', guidance: 'Describe a broad outcome, timeframe, constraints, and what success looks like. A Goal should be large enough to contain several Tasks.', placeholder: 'For example: improve my Java skills enough to build a complete backend service.' },
  tasks: { label: 'tasks', guidance: 'The selected Goal and any linked skill evidence are already included. Add time limits, preferred pace, constraints, or the kind of practice you want.', placeholder: 'Optional: available time, deadline, preferred projects, or anything to avoid.' },
  resources: { label: 'library items', guidance: 'Describe the topic, current level, preferred formats, language, budget or time constraints, and how many resources you want.', placeholder: 'Describe the topic, current level, preferred formats, constraints, and quantity.' },
}

function ItemPreview({ data, target }: { data: BulkImport; target: ItemTarget }) {
  if (target === 'skills') return <>{data.skills.map((item, index) => <article key={`${item.name}-${index}`}><span className="kind">Skill</span><div><b>{item.name}</b><p>{item.category} · Level {item.level}</p><small>{item.evidence || 'No experience supplied.'}</small></div></article>)}</>
  if (target === 'quests') return <>{data.quests.map((item, index) => <article key={`${item.title}-${index}`}><span className={`status ${item.priority}`}>{item.priority}</span><div><b>{item.title}</b><p>{item.notes || 'No notes.'}</p><small>{item.status}{item.skillNames?.length ? ` · ${item.skillNames.join(', ')}` : item.skillName ? ` · ${item.skillName}` : ''}</small></div></article>)}</>
  if (target === 'tasks') return <>{data.tasks.map((item, index) => <article key={`${item.title}-${index}`}><span className="kind">Task {index + 1}</span><div><b>{item.title}</b><p>{item.notes || 'No extra instructions.'}</p><small>{item.goalTitle}{item.dueDate ? ` · due ${item.dueDate}` : ''}</small></div></article>)}</>
  return <>{data.resources.map((item, index) => <article key={`${item.title}-${index}`}><span className="kind">{item.kind}</span><div><b>{item.title}</b><p>{item.creator || 'Creator not specified'}</p><small>{item.notes || 'No notes.'}</small></div></article>)}</>
}

export function AiImportPanel({ target, mode, goalId, focusSkillIds }: { target: ItemTarget; mode: AiImportMode; goalId?: string; focusSkillIds?: string[] }) {
  const { state, update } = useWorkspace()
  const { language } = useI18n()
  const [request, setRequest] = useState('')
  const [prompt, setPrompt] = useState('')
  const [raw, setRaw] = useState('')
  const [itemPreview, setItemPreview] = useState<BulkImport | null>(null)
  const [assessmentPreview, setAssessmentPreview] = useState<SkillAssessment | null>(null)
  const [message, setMessage] = useState('')
  const [promptCopied, setPromptCopied] = useState(false)
  const [promptReveal, setPromptReveal] = useState(0)
  const promptStepRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (promptReveal) promptStepRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [promptReveal])

  const context = useMemo(() => {
    if (!state) return null
    const profile = state.profiles.find((item) => item.id === state.activeProfileId) ?? state.profiles[0]
    const skills = state.skills.filter((item) => item.profileId === profile.id)
    const existingSkills = skills.map((skill) => ({ name: skill.name, level: skill.level, evidence: skill.evidence, assessmentSummary: skill.assessment?.summary, strengths: skill.assessment?.strengths, growthAreas: skill.assessment?.gaps }))
    const selected = goalId ? state.quests.find((goal) => goal.id === goalId && goal.profileId === profile.id) : undefined
    const selectedSkillIds = [...new Set([...(selected?.skillIds ?? []), ...(selected?.skillId ? [selected.skillId] : [])])]
    const linkedSkills = skills.filter((skill) => selectedSkillIds.includes(skill.id)).map((skill) => existingSkills.find((item) => item.name === skill.name)!).filter(Boolean)
    const supportingResources = selected ? state.resources.filter((resource) => selected.resourceIds?.includes(resource.id)).map((resource) => ({ title: resource.title, kind: resource.kind, status: resource.status, notes: resource.notes })) : []
    const existingTasks = selected ? state.tasks.filter((task) => task.goalId === selected.id).map((task) => ({ title: task.title, notes: task.notes, status: task.status, dueDate: task.dueDate })) : []
    const focusSkills = skills.filter((skill) => focusSkillIds?.includes(skill.id)).map((skill) => existingSkills.find((item) => item.name === skill.name)!).filter(Boolean)
    const activeIncomeSources = state.incomeSources
      .filter((item) => item.profileId === profile.id && item.active)
      .map(({ name, type, monthlyAmount, currency }) => ({ name, type, monthlyAmount, currency }))
    return {
      profile: { title: profile.title, bio: profile.bio },
      financialSnapshot: {
        currentMonthlyIncome: activeIncomeSources.reduce((sum, item) => sum + item.monthlyAmount, 0),
        currency: state.moneyPlan.currency,
        monthlyTarget: state.moneyPlan.monthlyTarget,
        monthlyExpenses: state.moneyPlan.monthlyExpenses,
        savingsGoal: state.moneyPlan.savingsGoal,
        activeIncomeSources,
      },
      existingSkills,
      existingGoals: state.quests.filter((goal) => goal.profileId === profile.id && goal.status !== 'done').map((goal) => ({ title: goal.title, status: goal.status, skillNames: [...new Set([...(goal.skillIds ?? []), ...(goal.skillId ? [goal.skillId] : [])])].map((id) => skills.find((skill) => skill.id === id)?.name).filter((name): name is string => Boolean(name)) })),
      selectedGoal: selected ? { title: selected.title, notes: selected.notes, dueDate: selected.dueDate, linkedSkill: linkedSkills[0] ?? null, linkedSkills, supportingResources, existingTasks } : undefined,
      focusSkills: focusSkills.length ? focusSkills : undefined,
    }
  }, [focusSkillIds, goalId, state])

  if (!state || !context) return null
  const assessment = mode !== 'create'
  const quickEstimate = mode === 'estimate'
  const selectedGoal = context.selectedGoal

  function generatePrompt() {
    if (target === 'tasks' && !selectedGoal) { setMessage('Select a Goal before asking AI to plan its Tasks.'); return }
    if (!request.trim() && target !== 'tasks') { setMessage(assessment ? 'Name the skill and add any useful context.' : `Describe the ${targetCopy[target].label} you want to create.`); return }
    const description = target === 'tasks' ? `Create the missing practical Tasks needed to achieve the selected Goal “${selectedGoal?.title}” using only the saved context.` : request.trim()
    const generated = quickEstimate ? buildQuickSkillEstimatePrompt(description, context!) : assessment ? buildSkillAssessmentPrompt(description, context!) : buildItemPrompt(target, description, context!)
    setPrompt(language === 'hu' ? `${generated}\n\nIMPORTANT LANGUAGE INSTRUCTION: Ask questions and write every human-readable value in natural Hungarian. Keep JSON property names and enum values exactly as specified.` : generated)
    setRaw('')
    setItemPreview(null)
    setAssessmentPreview(null)
    setPromptCopied(false)
    setMessage('Prompt ready. Copy it and paste it into any AI.')
    setPromptReveal((current) => current + 1)
  }

  async function copyPrompt() {
    const copied = await copyText(prompt)
    setPromptCopied(copied)
    setMessage(copied ? 'Prompt copied. Paste it into your preferred AI.' : 'Clipboard access was blocked. Open “Inspect generated prompt” and copy it manually.')
  }

  async function pasteResult() {
    try {
      const value = await navigator.clipboard.readText()
      if (!value.trim()) { setMessage('Your clipboard is empty. Copy the AI’s final response first.'); return }
      setRaw(value)
      setItemPreview(null)
      setAssessmentPreview(null)
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
      validate(value)
    } catch {
      setMessage('Clipboard access was blocked. Allow clipboard access in your browser, then try again.')
    }
  }

  function validate(value: string) {
    if (mode === 'create') {
      const result = parseAiItemResponse(value, target)
      if (result.status === 'invalid') { setItemPreview(null); setMessage(result.reason); return }
      setItemPreview(result.data)
      setMessage('Response validated. Review every item before importing.')
      return
    }
    const result = parseSkillAssessmentResponse(value)
    if (result.status === 'invalid') { setAssessmentPreview(null); setMessage(result.reason); return }
    setAssessmentPreview(result.data)
    setMessage('Assessment validated. Review the level and reasoning before importing.')
  }

  function importItems() {
    if (mode === 'create' && itemPreview) update((current) => applyAiItemImport(current, itemPreview))
    else if (assessment && assessmentPreview) update((current) => applySkillAssessment(current, assessmentPreview))
    else return
    const imported = assessment ? 'assessed skill' : targetCopy[target].label
    setRaw('')
    setItemPreview(null)
    setAssessmentPreview(null)
    setMessage(`Imported ${imported} into your workspace.`)
  }

  const itemCount = itemPreview ? itemPreview[target].length : 0
  return <div className="embedded-ai-flow">
    <section className={target === 'tasks' ? 'panel ai-request-panel task-ai-request-panel' : 'panel ai-request-panel'}>
      {target === 'tasks' ? <><div className="step"><span>1</span><div><h2>Generate Tasks from the selected Goal</h2><p>No extra description is needed. AI will build the plan from everything already connected to this Goal.</p></div></div><div className="task-ai-context-summary"><span><b>{selectedGoal?.linkedSkills?.length ?? 0}</b><small>linked skills</small></span><span><b>{selectedGoal?.supportingResources?.length ?? 0}</b><small>Library resources</small></span><span><b>{selectedGoal?.existingTasks?.length ?? 0}</b><small>existing Tasks</small></span>{selectedGoal?.dueDate && <span><b>{selectedGoal.dueDate}</b><small>Goal deadline</small></span>}</div><button className="primary" onClick={generatePrompt}><Sparkles size={18}/> Generate Task plan</button></> : <><div className="step"><span>1</span><div><h2>{assessment ? 'Describe one skill' : `Describe the ${targetCopy[target].label} you want`}</h2><p>{quickEstimate ? 'Add any experience you already know. The AI will ask one short batch of simple experience questions—no knowledge test.' : assessment ? 'Add your real experience and uncertainties. The AI will interview you and include a short practical knowledge check.' : 'Include enough detail for useful results. Then create the prompt you will send to an AI.'}</p></div></div><label>{assessment ? 'Skill and context' : `What ${targetCopy[target].label} should the AI create?`}<span className="field-guidance">{assessment ? 'Enter exactly one skill. Describe where you use it, tasks you complete independently, concrete experience, and areas where you are uncertain.' : targetCopy[target].guidance}</span><textarea className="request-area" value={request} maxLength={5000} onChange={(event) => setRequest(event.target.value)} placeholder={assessment ? 'Describe one skill, how you use it, experience, and uncertainties.' : targetCopy[target].placeholder}/></label><button className="primary" onClick={generatePrompt}><Sparkles size={18}/> Create AI prompt</button></>}
    </section>

    {prompt && <div className="ai-exchange-grid" ref={promptStepRef}><section className="panel ai-prompt-ready"><div className="step"><span>2</span><div><h2>Copy this prompt into an AI</h2><p>{AI_HANDOFF_COPY.followQuestions}</p></div></div><div className="ai-ready-callout"><Check size={18}/><span><b>Send the whole prompt unchanged</b><small>It already tells the AI which response format to use.</small></span></div><button className={promptCopied ? 'primary copied' : 'primary'} aria-live="polite" onClick={copyPrompt}>{promptCopied ? <Check size={18}/> : <Clipboard size={18}/>} {promptCopied ? 'Copied' : 'Copy prompt'}</button><details className="ai-technical-details"><summary>View prompt text <ChevronDown size={15}/></summary><textarea aria-label="Generated AI prompt" className="code-area" readOnly value={prompt}/></details></section><section className="panel ai-clipboard-import"><div className="step"><span>3</span><div><h2>Import the AI's final answer</h2><p>Use the clipboard button for one-step paste and validation, or paste into the field manually and check it.</p></div></div><textarea aria-label="AI response JSON" className="code-area" value={raw} onChange={(event) => setRaw(event.target.value)} placeholder="The AI's final answer will appear here"/><div className="ai-response-actions"><button className="primary ai-paste-button" onClick={() => void pasteResult()}><ClipboardPaste size={18}/> Paste and check clipboard</button><button className="secondary" disabled={!raw.trim()} onClick={() => validate(raw)}>Check response</button></div></section></div>}

    {message && <p className="notice" role="status">{message}</p>}
    {itemPreview && <section className="panel preview ai-import-preview"><p className="eyebrow">REVIEW BEFORE SAVING</p><h2>{itemCount} {targetCopy[target].label} ready</h2><ItemPreview data={itemPreview} target={target}/><button className="primary" onClick={importItems}><Upload size={18}/> Save {itemCount} items</button></section>}
    {assessmentPreview && <section className="panel preview ai-import-preview assessment-preview"><p className="eyebrow">ASSESSMENT PREVIEW</p><h2>{assessmentPreview.skill.name}: level {assessmentPreview.skill.level}/10</h2><div className="assessment-preview-head"><b>{assessmentPreview.skill.category}</b></div><div className="assessment-preview-grid"><section><span className="skill-section-label">Assessment summary</span><p>{assessmentPreview.skill.assessmentSummary}</p></section><section><span className="skill-section-label">Experience</span><p>{assessmentPreview.skill.evidence || 'No concrete experience recorded.'}</p></section><section><span className="skill-section-label">Demonstrated strengths</span><ul>{assessmentPreview.skill.strengths.map((item) => <li key={item}>{item}</li>)}</ul></section><section><span className="skill-section-label">Growth areas</span><ul>{assessmentPreview.skill.gaps.map((item) => <li key={item}>{item}</li>)}</ul></section></div><p className="assessment-note">AI assessment is an estimate, not a credential. Keep the level only if the reasoning matches the experience.</p><button className="primary" onClick={importItems}><Upload size={18}/> Import assessed skill</button></section>}
  </div>
}
