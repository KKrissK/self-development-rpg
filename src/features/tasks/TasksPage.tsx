import { useEffect, useState } from 'react'
import { CalendarDays, Check, Circle, ListTodo, Plus, Sparkles, Target, Trash2 } from 'lucide-react'
import { uid, useWorkspace } from '../../app/AppState'
import type { GoalTask, GoalTaskStatus } from '../../domain/model'
import { AiImportPanel } from '../ai-builder/AiImportPanel'

const statusLabel: Record<GoalTaskStatus, string> = { todo: 'To do', 'in-progress': 'In progress', done: 'Done' }

export function TasksPage({ initialGoalId, onNavigateGoals }: { initialGoalId?: string; onNavigateGoals: () => void }) {
  const { state, update } = useWorkspace()
  const [selectedGoalId, setSelectedGoalId] = useState(initialGoalId ?? '')
  const [adding, setAdding] = useState(false)
  const [method, setMethod] = useState<'manual' | 'ai'>('ai')
  const [filter, setFilter] = useState<'all' | GoalTaskStatus>('all')

  useEffect(() => {
    if (initialGoalId) setSelectedGoalId(initialGoalId)
  }, [initialGoalId])

  if (!state) return null
  const profileId = state.activeProfileId
  const goals = state.quests.filter((goal) => goal.profileId === profileId && goal.status !== 'done')
  const effectiveGoalId = goals.some((goal) => goal.id === selectedGoalId) ? selectedGoalId : ''
  const selectedGoal = goals.find((goal) => goal.id === effectiveGoalId)
  const activeGoalIds = new Set(goals.map((goal) => goal.id))
  const tasks = state.tasks.filter((task) => task.profileId === profileId && activeGoalIds.has(task.goalId))
  const visibleTasks = tasks.filter((task) => filter === 'all' || task.status === filter)

  function closeCreator() {
    setAdding(false)
    setSelectedGoalId('')
  }

  function createTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!effectiveGoalId) return
    const form = new FormData(event.currentTarget)
    const status = form.get('status') as GoalTaskStatus
    const task: GoalTask = {
      id: uid(), profileId, goalId: effectiveGoalId,
      title: String(form.get('title')).trim(), notes: String(form.get('notes')).trim(), status,
      dueDate: String(form.get('dueDate')) || undefined, createdAt: new Date().toISOString(),
      completedAt: status === 'done' ? new Date().toISOString() : undefined,
    }
    update((current) => ({ ...current, tasks: [task, ...current.tasks] }))
    closeCreator()
  }

  function setStatus(task: GoalTask, status: GoalTaskStatus) {
    update((current) => ({ ...current, tasks: current.tasks.map((item) => item.id === task.id ? { ...item, status, completedAt: status === 'done' ? item.completedAt ?? new Date().toISOString() : undefined } : item) }))
  }

  function remove(task: GoalTask) {
    if (!confirm(`Delete “${task.title}”?`)) return
    update((current) => ({ ...current, tasks: current.tasks.filter((item) => item.id !== task.id) }))
  }

  if (!goals.length) return <div className="page tasks-page">
    <header className="page-head"><div><p className="eyebrow">ACTION LAYER</p><h1>Tasks</h1><p>Every Task belongs to a Goal, so the work always has somewhere meaningful to go.</p></div></header>
    <section className="task-empty-state"><ListTodo size={34}/><h2>Create a Goal first</h2><p>Goals hold the outcome. Tasks become the concrete steps that move it forward.</p><button className="primary" onClick={onNavigateGoals}>Open Goals</button></section>
  </div>

  return <div className="page tasks-page">
    <header className="page-head"><div><p className="eyebrow">ACTION LAYER</p><h1>Tasks</h1><p>Turn each Goal into a sequence of work you can actually finish.</p></div><button className="primary" onClick={() => adding ? closeCreator() : setAdding(true)}><Plus size={18}/>{adding ? 'Close add' : 'Add tasks'}</button></header>

    {adding && <section className="add-workbench">
      <section className="panel task-goal-picker">
        <div><p className="eyebrow">CHOOSE A GOAL</p><h2>Which Goal are these Tasks for?</h2><p>Select the outcome first. The creation options will use that Goal's saved context.</p></div>
        <div className="task-goal-options">{goals.map((goal) => {
          const count = state.tasks.filter((task) => task.goalId === goal.id).length
          return <label className={effectiveGoalId === goal.id ? 'selected' : ''} key={goal.id}>
            <input type="radio" name="taskGoal" value={goal.id} checked={effectiveGoalId === goal.id} onChange={() => setSelectedGoalId(goal.id)}/>
            <span className="task-goal-icon"><Target size={17}/></span><span><b>{goal.title}</b><small>{goal.status} · {count} existing Task{count === 1 ? '' : 's'}</small></span>
          </label>
        })}</div>
      </section>

      {selectedGoal && <>
        <p className="task-context-note"><Sparkles size={15}/> Creating Tasks for <b>{selectedGoal.title}</b>. AI will use its saved details, linked skills, Library resources, deadline, and existing Tasks.</p>
        <div className="add-method-switch" role="tablist" aria-label="Task creation method"><button role="tab" aria-selected={method === 'ai'} className={method === 'ai' ? 'active' : ''} onClick={() => setMethod('ai')}><Sparkles size={17}/><span><b>Plan with AI</b><small>Generate a tailored sequence for this Goal</small></span></button><button role="tab" aria-selected={method === 'manual'} className={method === 'manual' ? 'active' : ''} onClick={() => setMethod('manual')}><Plus size={17}/><span><b>Manual</b><small>Add one concrete Task yourself</small></span></button></div>
        {method === 'manual' ? <form className="panel task-add-form" onSubmit={createTask}>
          <label className="task-title-field">Task title<input name="title" required maxLength={200} autoFocus placeholder="One concrete action"/></label>
          <label>Status<select name="status" defaultValue="todo"><option value="todo">To do</option><option value="in-progress">In progress</option><option value="done">Done</option></select></label>
          <label>Due date<input name="dueDate" type="date"/></label>
          <label className="task-notes-field">Notes or definition of done<textarea name="notes" maxLength={2000} placeholder="Useful context, acceptance criteria, or what to produce…"/></label>
          <div className="form-actions"><button className="secondary" type="button" onClick={closeCreator}>Cancel</button><button className="primary" type="submit">Add Task</button></div>
        </form> : <AiImportPanel key={`tasks-ai-${effectiveGoalId}`} target="tasks" mode="create" goalId={effectiveGoalId}/>}</>}
    </section>}

    <div className="task-toolbar" role="tablist" aria-label="Task filters">{([['all', 'All'], ['todo', 'To do'], ['in-progress', 'In progress'], ['done', 'Done']] as const).map(([value, label]) => <button key={value} role="tab" aria-selected={filter === value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{label}<span>{value === 'all' ? tasks.length : tasks.filter((task) => task.status === value).length}</span></button>)}</div>

    {visibleTasks.length ? <section className="task-list">{visibleTasks.map((task) => {
      const goal = goals.find((item) => item.id === task.goalId)
      return <article className={task.status === 'done' ? 'task-row done' : 'task-row'} key={task.id}>
        <button className="task-check" aria-label={task.status === 'done' ? `Reopen ${task.title}` : `Complete ${task.title}`} onClick={() => setStatus(task, task.status === 'done' ? 'todo' : 'done')}>{task.status === 'done' ? <Check size={17}/> : <Circle size={15}/>}</button>
        <div className="task-row-main"><b>{task.title}</b>{task.notes && <p>{task.notes}</p>}<span>{goal && <small><Target size={13}/>{goal.title}</small>}{task.dueDate && <small><CalendarDays size={13}/>{task.dueDate}</small>}</span></div>
        <label>Status<select aria-label={`Status for Task ${task.title}`} value={task.status} onChange={(event) => setStatus(task, event.target.value as GoalTaskStatus)}>{Object.entries(statusLabel).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        <button className="icon-btn" aria-label={`Delete Task ${task.title}`} onClick={() => remove(task)}><Trash2 size={17}/></button>
      </article>
    })}</section> : <section className="task-empty-state compact"><ListTodo size={27}/><h2>{tasks.length ? 'No Tasks match this view' : 'No Tasks yet'}</h2><p>{tasks.length ? 'Choose another status to see the rest.' : 'Choose a Goal, then add Tasks manually or let AI build the plan from its saved context.'}</p>{!tasks.length && <button className="primary" onClick={() => setAdding(true)}><Plus size={17}/> Add the first Tasks</button>}</section>}
  </div>
}
