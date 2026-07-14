import { useState } from 'react'
import { ArrowRight, BookOpen, Check, Plus, Sparkles, Target, WalletCards } from 'lucide-react'
import { useWorkspace } from '../../app/AppState'
import { addQuest, completeQuest, setQuestStatus } from '../../domain/actions'
import type { LearningResource, QuestStatus } from '../../domain/model'

type DashboardDestination = 'skills' | 'goals' | 'library' | 'career' | 'profile'

const money = (amount: number, currency: string) => new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)

export function Dashboard({ onNavigate }: { onNavigate: (page: DashboardDestination) => void }) {
  const { state, update } = useWorkspace()
  const [questTitle, setQuestTitle] = useState('')
  if (!state) return null

  const profile = state.profiles.find((item) => item.id === state.activeProfileId) ?? state.profiles[0]
  const profileId = profile.id
  const activeQuests = state.quests.filter((quest) => quest.profileId === profileId && quest.status !== 'done').sort((a, b) => ['now', 'next', 'later'].indexOf(a.status) - ['now', 'next', 'later'].indexOf(b.status)).slice(0, 5)
  const learning = state.resources.filter((resource) => resource.profileId === profileId && resource.status !== 'completed').slice(0, 4)
  const skills = state.skills.filter((skill) => skill.profileId === profileId)
  const income = state.incomeSources.filter((item) => item.profileId === profileId && item.active).reduce((sum, item) => sum + item.monthlyAmount, 0)
  const nextLevel = profile.level * 100

  function quickAddQuest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!questTitle.trim()) return
    update((current) => addQuest(current, { title: questTitle, priority: 'medium', status: 'now', xp: 15 }))
    setQuestTitle('')
  }

  return <div className="page dashboard-page"><header className="hero-header"><div><p className="eyebrow">DASHBOARD · LEVEL {profile.level}</p><h1>Good to see you, {profile.name}.</h1><p>Your next move matters more than the size of the map.</p></div><button className="level-orbit dashboard-level-link" onClick={() => onNavigate('profile')} aria-label="Open profile"><strong>{profile.level}</strong><span>LEVEL</span></button></header>
    <button className="progress-panel dashboard-progress-link" onClick={() => onNavigate('profile')}><div><span>LEVEL PROGRESS</span><b>{profile.xp % 100} / 100 XP</b></div><progress value={profile.xp % 100} max={100}/><small>{nextLevel - profile.xp} XP until level {profile.level + 1} <ArrowRight size={13}/></small></button>
    <div className="dashboard-grid">
      <section className="panel span-2 dashboard-action-panel"><div className="panel-title"><div><p className="eyebrow">YOUR NEXT OUTCOME</p><h2>Active Goals</h2></div><button className="panel-source-link" onClick={() => onNavigate('goals')}>Open Goals <ArrowRight size={15}/></button></div><form className="dashboard-quick-add" onSubmit={quickAddQuest}><input aria-label="Quick add goal" value={questTitle} onChange={(event) => setQuestTitle(event.target.value)} maxLength={160} placeholder="Add a meaningful outcome…"/><button className="primary" type="submit"><Plus size={16}/> Add</button></form>{activeQuests.length ? <div className="stack">{activeQuests.map((quest) => <div className="quest-row dashboard-quest-row" key={quest.id}><button className="check" aria-label={`Complete ${quest.title}`} onClick={() => update((current) => completeQuest(current, quest.id))}><Check size={15}/></button><button className="dashboard-item-link" onClick={() => onNavigate('goals')}><b>{quest.title}</b><small>{quest.priority} priority · {(quest.resourceIds?.length ?? 0)} Library item{quest.resourceIds?.length === 1 ? '' : 's'} · {quest.xpAwardedAt ? 'XP claimed' : `+${quest.xp} XP`}</small></button><select aria-label={`Plan for ${quest.title}`} value={quest.status} onChange={(event) => update((current) => setQuestStatus(current, quest.id, event.target.value as QuestStatus))}><option value="now">Now</option><option value="next">Next</option><option value="later">Later</option><option value="done">Done</option></select></div>)}</div> : <button className="dashboard-empty-action" onClick={() => onNavigate('goals')}><Target size={18}/><span>No active Goals. Open Goals to define your next outcome.</span><ArrowRight size={15}/></button>}</section>

      <button className="panel dashboard-nav-card" onClick={() => onNavigate('career')}><div className="panel-title"><div><p className="eyebrow">MONEY PULSE</p><h2>{money(income, state.moneyPlan.currency)}</h2></div><WalletCards/></div><p className="muted">active monthly income</p><div className="mini-metric"><span>Target</span><b>{money(state.moneyPlan.monthlyTarget, state.moneyPlan.currency)}</b></div><div className="mini-metric"><span>Expenses</span><b>{money(state.moneyPlan.monthlyExpenses, state.moneyPlan.currency)}</b></div><span className="card-source">Open Career <ArrowRight size={14}/></span></button>

      <button className="panel dashboard-nav-card" onClick={() => onNavigate('skills')}><div className="panel-title"><div><p className="eyebrow">SKILL MAP</p><h2>{skills.length} mapped</h2></div><Sparkles/></div>{skills.length ? skills.slice(0, 4).map((skill) => <div className="skill-mini" key={skill.id}><span>{skill.name}</span><div><i style={{ width: `${skill.level * 10}%` }}/></div><b>{skill.level}</b></div>) : <p className="empty">Add skills and evidence to see your map grow.</p>}<span className="card-source">Open Skills <ArrowRight size={14}/></span></button>

      <section className="panel span-2 dashboard-action-panel"><div className="panel-title"><div><p className="eyebrow">IN MOTION</p><h2>Learning queue</h2></div><button className="panel-source-link" onClick={() => onNavigate('library')}>Open Library <ArrowRight size={15}/></button></div>{learning.length ? <div className="dashboard-learning-list">{learning.map((resource) => <div className="resource-row dashboard-learning-row" key={resource.id}><span className="kind">{resource.kind}</span><button className="dashboard-item-link" onClick={() => onNavigate('library')}><b>{resource.title}</b><small>{resource.creator || 'No creator recorded'}</small></button><select aria-label={`Learning status for ${resource.title}`} value={resource.status} onChange={(event) => update((current) => ({ ...current, resources: current.resources.map((item) => item.id === resource.id ? { ...item, status: event.target.value as LearningResource['status'] } : item) }))}><option value="queued">Queued</option><option value="in-progress">In progress</option><option value="completed">Completed</option></select></div>)}</div> : <button className="dashboard-empty-action" onClick={() => onNavigate('library')}><BookOpen size={18}/><span>Nothing queued. Open Library to add something worth learning.</span><ArrowRight size={15}/></button>}</section>
    </div>
  </div>
}
