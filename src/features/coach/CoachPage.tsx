import { useMemo, useState } from 'react'
import { BookOpen, Clipboard, Sparkles, Upload } from 'lucide-react'
import { uid, useWorkspace } from '../../app/AppState'
import { addQuest } from '../../domain/actions'
import { priorityForGoalDifficulty } from '../../domain/goalRewards'
import type { LearningResource } from '../../domain/model'
import { copyText } from '../../platform/clipboard'
import { buildCoachPrompt, parseCoachResponse, type CoachResponse } from './coachExchange'
import { useI18n } from '../../i18n/I18n'
import { AI_HANDOFF_COPY } from '../../content/aiHandoff'

const today = () => new Date().toISOString()
const normalized = (value: string) => value.trim().toLocaleLowerCase()

export function CoachPage() {
  const { state, update } = useWorkspace()
  const { language } = useI18n()
  const [raw, setRaw] = useState('')
  const [preview, setPreview] = useState<CoachResponse | null>(null)
  const [message, setMessage] = useState('')

  const context = useMemo(() => {
    if (!state) return null
    const profile = state.profiles.find((item) => item.id === state.activeProfileId) ?? state.profiles[0]
    const skills = state.skills.filter((item) => item.profileId === profile.id)
    const resources = state.resources.filter((item) => item.profileId === profile.id)
    const skillName = (id?: string) => skills.find((skill) => skill.id === id)?.name
    return {
      profile,
      prompt: buildCoachPrompt({
        profile: { name: profile.name, title: profile.title, bio: profile.bio },
        skills: skills.map((skill) => ({
          name: skill.name,
          category: skill.category,
          level: skill.level,
          status: skill.status,
          experience: skill.evidence,
          assessmentSummary: skill.assessment?.summary ?? '',
          strengths: skill.assessment?.strengths ?? [],
          growthAreas: skill.assessment?.gaps ?? [],
        })),
        currentGoals: state.quests.filter((goal) => goal.profileId === profile.id && goal.status !== 'done').map((goal) => ({
          title: goal.title,
          notes: goal.notes,
          status: goal.status,
          priority: goal.priority,
          dueDate: goal.dueDate,
          relatedSkill: skillName(goal.skillId),
          supportingLibraryItems: resources.filter((resource) => goal.resourceIds?.includes(resource.id)).map((resource) => resource.title),
        })),
        currentLibrary: resources.map((resource) => ({ title: resource.title, kind: resource.kind, status: resource.status, relatedSkill: skillName(resource.skillId) })),
      }) + (language === 'hu' ? '\n\nIMPORTANT LANGUAGE INSTRUCTION: Write every human-readable value in natural Hungarian. Keep JSON property names and enum values exactly as specified.' : ''),
    }
  }, [language, state])

  if (!state || !context) return null

  function validate() {
    const result = parseCoachResponse(raw)
    if (result.status === 'invalid') { setMessage(result.reason); setPreview(null); return }
    setPreview(result.data)
    setMessage('Response validated. Review every recommendation before importing.')
  }

  async function copyPrompt() {
    const copied = await copyText(context!.prompt)
    setMessage(copied ? 'Context prompt copied.' : 'Clipboard access was blocked. Select and copy the prompt manually.')
  }

  function importItems() {
    if (!preview) return
    update((current) => {
      let next = current
      const resources = [...current.resources]
      const advice = [...current.advice]
      const profileId = current.activeProfileId
      const findSkillId = (name?: string) => name ? current.skills.find((skill) => skill.profileId === profileId && normalized(skill.name) === normalized(name))?.id : undefined

      for (const item of preview.recommendations) {
        if (item.kind === 'goal' || item.kind === 'quest') {
          next = addQuest(next, { title: item.title, notes: `${item.rationale}\nNext: ${item.nextStep}`, priority: priorityForGoalDifficulty(item.difficulty), status: 'next' })
          continue
        }
        if (item.kind === 'advice') {
          advice.unshift({ id: uid(), profileId, title: item.title, rationale: item.rationale, nextStep: item.nextStep, impact: item.impact, importedAt: today() })
          continue
        }
        if (item.kind !== 'library') continue

        const existing = resources.find((resource) => resource.profileId === profileId && normalized(resource.title) === normalized(item.title))
        const resourceId = existing?.id ?? uid()
        if (!existing) {
          const resource: LearningResource = { id: resourceId, profileId, title: item.title, kind: item.resourceKind, status: 'queued', creator: item.creator, url: item.url, skillId: findSkillId(item.skillName), notes: `${item.rationale}\nNext: ${item.nextStep}` }
          resources.unshift(resource)
        }
        if (item.supportsGoalTitle) {
          next = { ...next, quests: next.quests.map((goal) => goal.profileId === profileId && goal.status !== 'done' && normalized(goal.title) === normalized(item.supportsGoalTitle!) ? { ...goal, resourceIds: [...new Set([...(goal.resourceIds ?? []), resourceId])] } : goal) }
        }
      }
      return { ...next, resources, advice }
    })
    setRaw('')
    setPreview(null)
    setMessage('Imported recommendations. Library items were connected to matching Goals where requested.')
  }

  const libraryCount = preview?.recommendations.filter((item) => item.kind === 'library').length ?? 0
  return <div className="page coach-page">
    <header className="page-head"><div><p className="eyebrow">COPY, ASK, IMPORT</p><h1>AI Coach</h1><p>Send your workspace context to an AI, then bring its recommendations back here.</p></div></header>
    <section className="coach-context-strip"><span><Sparkles size={15}/><b>{context.profile.name}</b></span><span>{state.skills.filter((skill) => skill.profileId === context.profile.id).length} skills</span><span>{state.quests.filter((goal) => goal.profileId === context.profile.id && goal.status !== 'done').length} active Goals</span><span>{state.resources.filter((resource) => resource.profileId === context.profile.id).length} Library items</span></section>
    <div className="coach-grid"><section className="panel"><div className="step"><span>1</span><div><h2>Ask an AI for recommendations</h2><p>{AI_HANDOFF_COPY.sendUnchanged}</p></div></div><textarea aria-label="AI context prompt" className="code-area" readOnly value={context.prompt}/><button className="primary" onClick={copyPrompt}><Clipboard size={18}/> Copy prompt</button></section><section className="panel"><div className="step"><span>2</span><div><h2>Paste the final answer here</h2><p>Copy the AI's final answer, paste the entire answer below, then click Check response. You can review everything before saving.</p></div></div><textarea aria-label="AI response JSON" className="code-area" value={raw} onChange={(event) => setRaw(event.target.value)} placeholder="Paste the AI's final answer here"/><button className="secondary" disabled={!raw.trim()} onClick={validate}>Check response</button></section></div>
    {message && <p className="notice" role="status">{message}</p>}
    {state.advice.filter((item) => item.profileId === context.profile.id).length > 0 && <section className="panel preview"><p className="eyebrow">SAVED ADVICE</p>{state.advice.filter((item) => item.profileId === context.profile.id).map((item) => <article key={item.id}><span className={`status ${item.impact}`}>{item.impact}</span><div><b>{item.title}</b><p>{item.rationale}</p><small>Next: {item.nextStep}</small></div></article>)}</section>}
    {preview && <section className="panel preview coach-preview"><p className="eyebrow">IMPORT PREVIEW</p><h2>{preview.summary}</h2>{preview.recommendations.map((item, index) => <article key={`${item.title}-${index}`}><span className={item.kind === 'library' ? 'coach-kind library' : `status ${item.impact}`}>{item.kind === 'library' ? <BookOpen size={14}/> : item.impact}</span><div><b>{item.title}</b><p>{item.rationale}</p><small>Next: {item.nextStep}{item.kind === 'library' && item.supportsGoalTitle ? ` · Supports ${item.supportsGoalTitle}` : ''}</small></div></article>)}<button className="primary" aria-label={`Import ${preview.recommendations.length} items`} onClick={importItems}><Upload size={18}/> Import {preview.recommendations.length} recommendations{libraryCount ? ` · ${libraryCount} to Library` : ''}</button></section>}
  </div>
}
