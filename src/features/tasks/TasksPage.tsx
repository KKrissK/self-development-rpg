import { useEffect, useState } from 'react'
import { CalendarDays, Check, Circle, ListTodo, Plus, Sparkles, Trash2 } from 'lucide-react'
import { uid, useWorkspace } from '../../app/AppState'
import type { GoalTask, GoalTaskStatus } from '../../domain/model'
import { AiImportPanel } from '../ai-builder/AiImportPanel'

const statusLabel: Record<GoalTaskStatus, string> = { todo: 'To do', 'in-progress': 'In progress', done: 'Done' }

export function TasksPage({ initialGoalId, onNavigateGoals }: { initialGoalId?: string; onNavigateGoals: () => void }) {
  const { state, update } = useWorkspace()
  const [selectedGoalId, setSelectedGoalId] = useState(initialGoalId ?? '')
  const [adding, setAdding] = useState(false)
  const [method, setMethod] = useState<'manual' | 'ai'>('manual')
  const [filter, setFilter] = useState<'all' | GoalTaskStatus>('all')
  useEffect(() => {
    if (initialGoalId) setSelectedGoalId(initialGoalId)
  }, [initialGoalId])
  if (!state) return null
  const profileId = state.activeProfileId
  const goals = state.quests.filter((goal) => goal.profileId === profileId && goal.status !== 'done')
  const effectiveGoalId = goals.some((goal) => goal.id === selectedGoalId) ? selectedGoalId : goals[0]?.id ?? ''
  const selectedGoal = goals.find((goal) => goal.id === effectiveGoalId)
  const goalTasks = state.tasks.filter((task) => task.profileId === profileId && task.goalId === effectiveGoalId)
  const visibleTasks = goalTasks.filter((task) => filter === 'all' || task.status === filter)
  const completed = goalTasks.filter((task) => task.status === 'done').length
  const progress = goalTasks.length ? Math.round(completed / goalTasks.length * 100) : 0

  function createTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const status = form.get('status') as GoalTaskStatus
    const task: GoalTask = { id: uid(), profileId, goalId: effectiveGoalId, title: String(form.get('title')).trim(), notes: String(form.get('notes')).trim(), status, dueDate: String(form.get('dueDate')) || undefined, createdAt: new Date().toISOString(), completedAt: status === 'done' ? new Date().toISOString() : undefined }
    update((current) => ({ ...current, tasks: [task, ...current.tasks] }))
    setAdding(false)
  }

  function setStatus(task: GoalTask, status: GoalTaskStatus) {
    update((current) => ({ ...current, tasks: current.tasks.map((item) => item.id === task.id ? { ...item, status, completedAt: status === 'done' ? item.completedAt ?? new Date().toISOString() : undefined } : item) }))
  }

  function remove(task: GoalTask) {
    if (!confirm(`Delete “${task.title}”?`)) return
    update((current) => ({ ...current, tasks: current.tasks.filter((item) => item.id !== task.id) }))
  }

  if (!goals.length) return <div className="page tasks-page"><header className="page-head"><div><p className="eyebrow">ACTION LAYER</p><h1>Tasks</h1><p>Every Task belongs to a Goal, so the work always has somewhere meaningful to go.</p></div></header><section className="task-empty-state"><ListTodo size={34}/><h2>Create a Goal first</h2><p>Goals hold the outcome. Tasks become the concrete steps that move it forward.</p><button className="primary" onClick={onNavigateGoals}>Open Goals</button></section></div>

  return <div className="page tasks-page">
    <header className="page-head"><div><p className="eyebrow">ACTION LAYER</p><h1>Tasks</h1><p>Turn each Goal into a sequence of work you can actually finish.</p></div><button className="primary" onClick={() => setAdding((open) => !open)}><Plus size={18}/>{adding ? 'Close add' : 'Add tasks'}</button></header>
    <section className="task-goal-focus"><label>Working toward<select aria-label="Task Goal" value={effectiveGoalId} onChange={(event) => { setSelectedGoalId(event.target.value); setFilter('all'); setAdding(false) }}>{goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.title}</option>)}</select></label><div className="task-progress"><span><b>{progress}%</b><small>{completed} of {goalTasks.length} Tasks complete</small></span><div><i style={{ width: `${progress}%` }}/></div></div><button className="secondary" onClick={onNavigateGoals}>View Goal</button></section>
    {selectedGoal?.skillId && <p className="task-context-note"><Sparkles size={15}/> AI planning will use your recorded {state.skills.find((skill) => skill.id === selectedGoal.skillId)?.name ?? 'skill'} level and experience.</p>}
    {adding && <section className="add-workbench"><div className="add-method-switch" role="tablist" aria-label="Task creation method"><button role="tab" aria-selected={method === 'manual'} className={method === 'manual' ? 'active' : ''} onClick={() => setMethod('manual')}><Plus size={17}/><span><b>Manual</b><small>Add one concrete Task yourself</small></span></button><button role="tab" aria-selected={method === 'ai'} className={method === 'ai' ? 'active' : ''} onClick={() => setMethod('ai')}><Sparkles size={17}/><span><b>Plan with AI</b><small>Generate a tailored sequence for this Goal</small></span></button></div>{method === 'manual' ? <form className="panel task-add-form" onSubmit={createTask}><label className="task-title-field">Task title<input name="title" required maxLength={200} autoFocus placeholder="One concrete action"/></label><label>Status<select name="status" defaultValue="todo"><option value="todo">To do</option><option value="in-progress">In progress</option><option value="done">Done</option></select></label><label>Due date<input name="dueDate" type="date"/></label><label className="task-notes-field">Notes or definition of done<textarea name="notes" maxLength={2000} placeholder="Useful context, acceptance criteria, or what to produce…"/></label><div className="form-actions"><button className="secondary" type="button" onClick={() => setAdding(false)}>Cancel</button><button className="primary" type="submit">Add Task</button></div></form> : <AiImportPanel key={`tasks-ai-${effectiveGoalId}`} target="tasks" mode="create" goalId={effectiveGoalId}/>}</section>}
    <div className="task-toolbar" role="tablist" aria-label="Task filters">{([['all', 'All'], ['todo', 'To do'], ['in-progress', 'In progress'], ['done', 'Done']] as const).map(([value, label]) => <button key={value} role="tab" aria-selected={filter === value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{label}<span>{value === 'all' ? goalTasks.length : goalTasks.filter((task) => task.status === value).length}</span></button>)}</div>
    {visibleTasks.length ? <section className="task-list">{visibleTasks.map((task) => <article className={task.status === 'done' ? 'task-row done' : 'task-row'} key={task.id}><button className="task-check" aria-label={task.status === 'done' ? `Reopen ${task.title}` : `Complete ${task.title}`} onClick={() => setStatus(task, task.status === 'done' ? 'todo' : 'done')}>{task.status === 'done' ? <Check size={17}/> : <Circle size={15}/>}</button><div className="task-row-main"><b>{task.title}</b>{task.notes && <p>{task.notes}</p>}<span>{task.dueDate && <small><CalendarDays size={13}/>{task.dueDate}</small>}</span></div><label>Status<select aria-label={`Status for Task ${task.title}`} value={task.status} onChange={(event) => setStatus(task, event.target.value as GoalTaskStatus)}>{Object.entries(statusLabel).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><button className="icon-btn" aria-label={`Delete Task ${task.title}`} onClick={() => remove(task)}><Trash2 size={17}/></button></article>)}</section> : <section className="task-empty-state compact"><ListTodo size={27}/><h2>{goalTasks.length ? 'No Tasks match this view' : 'This Goal has no Tasks yet'}</h2><p>{goalTasks.length ? 'Choose another status to see the rest.' : 'Add them yourself or let AI build a plan using your current skill context.'}</p>{!goalTasks.length && <button className="primary" onClick={() => setAdding(true)}><Plus size={17}/> Add the first Tasks</button>}</section>}
  </div>
}
