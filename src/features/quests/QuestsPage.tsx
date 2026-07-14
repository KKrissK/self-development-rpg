import { useEffect, useRef, useState } from 'react'
import { ArrowRight, BookOpen, CalendarDays, Check, CheckCircle2, ExternalLink, History, ListTodo, Pencil, Plus, RotateCcw, Sparkles, Target, Trash2, Trophy } from 'lucide-react'
import { useWorkspace } from '../../app/AppState'
import { addQuest, completeQuest, setQuestStatus } from '../../domain/actions'
import { goalDifficultyForPriority, goalXpForPriority } from '../../domain/goalRewards'
import type { GoalTask, LearningResource, Quest, QuestStatus } from '../../domain/model'
import { AiImportPanel } from '../ai-builder/AiImportPanel'
import { useI18n } from '../../i18n/I18n'

const formatDate = (value: string, locale: string) => new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${value.slice(0, 10)}T00:00:00`))
const today = () => new Date().toISOString().slice(0, 10)
const laneOrder: Record<Exclude<QuestStatus, 'done'>, number> = { now: 0, next: 1, later: 2 }

function ResourcePicker({ resources, selectedIds = [] }: { resources: LearningResource[]; selectedIds?: string[] }) {
  return <fieldset className="goal-resource-picker"><legend>Pull from Library</legend>{resources.length ? <div className="goal-resource-options">{resources.map((resource) => <label key={resource.id}><input type="checkbox" name="resourceIds" value={resource.id} defaultChecked={selectedIds.includes(resource.id)}/><span><b>{resource.title}</b><small>{resource.kind} · {resource.status.replace('-', ' ')}</small></span></label>)}</div> : <p>No Library items yet. Add resources in Library, then return here to pull them into this Goal.</p>}</fieldset>
}

function SkillPicker({ skills, selectedIds = [], name = 'skillIds' }: { skills: { id: string; name: string; level: number }[]; selectedIds?: string[]; name?: string }) {
  return <fieldset className="goal-skill-picker"><legend>Related skills</legend>{skills.length ? <div className="goal-skill-options">{skills.map((skill) => <label key={skill.id}><input type="checkbox" name={name} value={skill.id} defaultChecked={selectedIds.includes(skill.id)}/><span><b>{skill.name}</b><small>Level {skill.level}</small></span></label>)}</div> : <p>No skills yet.</p>}</fieldset>
}

function GoalCard({ goal, skillNames, resources, tasks, locale, onStatus, onComplete, onEdit, onDelete, onOpenTasks }: { goal: Quest; skillNames: string[]; resources: LearningResource[]; tasks: GoalTask[]; locale: string; onStatus: (status: QuestStatus) => void; onComplete: () => void; onEdit: () => void; onDelete: () => void; onOpenTasks: () => void }) {
  const rewardClaimed = Boolean(goal.xpAwardedAt || goal.completedAt)
  const overdue = Boolean(goal.dueDate && goal.dueDate < today())
  const completedTasks = tasks.filter((task) => task.status === 'done').length
  const taskProgress = tasks.length ? Math.round(completedTasks / tasks.length * 100) : 0
  return <article className="panel goal-wide-card">
    <div className="goal-wide-main"><div className="quest-card-top"><span className={`priority-badge ${goal.priority}`}>{goalDifficultyForPriority(goal.priority)}</span><span className={`goal-lane ${goal.status}`}>{goal.status}</span><span className={rewardClaimed ? 'xp-badge claimed' : 'xp-badge'}>{rewardClaimed ? <><Check size={12}/> XP claimed</> : `+${goal.xp} XP`}</span></div><h2>{goal.title}</h2>{goal.notes && <p className="quest-notes">{goal.notes}</p>}<div className="quest-meta">{goal.dueDate && <span className={overdue ? 'overdue' : ''}><CalendarDays size={14}/>{overdue ? 'Overdue · ' : ''}{formatDate(goal.dueDate, locale)}</span>}{skillNames.map((name) => <span key={name}><Target size={14}/>{name}</span>)}</div>{resources.length > 0 && <section className="goal-support"><span className="goal-support-label"><BookOpen size={14}/> Library support</span><div>{resources.map((resource) => resource.url ? <a key={resource.id} href={resource.url} target="_blank" rel="noreferrer" aria-label={`Open ${resource.title}`}><span>{resource.title}</span><small>{resource.status.replace('-', ' ')}</small><span className="goal-resource-open">Open <ExternalLink size={12}/></span></a> : <span className="goal-resource-chip" key={resource.id}><span>{resource.title}</span><small>{resource.status.replace('-', ' ')}</small></span>)}</div></section>}</div>
    <section className="goal-task-summary"><div className="goal-task-summary-head"><span><ListTodo size={16}/><b>{tasks.length} Task{tasks.length === 1 ? '' : 's'}</b></span><small>{completedTasks} complete · {taskProgress}%</small></div><div className="goal-task-meter"><i style={{ width: `${taskProgress}%` }}/></div>{tasks.length ? <div className="goal-task-preview">{tasks.slice(0, 3).map((task) => <span className={task.status === 'done' ? 'done' : ''} key={task.id}>{task.status === 'done' ? <Check size={12}/> : <i/>}{task.title}</span>)}</div> : <p>No Tasks yet. Break this outcome into a practical path.</p>}<button className="secondary" onClick={onOpenTasks}>{tasks.length ? 'Open Tasks' : 'Plan Tasks'}</button></section>
    <footer className="goal-wide-actions"><label>Plan<select aria-label={`Status for ${goal.title}`} value={goal.status} onChange={(event) => onStatus(event.target.value as QuestStatus)}><option value="now">Now</option><option value="next">Next</option><option value="later">Later</option><option value="done">Done</option></select></label><button className="primary quest-complete" onClick={onComplete}><CheckCircle2 size={16}/>{rewardClaimed ? 'Complete again' : `Complete · +${goal.xp} XP`}</button><button className="secondary" onClick={onEdit}><Pencil size={15}/> Edit</button><button className="icon-btn" aria-label={`Delete ${goal.title}`} onClick={onDelete}><Trash2 size={16}/></button></footer>
  </article>
}

export function GoalsPage({ onOpenTasks }: { onOpenTasks: (goalId: string) => void }) {
  const { state, update } = useWorkspace()
  const { locale } = useI18n()
  const [createOpen, setCreateOpen] = useState(false)
  const [createMethod, setCreateMethod] = useState<'manual' | 'ai'>('ai')
  const [aiGoalPurpose, setAiGoalPurpose] = useState<'general' | 'skill'>('general')
  const [aiSkillIds, setAiSkillIds] = useState<string[]>([])
  const [aiGoalReady, setAiGoalReady] = useState(false)
  const aiGoalFlowRef = useRef<HTMLDivElement>(null)
  const [editingId, setEditingId] = useState('')
  const [historyLimit, setHistoryLimit] = useState(8)
  const [historyQuery, setHistoryQuery] = useState('')
  useEffect(() => {
    if (aiGoalReady) aiGoalFlowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [aiGoalReady])
  if (!state) return null

  const profileId = state.activeProfileId
  const profileGoals = state.quests.filter((goal) => goal.profileId === profileId)
  const resources = state.resources.filter((resource) => resource.profileId === profileId)
  const profileSkills = state.skills.filter((skill) => skill.profileId === profileId)
  const effectiveAiSkillIds = aiSkillIds.filter((id) => profileSkills.some((skill) => skill.id === id))
  const activeGoals = profileGoals.filter((goal): goal is Quest & { status: Exclude<QuestStatus, 'done'> } => goal.status !== 'done').sort((a, b) => laneOrder[a.status] - laneOrder[b.status])
  const doneGoals = profileGoals.filter((goal) => goal.status === 'done').sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
  const filteredHistory = doneGoals.filter((goal) => goal.title.toLocaleLowerCase().includes(historyQuery.trim().toLocaleLowerCase()))
  const claimedXp = profileGoals.filter((goal) => goal.xpAwardedAt || goal.completedAt).reduce((sum, goal) => sum + goal.xp, 0)
  const nowCount = activeGoals.filter((goal) => goal.status === 'now').length
  const activeTaskCount = state.tasks.filter((task) => activeGoals.some((goal) => goal.id === task.goalId)).length
  const completedActiveTasks = state.tasks.filter((task) => task.status === 'done' && activeGoals.some((goal) => goal.id === task.goalId)).length

  function revealAiGoalFlow() {
    if (aiGoalReady) aiGoalFlowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    else setAiGoalReady(true)
  }

  function createGoal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const skillIds = form.getAll('skillIds').map(String)
    update((current) => addQuest(current, { title: String(form.get('title')), notes: String(form.get('notes')), priority: form.get('priority') as Quest['priority'], status: form.get('status') as QuestStatus, dueDate: String(form.get('dueDate')) || undefined, skillId: skillIds[0], skillIds, resourceIds: form.getAll('resourceIds').map(String) }))
    setCreateOpen(false)
  }

  function saveGoal(event: React.FormEvent<HTMLFormElement>, goal: Quest) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const status = form.get('status') as QuestStatus
    update((current) => {
      const priority = goal.xpAwardedAt || goal.completedAt ? goal.priority : form.get('priority') as Quest['priority']
      const skillIds = form.getAll('skillIds').map(String)
      const edited = { ...current, quests: current.quests.map((item) => item.id === goal.id ? { ...item, title: String(form.get('title')).trim(), notes: String(form.get('notes')).trim(), priority, xp: goal.xpAwardedAt || goal.completedAt ? goal.xp : goalXpForPriority(priority), dueDate: String(form.get('dueDate')) || undefined, skillId: skillIds[0], skillIds, resourceIds: form.getAll('resourceIds').map(String) } : item) }
      return setQuestStatus(edited, goal.id, status)
    })
    setEditingId('')
  }

  function deleteGoal(goal: Quest) {
    const taskCount = state!.tasks.filter((task) => task.goalId === goal.id).length
    if (!confirm(`Delete “${goal.title}”?${taskCount ? ` Its ${taskCount} Task${taskCount === 1 ? '' : 's'} will also be deleted.` : ''} Earned XP will remain on your profile.`)) return
    update((current) => ({ ...current, quests: current.quests.filter((item) => item.id !== goal.id), tasks: current.tasks.filter((task) => task.goalId !== goal.id) }))
  }

  function completeGoal(goal: Quest) {
    const unfinished = state!.tasks.filter((task) => task.goalId === goal.id && task.status !== 'done').length
    if (unfinished && !confirm(`${unfinished} Task${unfinished === 1 ? ' is' : 's are'} still unfinished. Complete the Goal anyway?`)) return
    update((current) => completeQuest(current, goal.id))
  }

  function clearHistory() {
    if (!confirm(`Delete all ${doneGoals.length} completed Goal records? Earned XP will remain.`)) return
    const doneIds = new Set(doneGoals.map((goal) => goal.id))
    update((current) => ({ ...current, quests: current.quests.filter((goal) => !doneIds.has(goal.id)), tasks: current.tasks.filter((task) => !doneIds.has(task.goalId)) }))
    setHistoryLimit(8)
  }

  const editorFields = (goal?: Quest) => <><label className="quest-form-title">Goal title<input name="title" required maxLength={160} autoFocus={!goal} defaultValue={goal?.title} placeholder="Improve Java skills, build a portfolio, change careers…"/><span className="field-guidance">Keep this broad enough to need several Tasks.</span></label><label>Status<select name="status" defaultValue={goal?.status ?? 'now'}><option value="now">Now</option><option value="next">Next</option><option value="later">Later</option>{goal && <option value="done">Done</option>}</select></label><label>Difficulty<select name="priority" defaultValue={goal?.priority ?? 'low'} disabled={Boolean(goal?.xpAwardedAt || goal?.completedAt)}><option value="low">Easy · 15 XP</option><option value="medium">Medium · 30 XP</option><option value="high">Hard · 60 XP</option></select><span className="field-guidance">{goal?.xpAwardedAt || goal?.completedAt ? 'Locked because this reward was already claimed.' : 'XP is calculated automatically.'}</span></label><label>Due date<input name="dueDate" type="date" defaultValue={goal?.dueDate}/></label><SkillPicker skills={profileSkills} selectedIds={[...new Set([...(goal?.skillIds ?? []), ...(goal?.skillId ? [goal.skillId] : [])])]}/><label className="quest-form-notes">Desired outcome & context<textarea name="notes" maxLength={2000} defaultValue={goal?.notes} placeholder="What should be different when this Goal is achieved?"/></label><ResourcePicker resources={resources} selectedIds={goal?.resourceIds}/></>

  return <div className="page quests-page goals-page">
    <header className="page-head"><div><p className="eyebrow">DIRECTION, NOT CHECKLISTS</p><h1>Goals</h1><p>Hold the larger outcomes you want to move toward. The concrete work now lives in Tasks beneath each Goal.</p></div><button className="primary" onClick={() => setCreateOpen((open) => !open)}><Plus size={18}/>{createOpen ? 'Close creator' : 'Create goal'}</button></header>
    <section className="quest-overview" aria-label="Goal overview"><div className="quest-stat"><span>Unfinished Goals</span><b>{activeGoals.length}</b><small>Goals still in progress or waiting to start</small></div><div className="quest-stat"><span>Goals in Now</span><b>{nowCount}</b><small>Goals you chose to work on now</small></div><div className="quest-stat"><span>Task progress</span><b>{completedActiveTasks}<small> / {activeTaskCount}</small></b><small>{claimedXp} XP earned from completed Goals</small></div></section>
    {createOpen && <section className="add-workbench"><div className="add-method-switch" role="tablist" aria-label="Goal creation method"><button role="tab" aria-selected={createMethod === 'ai'} className={createMethod === 'ai' ? 'active' : ''} onClick={() => setCreateMethod('ai')}><Sparkles size={17}/><span><b>AI generate</b><small>Turn intent into well-shaped Goals</small></span></button><button role="tab" aria-selected={createMethod === 'manual'} className={createMethod === 'manual' ? 'active' : ''} onClick={() => setCreateMethod('manual')}><Plus size={17}/><span><b>Manual</b><small>Define one broad outcome</small></span></button></div>{createMethod === 'manual' ? <form className="panel quest-form goal-form" onSubmit={createGoal}>{editorFields()}<div className="form-actions"><button type="button" className="secondary" onClick={() => setCreateOpen(false)}>Cancel</button><button className="primary" type="submit"><Plus size={17}/> Add goal</button></div></form> : <><section className={aiGoalPurpose === 'skill' ? 'panel ai-goal-purpose skill-mode' : 'panel ai-goal-purpose'}><fieldset className="ai-goal-purpose-picker"><legend>What should this Goal do?</legend><div className="ai-goal-purpose-options"><label className={aiGoalPurpose === 'general' ? 'selected' : ''}><input type="radio" name="aiGoalPurpose" value="general" checked={aiGoalPurpose === 'general'} onChange={() => { setAiGoalPurpose('general'); setAiGoalReady(false) }}/><span className="purpose-icon"><Sparkles size={19}/></span><span><b>Create a new Goal</b><small>Turn a new direction or outcome into a clear Goal.</small></span></label><label className={aiGoalPurpose === 'skill' ? 'selected' : ''} aria-disabled={!profileSkills.length}><input type="radio" name="aiGoalPurpose" value="skill" checked={aiGoalPurpose === 'skill'} disabled={!profileSkills.length} onChange={() => { setAiGoalPurpose('skill'); setAiGoalReady(false) }}/><span className="purpose-icon"><Target size={19}/></span><span><b>Improve existing skills</b><small>{profileSkills.length ? 'Build one improvement Goal around one or more related skills.' : 'Add a skill first to use this option.'}</small></span></label></div></fieldset>{aiGoalPurpose === 'skill' && <fieldset className="ai-goal-skill-picker"><legend>Skills to improve</legend><div className="goal-skill-options">{profileSkills.map((skill) => <label key={skill.id}><input type="checkbox" checked={effectiveAiSkillIds.includes(skill.id)} onChange={(event) => { setAiGoalReady(false); setAiSkillIds((current) => event.target.checked ? [...new Set([...current, skill.id])] : current.filter((id) => id !== skill.id)) }}/><span><b>{skill.name}</b><small>Level {skill.level}</small></span></label>)}</div><span className="field-guidance">Select every skill that overlaps. AI will combine their experience and growth areas into one improvement Goal.</span></fieldset>}</section><div className="ai-goal-next-row"><button className="primary ai-goal-next" disabled={aiGoalPurpose === 'skill' && !effectiveAiSkillIds.length} onClick={revealAiGoalFlow}>Next: describe the Goal <ArrowRight size={15}/></button></div>{aiGoalPurpose === 'skill' && !effectiveAiSkillIds.length && <p className="notice">Select at least one skill to continue.</p>}{aiGoalReady && <div className="ai-goal-flow" ref={aiGoalFlowRef}><AiImportPanel key={`goal-ai-${aiGoalPurpose}-${effectiveAiSkillIds.join('-')}`} target="quests" mode="create" focusSkillIds={aiGoalPurpose === 'skill' ? effectiveAiSkillIds : undefined}/></div>}</>}</section>}
    <section className="goal-wide-list" aria-label="Active Goals">{activeGoals.map((goal) => editingId === goal.id ? <form className="panel quest-form goal-form" key={goal.id} onSubmit={(event) => saveGoal(event, goal)}>{editorFields(goal)}<div className="form-actions"><button type="button" className="secondary" onClick={() => setEditingId('')}>Cancel</button><button className="primary">Save goal</button></div></form> : <GoalCard key={goal.id} goal={goal} skillNames={[...new Set([...(goal.skillIds ?? []), ...(goal.skillId ? [goal.skillId] : [])])].map((id) => state.skills.find((skill) => skill.id === id)?.name).filter((name): name is string => Boolean(name))} resources={resources.filter((resource) => goal.resourceIds?.includes(resource.id))} tasks={state.tasks.filter((task) => task.goalId === goal.id)} locale={locale} onStatus={(status) => update((current) => setQuestStatus(current, goal.id, status))} onComplete={() => completeGoal(goal)} onEdit={() => setEditingId(goal.id)} onDelete={() => deleteGoal(goal)} onOpenTasks={() => onOpenTasks(goal.id)}/>)}{!activeGoals.length && <section className="task-empty-state"><Target size={30}/><h2>No active Goals</h2><p>Start with a direction that matters, then give it Tasks.</p></section>}</section>
    <section className="panel quest-history"><div className="quest-history-head"><div><p className="eyebrow">COMPLETION HISTORY</p><h2>Finished outcomes, kept out of the way</h2><p>Completed Goals stay available without taking over the active view.</p></div><div className="history-tools"><label>Find completed goal<input aria-label="Find completed goal" value={historyQuery} onChange={(event) => { setHistoryQuery(event.target.value); setHistoryLimit(8) }} placeholder="Search history"/></label>{doneGoals.length > 0 && <button className="danger" onClick={clearHistory}><Trash2 size={16}/> Clear history</button>}</div></div>{filteredHistory.length === 0 ? <div className="history-empty"><History size={24}/><p>{doneGoals.length ? 'No completed Goals match that search.' : 'Completed Goals will collect here.'}</p></div> : <div className="history-list">{filteredHistory.slice(0, historyLimit).map((goal) => <article className="history-row" key={goal.id}><span className="history-trophy"><Trophy size={17}/></span><div><b>{goal.title}</b><small>{goal.completedAt ? `Completed ${formatDate(goal.completedAt, locale)}` : 'Completed'} · {state.tasks.filter((task) => task.goalId === goal.id).length} Tasks</small></div><span className="history-xp"><Check size={13}/> {goal.xp} XP claimed</span><button className="secondary" onClick={() => update((current) => setQuestStatus(current, goal.id, 'now'))}><RotateCcw size={15}/> Reopen</button><button className="icon-btn" aria-label={`Delete ${goal.title}`} onClick={() => deleteGoal(goal)}><Trash2 size={16}/></button></article>)}</div>}{filteredHistory.length > historyLimit && <button className="secondary history-more" onClick={() => setHistoryLimit((limit) => limit + 8)}>Load 8 more <span>{filteredHistory.length - historyLimit} remaining</span></button>}</section>
  </div>
}
