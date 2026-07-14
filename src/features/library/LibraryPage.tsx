import { useState } from 'react'
import { BookOpen, Check, CheckCircle2, ExternalLink, Link2, Plus, Sparkles, Trash2 } from 'lucide-react'
import { uid, useWorkspace } from '../../app/AppState'
import type { LearningResource } from '../../domain/model'
import { AiImportPanel } from '../ai-builder/AiImportPanel'

type LibraryFilter = 'all' | 'linked' | 'unlinked' | 'completed'

export function LibraryPage() {
  const { state, update } = useWorkspace()
  const [adding, setAdding] = useState(false)
  const [addMethod, setAddMethod] = useState<'manual' | 'ai'>('manual')
  const [filter, setFilter] = useState<LibraryFilter>('all')
  if (!state) return null
  const profileId = state.activeProfileId
  const resources = state.resources.filter((resource) => resource.profileId === profileId)
  const goals = state.quests.filter((goal) => goal.profileId === profileId)
  const linkedGoals = (resourceId: string) => goals.filter((goal) => goal.resourceIds?.includes(resourceId))
  const linkedCount = resources.filter((resource) => linkedGoals(resource.id).length > 0).length
  const activeSupportCount = resources.filter((resource) => linkedGoals(resource.id).some((goal) => goal.status !== 'done')).length
  const visibleResources = resources.filter((resource) => filter === 'all' || filter === 'completed' && resource.status === 'completed' || filter === 'linked' && linkedGoals(resource.id).length > 0 || filter === 'unlinked' && linkedGoals(resource.id).length === 0)

  function add(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const item: LearningResource = { id: uid(), profileId, title: String(form.get('title')).trim(), kind: form.get('kind') as LearningResource['kind'], status: 'queued', creator: String(form.get('creator')).trim(), url: String(form.get('url')).trim(), notes: String(form.get('notes')).trim(), skillId: String(form.get('skillId')) || undefined }
    update((current) => ({ ...current, resources: [item, ...current.resources] }))
    setAdding(false)
  }

  function deleteResource(resource: LearningResource) {
    if (!confirm(`Delete “${resource.title}” from Library? It will also be detached from linked Goals.`)) return
    update((current) => ({ ...current, resources: current.resources.filter((item) => item.id !== resource.id), quests: current.quests.map((goal) => ({ ...goal, resourceIds: goal.resourceIds?.filter((id) => id !== resource.id) })) }))
  }

  return <div className="page library-page">
    <header className="page-head"><div><p className="eyebrow">KNOWLEDGE IN SERVICE OF OUTCOMES</p><h1>Library</h1><p>Collect useful material, connect it to Goals, and see what your learning helped move forward.</p></div><button className="primary" onClick={() => setAdding((open) => !open)}><Plus size={18}/>{adding ? 'Close add' : 'Add resource'}</button></header>
    <section className="library-overview" aria-label="Library overview"><div className="library-stat"><span>Total resources</span><b>{resources.length}</b><small>Your complete learning inventory</small></div><div className="library-stat"><span>Supporting active Goals</span><b>{activeSupportCount}</b><small>Resources currently attached to an outcome</small></div><div className="library-stat"><span>Goal-linked</span><b>{linkedCount}</b><small>{resources.filter((resource) => linkedGoals(resource.id).some((goal) => goal.status === 'done')).length} helped a completed Goal</small></div></section>
    {adding && <section className="add-workbench"><div className="add-method-switch" role="tablist" aria-label="Library add method"><button role="tab" aria-selected={addMethod === 'manual'} className={addMethod === 'manual' ? 'active' : ''} onClick={() => setAddMethod('manual')}><Plus size={17}/><span><b>Manual</b><small>Add one known resource</small></span></button><button role="tab" aria-selected={addMethod === 'ai'} className={addMethod === 'ai' ? 'active' : ''} onClick={() => setAddMethod('ai')}><Sparkles size={17}/><span><b>AI generate</b><small>Build a focused learning set</small></span></button></div>{addMethod === 'manual' ? <form className="inline-form library-add-form" onSubmit={add}><label>Title<input name="title" required maxLength={200}/></label><label>Type<select name="kind"><option>book</option><option>video</option><option>course</option><option>article</option><option>podcast</option><option>other</option></select></label><label>Creator<input name="creator" maxLength={120}/></label><label>Link<input name="url" type="url" placeholder="https://…"/></label><label>Related skill<select name="skillId" defaultValue=""><option value="">No linked skill</option>{state.skills.filter((skill) => skill.profileId === profileId).map((skill) => <option key={skill.id} value={skill.id}>{skill.name}</option>)}</select></label><label className="wide">Notes<textarea name="notes" maxLength={2000} placeholder="Why this matters or what to focus on…"/></label><div className="form-actions"><button type="button" className="secondary" onClick={() => setAdding(false)}>Cancel</button><button className="primary" type="submit">Add to Library</button></div></form> : <AiImportPanel key="library-ai" target="resources" mode="create"/>}</section>}
    <div className="library-toolbar" role="tablist" aria-label="Library filters">{([['all', 'All'], ['linked', 'Goal-linked'], ['unlinked', 'Unlinked'], ['completed', 'Consumed']] as const).map(([value, label]) => <button key={value} role="tab" aria-selected={filter === value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{label}</button>)}</div>
    {visibleResources.length ? <div className="library-grid">{visibleResources.map((resource) => {
      const relatedGoals = linkedGoals(resource.id)
      const completedGoals = relatedGoals.filter((goal) => goal.status === 'done')
      return <article className="panel library-card" key={resource.id}>
        <div className="library-card-head"><span className="resource-icon"><BookOpen size={19}/></span><div><span className="kind">{resource.kind}</span><h2>{resource.title}</h2><small>{resource.creator || 'Creator not recorded'}</small></div><button className="icon-btn" aria-label={`Delete ${resource.title}`} onClick={() => deleteResource(resource)}><Trash2 size={17}/></button></div>
        {completedGoals.length > 0 && <div className="goal-impact"><CheckCircle2 size={16}/><span><b>Goal completed</b><small>{completedGoals.map((goal) => goal.title).join(', ')}</small></span></div>}
        {resource.notes && <p className="library-notes">{resource.notes}</p>}
        <section className="library-goal-links"><span className="skill-section-label"><Link2 size={14}/> Goal connections</span>{relatedGoals.length ? <div>{relatedGoals.map((goal) => <span className={goal.status === 'done' ? 'goal-link-pill done' : 'goal-link-pill'} key={goal.id}>{goal.status === 'done' && <Check size={12}/>}<span>{goal.title}</span><small>{goal.status}</small></span>)}</div> : <p>Not supporting a Goal yet. Pull it in while creating or editing a Goal.</p>}</section>
        <div className="library-card-actions"><label>Learning status<select aria-label={`${resource.title} status`} value={resource.status} onChange={(event) => update((current) => ({ ...current, resources: current.resources.map((item) => item.id === resource.id ? { ...item, status: event.target.value as LearningResource['status'] } : item) }))}><option value="queued">Queued</option><option value="in-progress">In progress</option><option value="completed">Consumed</option></select></label>{resource.url ? <a className="secondary" href={resource.url} target="_blank" rel="noreferrer">Open <ExternalLink size={14}/></a> : <span/>}</div>
      </article>
    })}</div> : <div className="panel library-empty"><BookOpen size={24}/><p>{resources.length ? 'No resources match this view.' : 'Your Library is empty. Add something useful, then pull it into a Goal.'}</p></div>}
    <section className="panel knowledge-panel"><div className="panel-title"><div><p className="eyebrow">KNOWLEDGE BASE</p><h2>Knowledge notes</h2></div><span>{state.knowledgeNotes.length}</span></div>{state.knowledgeNotes.map((note) => <article key={note.id}><h3>{note.title}</h3><p>{note.body}</p><div>{note.tags.map((tag) => <span className="kind" key={tag}>{tag}</span>)}</div></article>)}{!state.knowledgeNotes.length && <p className="empty">Knowledge notes imported through Bulk JSON will appear here.</p>}</section>
  </div>
}
