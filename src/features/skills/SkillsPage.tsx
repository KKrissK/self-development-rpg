import { useEffect, useState } from 'react'
import { AlertTriangle, Check, FileCheck2, LayoutGrid, List, Plus, Sparkles, Trash2, X } from 'lucide-react'
import { uid, useWorkspace } from '../../app/AppState'
import type { Skill } from '../../domain/model'
import { AiImportPanel } from '../ai-builder/AiImportPanel'

type SkillDraft = Omit<Skill, 'id' | 'profileId'>
type SkillView = 'cards' | 'list'

function skillProfile(skill?: Skill) {
  if (!skill) return { evidence: '', assessment: undefined, legacyTruncated: false }
  if (skill.assessment) return { evidence: skill.evidence, assessment: skill.assessment, legacyTruncated: false }
  const legacy = skill.evidence.match(/^AI assessment \((low|medium|high) confidence\):\s*([\s\S]*?)(?:\n\nEvidence:\s*([\s\S]*))?$/i)
  if (!legacy) return { evidence: skill.evidence, assessment: undefined, legacyTruncated: false }
  const evidence = legacy[3]?.trim() ?? ''
  return { evidence, assessment: { summary: legacy[2].trim(), strengths: [], gaps: [] }, legacyTruncated: evidence.endsWith('…') }
}

const listFromField = (value: FormDataEntryValue | null) => String(value ?? '').split(/\r?\n/).map((item) => item.trim()).filter(Boolean).slice(0, 8).map((item) => item.slice(0, 200))
const skillSummary = (skill: Skill) => skillProfile(skill).assessment?.summary || skillProfile(skill).evidence || 'No experience added yet.'

function SkillEditor({ skill, onSave, onCancel }: { skill?: Skill; onSave: (draft: SkillDraft) => void; onCancel: () => void }) {
  const profile = skillProfile(skill)
  const [includeAssessment, setIncludeAssessment] = useState(Boolean(profile.assessment))
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    onSave({
      name: String(form.get('name')).trim(), category: String(form.get('category')).trim(), level: Number(form.get('level')), targetLevel: Number(form.get('target')), status: form.get('status') as Skill['status'], evidence: String(form.get('evidence')).trim(),
      assessment: includeAssessment ? { summary: String(form.get('assessmentSummary')).trim(), strengths: listFromField(form.get('strengths')), gaps: listFromField(form.get('gaps')) } : undefined,
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

function SkillCardPreview({ skill, onOpen }: { skill: Skill; onOpen: () => void }) {
  const profile = skillProfile(skill)
  return <section className="skill-summary skill-card-summary"><span className="skill-section-label">{profile.assessment ? 'Assessment summary' : 'Experience'}</span><p>{profile.assessment?.summary || profile.evidence || 'No experience added yet.'}</p><button className="skill-profile-button" onClick={onOpen}>View full skill</button></section>
}

function SkillDialog({ skill, onClose, onEdit }: { skill: Skill; onClose: () => void; onEdit: () => void }) {
  const profile = skillProfile(skill)
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', escape)
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener('keydown', escape) }
  }, [onClose])

  return <div className="skill-dialog-backdrop" role="presentation" onMouseDown={onClose}><section className="skill-dialog" role="dialog" aria-modal="true" aria-labelledby="skill-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
    <header><div><span className="kind">{skill.category || 'General'}</span><h2 id="skill-dialog-title">{skill.name}</h2><p>{skill.status} · current level {skill.level} · target {skill.targetLevel}</p></div><button className="icon-btn" autoFocus aria-label="Close skill details" onClick={onClose}><X size={19}/></button></header>
    <div className="skill-dialog-level"><b>{skill.level}<small>/10</small></b><div><span><i style={{ width: `${skill.level * 10}%` }}/><em style={{ left: `${skill.targetLevel * 10}%` }}/></span><small>Current {skill.level} · Target {skill.targetLevel}</small></div></div>
    {profile.assessment && <section><span className="skill-section-label">Assessment summary</span><p>{profile.assessment.summary}</p></section>}
    <section><span className="skill-section-label"><FileCheck2 size={14}/> Experience</span><p>{profile.evidence || 'No experience added yet.'}</p>{profile.legacyTruncated && <small className="legacy-truncation-note">This older assessment was shortened when imported. Edit or reassess the skill to replace the missing detail.</small>}</section>
    {profile.assessment && <div className="skill-dialog-columns"><section><span className="skill-section-label"><Check size={14}/> Demonstrated strengths</span>{profile.assessment.strengths.length ? <ul>{profile.assessment.strengths.map((item) => <li key={item}>{item}</li>)}</ul> : <p>No separate strengths recorded.</p>}</section><section><span className="skill-section-label"><AlertTriangle size={14}/> Growth areas</span>{profile.assessment.gaps.length ? <ul>{profile.assessment.gaps.map((item) => <li key={item}>{item}</li>)}</ul> : <p>No separate growth areas recorded.</p>}</section></div>}
    <footer><button className="secondary" onClick={onClose}>Close</button><button className="primary" onClick={onEdit}>Edit skill</button></footer>
  </section></div>
}

export function SkillsPage() {
  const { state, update } = useWorkspace()
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [view, setView] = useState<SkillView>('cards')
  const [addMethod, setAddMethod] = useState<'manual' | 'ai-create' | 'ai-assess'>('ai-assess')
  if (!state) return null
  const profileId = state.activeProfileId
  const skills = state.skills.filter((skill) => skill.profileId === profileId)
  const editingSkill = skills.find((skill) => skill.id === editingId)
  const selectedSkill = skills.find((skill) => skill.id === selectedId)

  function add(draft: SkillDraft) { update((current) => ({ ...current, skills: [{ id: uid(), profileId, ...draft }, ...current.skills] })); setAdding(false) }
  function edit(skillId: string, draft: SkillDraft) { update((current) => ({ ...current, skills: current.skills.map((skill) => skill.id === skillId ? { ...skill, ...draft } : skill) })); setEditingId(null) }
  function updateStatus(skillId: string, status: Skill['status']) { update((current) => ({ ...current, skills: current.skills.map((skill) => skill.id === skillId ? { ...skill, status } : skill) })) }
  function remove(skill: Skill) {
    if (!confirm(`Delete “${skill.name}”? This removes it from your skill profile. Linked Goals and Library items will remain, but lose this skill connection.`)) return
    update((current) => ({ ...current, skills: current.skills.filter((item) => item.id !== skill.id), quests: current.quests.map((goal) => goal.skillId === skill.id ? { ...goal, skillId: undefined } : goal), resources: current.resources.map((resource) => resource.skillId === skill.id ? { ...resource, skillId: undefined } : resource) }))
    if (selectedId === skill.id) setSelectedId(null)
  }
  const beginEdit = (skill: Skill) => { setSelectedId(null); setEditingId(skill.id); setAdding(false) }

  return <div className="page skills-page">
    <header className="page-head"><div><p className="eyebrow">CAPABILITY INVENTORY</p><h1>Skills</h1><p>Track ability through real experience—not vibes.</p></div><div className="skills-head-actions"><div className="skill-view-switch" role="group" aria-label="Skill view"><button aria-label="Card view" aria-pressed={view === 'cards'} className={view === 'cards' ? 'active' : ''} onClick={() => setView('cards')}><LayoutGrid size={17}/> Cards</button><button aria-label="List view" aria-pressed={view === 'list'} className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}><List size={17}/> List</button></div><button className="primary" onClick={() => { setAdding(!adding); setEditingId(null) }}><Plus size={18}/> {adding ? 'Close add' : 'Add skill'}</button></div></header>
    {adding && <section className="add-workbench"><div className="add-method-switch three" role="tablist" aria-label="Skill add method"><button role="tab" aria-selected={addMethod === 'ai-assess'} className={addMethod === 'ai-assess' ? 'active' : ''} onClick={() => setAddMethod('ai-assess')}><Check size={17}/><span><b>AI assessment</b><small>Interview one skill and estimate its level</small></span></button><button role="tab" aria-selected={addMethod === 'manual'} className={addMethod === 'manual' ? 'active' : ''} onClick={() => setAddMethod('manual')}><Plus size={17}/><span><b>Manual</b><small>Add a skill and optional profile yourself</small></span></button><button role="tab" aria-selected={addMethod === 'ai-create'} className={addMethod === 'ai-create' ? 'active' : ''} onClick={() => setAddMethod('ai-create')}><Sparkles size={17}/><span><b>AI generate</b><small>Create several skills from one description</small></span></button></div>{addMethod === 'manual' ? <SkillEditor onSave={add} onCancel={() => setAdding(false)}/> : <AiImportPanel key={addMethod} target="skills" mode={addMethod === 'ai-assess' ? 'assess' : 'create'}/>}</section>}
    {editingSkill && <section className="add-workbench skill-editor-workbench"><SkillEditor skill={editingSkill} onSave={(draft) => edit(editingSkill.id, draft)} onCancel={() => setEditingId(null)}/></section>}
    {skills.length > 0 && <div className="skill-inventory-bar"><span><b>{skills.length}</b> skill{skills.length === 1 ? '' : 's'}</span><small>{view === 'cards' ? 'Card view keeps context visible.' : 'List view is optimized for scanning a larger inventory.'}</small></div>}
    {view === 'cards' ? <div className="card-grid skills-grid">{skills.map((skill) => <article className="panel skill-card" key={skill.id}><div className="panel-title"><div><span className="kind">{skill.category || 'General'}</span><h2>{skill.name}</h2></div><b className="skill-level">{skill.level}<small>/10</small></b></div><div className="skill-level-context"><span>Current level {skill.level}</span><span>Target {skill.targetLevel}</span></div><div className="meter"><i style={{ width: `${skill.level * 10}%` }}/><em style={{ left: `${skill.targetLevel * 10}%` }}/></div><SkillCardPreview skill={skill} onOpen={() => setSelectedId(skill.id)}/><div className="row-actions"><select aria-label={`${skill.name} status`} value={skill.status} onChange={(event) => updateStatus(skill.id, event.target.value as Skill['status'])}><option value="learning">Learning</option><option value="practicing">Practicing</option><option value="proven">Proven</option></select><div className="skill-card-actions"><button className="secondary" onClick={() => beginEdit(skill)}>Edit</button><button className="icon-btn" aria-label={`Delete ${skill.name}`} onClick={() => remove(skill)}><Trash2 size={17}/></button></div></div></article>)}</div> : <div className="skill-list-view">{skills.map((skill) => <article className="skill-list-row" key={skill.id}><button className="skill-list-open" onClick={() => setSelectedId(skill.id)}><span className="kind">{skill.category || 'General'}</span><b>{skill.name}</b><small>{skillSummary(skill)}</small></button><div className="skill-list-level"><b>{skill.level}<small>/10</small></b><span>Target {skill.targetLevel}</span></div><select aria-label={`${skill.name} status`} value={skill.status} onChange={(event) => updateStatus(skill.id, event.target.value as Skill['status'])}><option value="learning">Learning</option><option value="practicing">Practicing</option><option value="proven">Proven</option></select><div className="skill-list-actions"><button className="secondary" onClick={() => setSelectedId(skill.id)}>View</button><button className="secondary" onClick={() => beginEdit(skill)}>Edit</button><button className="icon-btn" aria-label={`Delete ${skill.name}`} onClick={() => remove(skill)}><Trash2 size={17}/></button></div></article>)}</div>}
    {!skills.length && <p className="empty">Your skill map is empty. Start with one thing you can demonstrate.</p>}
    {selectedSkill && <SkillDialog skill={selectedSkill} onClose={() => setSelectedId(null)} onEdit={() => beginEdit(selectedSkill)}/>}
  </div>
}
