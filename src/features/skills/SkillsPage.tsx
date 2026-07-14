import { useState } from 'react'
import { AlertTriangle, Check, ChevronDown, FileCheck2, Plus, Sparkles, Trash2 } from 'lucide-react'
import { uid, useWorkspace } from '../../app/AppState'
import type { Skill } from '../../domain/model'
import { AiImportPanel } from '../ai-builder/AiImportPanel'

type SkillDraft = Omit<Skill, 'id' | 'profileId'>

function skillProfile(skill?: Skill) {
  if (!skill) return { evidence: '', assessment: undefined, legacyTruncated: false }
  if (skill.assessment) return { evidence: skill.evidence, assessment: skill.assessment, legacyTruncated: false }
  const legacy = skill.evidence.match(/^AI assessment \((low|medium|high) confidence\):\s*([\s\S]*?)(?:\n\nEvidence:\s*([\s\S]*))?$/i)
  if (!legacy) return { evidence: skill.evidence, assessment: undefined, legacyTruncated: false }
  const evidence = legacy[3]?.trim() ?? ''
  return {
    evidence,
    assessment: {
      summary: legacy[2].trim(),
      strengths: [],
      gaps: [],
    },
    legacyTruncated: evidence.endsWith('…'),
  }
}

const listFromField = (value: FormDataEntryValue | null) => String(value ?? '').split(/\r?\n/).map((item) => item.trim()).filter(Boolean).slice(0, 8).map((item) => item.slice(0, 200))

function SkillEditor({ skill, onSave, onCancel }: { skill?: Skill; onSave: (draft: SkillDraft) => void; onCancel: () => void }) {
  const profile = skillProfile(skill)
  const [includeAssessment, setIncludeAssessment] = useState(Boolean(profile.assessment))
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    onSave({
      name: String(form.get('name')).trim(),
      category: String(form.get('category')).trim(),
      level: Number(form.get('level')),
      targetLevel: Number(form.get('target')),
      status: form.get('status') as Skill['status'],
      evidence: String(form.get('evidence')).trim(),
      assessment: includeAssessment ? {
        summary: String(form.get('assessmentSummary')).trim(),
        strengths: listFromField(form.get('strengths')),
        gaps: listFromField(form.get('gaps')),
      } : undefined,
    })
  }

  return <form className="inline-form skill-edit-form" onSubmit={submit}>
    <label>Skill name<input name="name" required maxLength={100} defaultValue={skill?.name}/></label>
    <label>Category<input name="category" maxLength={60} defaultValue={skill?.category} placeholder="Technical, business…"/></label>
    <label>Current level (1–10)<input name="level" type="number" min="1" max="10" defaultValue={skill?.level ?? 3}/></label>
    <label>Target level (1–10)<input name="target" type="number" min="1" max="10" defaultValue={skill?.targetLevel ?? 7}/></label>
    <label>Status<select name="status" defaultValue={skill?.status ?? 'learning'}><option value="learning">Learning</option><option value="practicing">Practicing</option><option value="proven">Proven</option></select></label>
    <label className="wide">Experience<textarea name="evidence" maxLength={1000} defaultValue={profile.evidence} placeholder="Work you handled, projects, outcomes, or certificates…"/></label>
    <label className="assessment-profile-toggle"><input aria-label="Include structured skill profile" type="checkbox" checked={includeAssessment} onChange={(event) => setIncludeAssessment(event.target.checked)}/><span><b>Structured skill profile</b><small>Optionally add your own summary, demonstrated strengths, and growth areas.</small></span></label>
    {includeAssessment && <fieldset className="assessment-edit-fields"><legend>Structured profile</legend><label className="assessment-summary-field">Assessment summary<textarea name="assessmentSummary" required maxLength={1000} defaultValue={profile.assessment?.summary ?? ''} placeholder="Summarize the current level, independent ability, and meaningful limitations."/></label><label>Demonstrated strengths<textarea name="strengths" maxLength={1000} defaultValue={profile.assessment?.strengths.join('\n') ?? ''} placeholder="One demonstrated strength per line"/></label><label>Growth areas<textarea name="gaps" maxLength={1000} defaultValue={profile.assessment?.gaps.join('\n') ?? ''} placeholder="One concrete growth area per line"/></label></fieldset>}
    <div className="form-actions"><button className="primary" type="submit">{skill ? 'Save changes' : 'Save skill'}</button><button className="secondary" type="button" onClick={onCancel}>Cancel</button></div>
  </form>
}

function Experience({ text, legacyTruncated = false }: { text: string; legacyTruncated?: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const long = text.length > 280
  return <div className="experience-copy">
    <p className={long && !expanded ? 'experience-text collapsed' : 'experience-text'}>{text || 'No experience added yet.'}</p>
    {long && <button type="button" className="experience-toggle" aria-expanded={expanded} onClick={() => setExpanded((open) => !open)}>{expanded ? 'Show less' : 'Read full experience'}</button>}
    {legacyTruncated && <small className="legacy-truncation-note">This older AI assessment was shortened when it was imported. Edit this skill or reassess it to replace the missing detail.</small>}
  </div>
}

function SkillProfile({ skill }: { skill: Skill }) {
  const profile = skillProfile(skill)
  if (!profile.assessment) return <section className="skill-evidence"><span className="skill-section-label">Experience</span><Experience text={profile.evidence}/></section>
  const { assessment } = profile
  return <div className="skill-profile">
    <section className="skill-summary"><span className="skill-section-label">Assessment summary</span><p>{assessment.summary}</p></section>
    <details className="skill-details"><summary>View skill profile <ChevronDown size={16}/></summary><div className="skill-detail-grid">
      <section><span className="skill-section-label"><FileCheck2 size={14}/> Experience</span><Experience text={profile.evidence} legacyTruncated={profile.legacyTruncated}/></section>
      <section><span className="skill-section-label"><Check size={14}/> Demonstrated strengths</span>{assessment.strengths.length ? <ul>{assessment.strengths.map((item) => <li key={item}>{item}</li>)}</ul> : <p>No separate strengths were supplied by this earlier assessment.</p>}</section>
      <section><span className="skill-section-label"><AlertTriangle size={14}/> Growth areas</span>{assessment.gaps.length ? <ul>{assessment.gaps.map((item) => <li key={item}>{item}</li>)}</ul> : <p>No separate growth areas were supplied by this earlier assessment.</p>}</section>
    </div></details>
  </div>
}

export function SkillsPage() {
  const { state, update } = useWorkspace()
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [addMethod, setAddMethod] = useState<'manual' | 'ai-create' | 'ai-assess'>('ai-assess')
  if (!state) return null
  const profileId = state.activeProfileId

  function add(draft: SkillDraft) {
    update((current) => ({ ...current, skills: [{ id: uid(), profileId, ...draft }, ...current.skills] }))
    setAdding(false)
  }

  function edit(skillId: string, draft: SkillDraft) {
    update((current) => ({ ...current, skills: current.skills.map((skill) => skill.id === skillId ? { ...skill, ...draft } : skill) }))
    setEditingId(null)
  }

  return <div className="page">
    <header className="page-head"><div><p className="eyebrow">CAPABILITY INVENTORY</p><h1>Skills</h1><p>Track ability through real experience—not vibes.</p></div><button className="primary" onClick={() => { setAdding(!adding); setEditingId(null) }}><Plus size={18}/> {adding ? 'Close add' : 'Add skill'}</button></header>
    {adding && <section className="add-workbench"><div className="add-method-switch three" role="tablist" aria-label="Skill add method"><button role="tab" aria-selected={addMethod === 'ai-assess'} className={addMethod === 'ai-assess' ? 'active' : ''} onClick={() => setAddMethod('ai-assess')}><Check size={17}/><span><b>AI assessment</b><small>Interview one skill and estimate its level</small></span></button><button role="tab" aria-selected={addMethod === 'manual'} className={addMethod === 'manual' ? 'active' : ''} onClick={() => setAddMethod('manual')}><Plus size={17}/><span><b>Manual</b><small>Add a skill and optional profile yourself</small></span></button><button role="tab" aria-selected={addMethod === 'ai-create'} className={addMethod === 'ai-create' ? 'active' : ''} onClick={() => setAddMethod('ai-create')}><Sparkles size={17}/><span><b>AI generate</b><small>Create several skills from one description</small></span></button></div>{addMethod === 'manual' ? <SkillEditor onSave={add} onCancel={() => setAdding(false)}/> : <AiImportPanel key={addMethod} target="skills" mode={addMethod === 'ai-assess' ? 'assess' : 'create'}/>}</section>}
    <div className="card-grid skills-grid">{state.skills.map((skill) => editingId === skill.id
      ? <SkillEditor key={skill.id} skill={skill} onSave={(draft) => edit(skill.id, draft)} onCancel={() => setEditingId(null)}/>
      : <article className="panel skill-card" key={skill.id}><div className="panel-title"><div><span className="kind">{skill.category || 'General'}</span><h2>{skill.name}</h2></div><b className="skill-level">{skill.level}<small>/10</small></b></div><div className="skill-level-context"><span>Current level {skill.level}</span><span>Target {skill.targetLevel}</span></div><div className="meter"><i style={{ width: `${skill.level * 10}%` }}/><em style={{ left: `${skill.targetLevel * 10}%` }}/></div><SkillProfile skill={skill}/><div className="row-actions"><select aria-label={`${skill.name} status`} value={skill.status} onChange={(event) => update((current) => ({ ...current, skills: current.skills.map((item) => item.id === skill.id ? { ...item, status: event.target.value as Skill['status'] } : item) }))}><option value="learning">Learning</option><option value="practicing">Practicing</option><option value="proven">Proven</option></select><div className="skill-card-actions"><button className="secondary" onClick={() => { setEditingId(skill.id); setAdding(false) }}>Edit</button><button className="icon-btn" aria-label={`Delete ${skill.name}`} onClick={() => update((current) => ({ ...current, skills: current.skills.filter((item) => item.id !== skill.id) }))}><Trash2 size={17}/></button></div></div></article>)}</div>
    {!state.skills.length && <p className="empty">Your skill map is empty. Start with one thing you can demonstrate.</p>}
  </div>
}
