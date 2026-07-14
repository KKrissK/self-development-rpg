import { useState } from 'react'
import { BookOpen, CalendarDays, Check, CheckCircle2, ExternalLink, History, Pencil, Plus, RotateCcw, Sparkles, Target, Trash2, Trophy } from 'lucide-react'
import { useWorkspace } from '../../app/AppState'
import { addQuest, completeQuest, setQuestStatus } from '../../domain/actions'
import type { LearningResource, Quest, QuestStatus } from '../../domain/model'
import { AiImportPanel } from '../ai-builder/AiImportPanel'

const ACTIVE_COLUMNS: { status: Exclude<QuestStatus, 'done'>; title: string; copy: string }[] = [
  { status: 'now', title: 'Now', copy: 'Outcomes receiving attention now.' },
  { status: 'next', title: 'Next', copy: 'Ready when capacity opens up.' },
  { status: 'later', title: 'Later', copy: 'Meaningful, but intentionally parked.' },
]

const formatDate = (value: string) => new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${value.slice(0, 10)}T00:00:00`))
const today = () => new Date().toISOString().slice(0, 10)

function ResourcePicker({ resources, selectedIds = [] }: { resources: LearningResource[]; selectedIds?: string[] }) {
  return <fieldset className="goal-resource-picker"><legend>Pull from Library</legend>{resources.length ? <div className="goal-resource-options">{resources.map((resource) => <label key={resource.id}><input type="checkbox" name="resourceIds" value={resource.id} defaultChecked={selectedIds.includes(resource.id)}/><span><b>{resource.title}</b><small>{resource.kind} · {resource.status.replace('-', ' ')}</small></span></label>)}</div> : <p>No Library items yet. Add resources in Library, then return here to pull them into this Goal.</p>}</fieldset>
}

function GoalCard({ goal, skillName, resources, onStatus, onComplete, onEdit, onDelete }: { goal: Quest; skillName?: string; resources: LearningResource[]; onStatus: (status: QuestStatus) => void; onComplete: () => void; onEdit: () => void; onDelete: () => void }) {
  const rewardClaimed = Boolean(goal.xpAwardedAt || goal.completedAt)
  const overdue = Boolean(goal.dueDate && goal.dueDate < today())
  return <article className="quest-card quest-card-rich goal-card">
    <div className="quest-card-top"><span className={`priority-badge ${goal.priority}`}>{goal.priority}</span><span className={rewardClaimed ? 'xp-badge claimed' : 'xp-badge'}>{rewardClaimed ? <><Check size={12}/> XP claimed</> : `+${goal.xp} XP`}</span></div>
    <h3>{goal.title}</h3>
    {goal.notes && <p className="quest-notes">{goal.notes}</p>}
    <div className="quest-meta">{goal.dueDate && <span className={overdue ? 'overdue' : ''}><CalendarDays size={14}/>{overdue ? 'Overdue · ' : ''}{formatDate(goal.dueDate)}</span>}{skillName && <span><Target size={14}/>{skillName}</span>}</div>
    {resources.length > 0 && <section className="goal-support"><span className="goal-support-label"><BookOpen size={14}/> Library support</span><div>{resources.map((resource) => resource.url ? <a key={resource.id} href={resource.url} target="_blank" rel="noreferrer"><span>{resource.title}</span><small>{resource.status.replace('-', ' ')}</small><ExternalLink size={12}/></a> : <span className="goal-resource-chip" key={resource.id}><span>{resource.title}</span><small>{resource.status.replace('-', ' ')}</small></span>)}</div></section>}
    <label className="compact-field">Plan<select aria-label={`Status for ${goal.title}`} value={goal.status} onChange={(event) => onStatus(event.target.value as QuestStatus)}><option value="now">Now</option><option value="next">Next</option><option value="later">Later</option><option value="done">Done</option></select></label>
    <div className="quest-card-actions"><button className="primary quest-complete" onClick={onComplete}><CheckCircle2 size={16}/>{rewardClaimed ? 'Complete again' : `Complete · +${goal.xp} XP`}</button><button className="secondary" onClick={onEdit}><Pencil size={15}/> Edit</button><button className="icon-btn" aria-label={`Delete ${goal.title}`} onClick={onDelete}><Trash2 size={16}/></button></div>
  </article>
}

export function GoalsPage() {
  const { state, update } = useWorkspace()
  const [createOpen, setCreateOpen] = useState(false)
  const [createMethod, setCreateMethod] = useState<'manual' | 'ai'>('manual')
  const [editingId, setEditingId] = useState('')
  const [historyLimit, setHistoryLimit] = useState(8)
  const [historyQuery, setHistoryQuery] = useState('')
  if (!state) return null

  const profileId = state.activeProfileId
  const profileGoals = state.quests.filter((goal) => goal.profileId === profileId)
  const resources = state.resources.filter((resource) => resource.profileId === profileId)
  const activeGoals = profileGoals.filter((goal) => goal.status !== 'done')
  const doneGoals = profileGoals.filter((goal) => goal.status === 'done').sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
  const filteredHistory = doneGoals.filter((goal) => goal.title.toLocaleLowerCase().includes(historyQuery.trim().toLocaleLowerCase()))
  const claimedXp = profileGoals.filter((goal) => goal.xpAwardedAt || goal.completedAt).reduce((sum, goal) => sum + goal.xp, 0)
  const nowCount = activeGoals.filter((goal) => goal.status === 'now').length
  const linkedResourceCount = new Set(activeGoals.flatMap((goal) => goal.resourceIds ?? [])).size

  function createGoal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    update((current) => addQuest(current, { title: String(form.get('title')), notes: String(form.get('notes')), priority: form.get('priority') as Quest['priority'], status: form.get('status') as QuestStatus, xp: Number(form.get('xp')), dueDate: String(form.get('dueDate')) || undefined, skillId: String(form.get('skillId')) || undefined, resourceIds: form.getAll('resourceIds').map(String) }))
    event.currentTarget.reset()
    setCreateOpen(false)
  }

  function saveGoal(event: React.FormEvent<HTMLFormElement>, goal: Quest) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const status = form.get('status') as QuestStatus
    update((current) => {
      const edited = { ...current, quests: current.quests.map((item) => item.id === goal.id ? { ...item, title: String(form.get('title')).trim(), notes: String(form.get('notes')).trim(), priority: form.get('priority') as Quest['priority'], xp: Number(form.get('xp')), dueDate: String(form.get('dueDate')) || undefined, skillId: String(form.get('skillId')) || undefined, resourceIds: form.getAll('resourceIds').map(String) } : item) }
      return setQuestStatus(edited, goal.id, status)
    })
    setEditingId('')
  }

  function deleteGoal(goal: Quest) {
    if (!confirm(`Delete “${goal.title}”? Earned XP will remain on your profile.`)) return
    update((current) => ({ ...current, quests: current.quests.filter((item) => item.id !== goal.id) }))
  }

  function clearHistory() {
    if (!confirm(`Delete all ${doneGoals.length} completed Goal records? Earned XP will remain.`)) return
    const doneIds = new Set(doneGoals.map((goal) => goal.id))
    update((current) => ({ ...current, quests: current.quests.filter((goal) => !doneIds.has(goal.id)) }))
    setHistoryLimit(8)
  }

  const editorFields = (goal?: Quest) => <>
    <label className="quest-form-title">Goal title<input name="title" required maxLength={160} autoFocus={!goal} defaultValue={goal?.title} placeholder="What meaningful outcome does done represent?"/></label>
    <label>Status<select name="status" defaultValue={goal?.status ?? 'now'}><option value="now">Now</option><option value="next">Next</option><option value="later">Later</option>{goal && <option value="done">Done</option>}</select></label>
    <label>Priority<select name="priority" defaultValue={goal?.priority ?? 'medium'}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
    <label>XP reward<input name="xp" type="number" min="0" max="100" defaultValue={goal?.xp ?? 15}/></label>
    <label>Due date<input name="dueDate" type="date" defaultValue={goal?.dueDate}/></label>
    <label>Related skill<select name="skillId" defaultValue={goal?.skillId ?? ''}><option value="">No linked skill</option>{state.skills.filter((skill) => skill.profileId === profileId).map((skill) => <option key={skill.id} value={skill.id}>{skill.name}</option>)}</select></label>
    <label className="quest-form-notes">Definition of done & notes<textarea name="notes" maxLength={2000} defaultValue={goal?.notes} placeholder="Success criteria, context, or the next meaningful step…"/></label>
    <ResourcePicker resources={resources} selectedIds={goal?.resourceIds}/>
  </>

  return <div className="page quests-page goals-page">
    <header className="page-head"><div><p className="eyebrow">OUTCOME SYSTEM</p><h1>Goals</h1><p>Define meaningful outcomes, attach the knowledge that supports them, and keep attention deliberate.</p></div><button className="primary" onClick={() => setCreateOpen((open) => !open)}><Plus size={18}/>{createOpen ? 'Close creator' : 'Create goal'}</button></header>
    <section className="quest-overview" aria-label="Goal overview"><div className="quest-stat"><span>Active goals</span><b>{activeGoals.length}</b><small>Across Now, Next, and Later</small></div><div className={nowCount > 3 ? 'quest-stat attention' : 'quest-stat'}><span>Current focus</span><b>{nowCount}<small> / 3</small></b><small>{nowCount > 3 ? 'Move an outcome to Next to protect focus' : 'A small Now list keeps outcomes credible'}</small></div><div className="quest-stat"><span>Library support</span><b>{linkedResourceCount}</b><small>{claimedXp} XP earned from completed Goals</small></div></section>
    {createOpen && <section className="add-workbench"><div className="add-method-switch" role="tablist" aria-label="Goal creation method"><button role="tab" aria-selected={createMethod === 'manual'} className={createMethod === 'manual' ? 'active' : ''} onClick={() => setCreateMethod('manual')}><Plus size={17}/><span><b>Manual</b><small>Define one outcome and its support</small></span></button><button role="tab" aria-selected={createMethod === 'ai'} className={createMethod === 'ai' ? 'active' : ''} onClick={() => setCreateMethod('ai')}><Sparkles size={17}/><span><b>AI generate</b><small>Turn intent into concrete Goals</small></span></button></div>{createMethod === 'manual' ? <form className="panel quest-form goal-form" onSubmit={createGoal}>{editorFields()}<div className="form-actions"><button type="button" className="secondary" onClick={() => setCreateOpen(false)}>Cancel</button><button className="primary" type="submit"><Plus size={17}/> Add goal</button></div></form> : <AiImportPanel key="goal-ai" target="quests" mode="create"/>}</section>}
    <div className="quest-board" aria-label="Active Goal planner">{ACTIVE_COLUMNS.map((column) => { const goals = activeGoals.filter((goal) => goal.status === column.status); return <section className={`panel quest-column ${column.status}`} key={column.status}><div className="quest-column-head"><div><span className="quest-column-dot"/><h2>{column.title}</h2></div><b>{goals.length}</b></div><p className="quest-column-copy">{column.copy}</p><div className="quest-stack">{goals.map((goal) => editingId === goal.id ? <form className="quest-card quest-edit-form goal-edit-form" key={goal.id} onSubmit={(event) => saveGoal(event, goal)}>{editorFields(goal)}<div className="form-actions"><button type="button" className="secondary" onClick={() => setEditingId('')}>Cancel</button><button className="primary">Save goal</button></div></form> : <GoalCard key={goal.id} goal={goal} skillName={state.skills.find((skill) => skill.id === goal.skillId)?.name} resources={resources.filter((resource) => goal.resourceIds?.includes(resource.id))} onStatus={(status) => update((current) => setQuestStatus(current, goal.id, status))} onComplete={() => update((current) => completeQuest(current, goal.id))} onEdit={() => setEditingId(goal.id)} onDelete={() => deleteGoal(goal)}/>)}{goals.length === 0 && <div className="quest-column-empty"><span>{column.status === 'now' ? 'No active focus. Choose one outcome worth moving.' : column.status === 'next' ? 'Nothing staged next.' : 'No later Goals parked.'}</span></div>}</div></section> })}</div>
    <section className="panel quest-history"><div className="quest-history-head"><div><p className="eyebrow">COMPLETION HISTORY</p><h2>Finished outcomes, kept out of the way</h2><p>Library items remain visible and show that the Goal they supported was completed.</p></div><div className="history-tools"><label>Find completed goal<input aria-label="Find completed goal" value={historyQuery} onChange={(event) => { setHistoryQuery(event.target.value); setHistoryLimit(8) }} placeholder="Search history"/></label>{doneGoals.length > 0 && <button className="danger" onClick={clearHistory}><Trash2 size={16}/> Clear history</button>}</div></div>{filteredHistory.length === 0 ? <div className="history-empty"><History size={24}/><p>{doneGoals.length ? 'No completed Goals match that search.' : 'Completed Goals will collect here, outside your active board.'}</p></div> : <div className="history-list">{filteredHistory.slice(0, historyLimit).map((goal) => <article className="history-row" key={goal.id}><span className="history-trophy"><Trophy size={17}/></span><div><b>{goal.title}</b><small>{goal.completedAt ? `Completed ${formatDate(goal.completedAt)}` : 'Completed'} · {(goal.resourceIds?.length ?? 0)} Library item{goal.resourceIds?.length === 1 ? '' : 's'}</small></div><span className="history-xp"><Check size={13}/> {goal.xp} XP claimed</span><button className="secondary" onClick={() => update((current) => setQuestStatus(current, goal.id, 'now'))}><RotateCcw size={15}/> Reopen</button><button className="icon-btn" aria-label={`Delete ${goal.title}`} onClick={() => deleteGoal(goal)}><Trash2 size={16}/></button></article>)}</div>}{filteredHistory.length > historyLimit && <button className="secondary history-more" onClick={() => setHistoryLimit((limit) => limit + 8)}>Load 8 more <span>{filteredHistory.length - historyLimit} remaining</span></button>}</section>
  </div>
}
