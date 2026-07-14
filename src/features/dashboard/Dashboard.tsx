import { useState } from 'react'
import { ArrowRight, ArrowUpRight, BookOpen, Check, Circle, ExternalLink, Plus, Sparkles, Target, WalletCards } from 'lucide-react'
import { useWorkspace } from '../../app/AppState'
import { addQuest, completeQuest, setQuestStatus } from '../../domain/actions'
import type { LearningResource, QuestStatus } from '../../domain/model'
import { useI18n } from '../../i18n/I18n'

type DashboardDestination = 'skills' | 'goals' | 'library' | 'career' | 'profile'

const money = (amount: number, currency: string, locale: string) => new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)

function GoalResourceLinks({ resourceIds, resources }: { resourceIds?: string[]; resources: LearningResource[] }) {
  const linked = resources.filter((resource) => resourceIds?.includes(resource.id))
  if (!linked.length) return null
  return <div className="dashboard-goal-resources">{linked.map((resource) => resource.url ? <a key={resource.id} href={resource.url} target="_blank" rel="noreferrer" aria-label={`Open ${resource.title}`}><BookOpen size={12}/><span>{resource.title}</span><ExternalLink size={11}/></a> : <span key={resource.id}><BookOpen size={12}/>{resource.title}</span>)}</div>
}

export function Dashboard({ onNavigate }: { onNavigate: (page: DashboardDestination) => void }) {
  const { state, update } = useWorkspace()
  const { locale } = useI18n()
  const [questTitle, setQuestTitle] = useState('')
  if (!state) return null

  const profile = state.profiles.find((item) => item.id === state.activeProfileId) ?? state.profiles[0]
  const profileId = profile.id
  const allActiveQuests = state.quests.filter((quest) => quest.profileId === profileId && quest.status !== 'done')
  const activeQuests = allActiveQuests.sort((a, b) => ['now', 'next', 'later'].indexOf(a.status) - ['now', 'next', 'later'].indexOf(b.status)).slice(0, 5)
  const learning = state.resources.filter((resource) => resource.profileId === profileId && resource.status !== 'completed').slice(0, 4)
  const skills = state.skills.filter((skill) => skill.profileId === profileId)
  const income = state.incomeSources.filter((item) => item.profileId === profileId && item.active).reduce((sum, item) => sum + item.monthlyAmount, 0)
  const xpInLevel = profile.xp % 100
  const nowCount = allActiveQuests.filter((goal) => goal.status === 'now').length

  function quickAddQuest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!questTitle.trim()) return
    update((current) => addQuest(current, { title: questTitle, priority: 'low', status: 'now' }))
    setQuestTitle('')
  }

  return <div className="page dashboard-page">
    <header className="studio-hero">
      <div className="studio-hero-copy"><p className="eyebrow">Your space, today</p><h1>Good to see you, {profile.name}.</h1><p>{nowCount ? `${nowCount} ${nowCount === 1 ? 'goal has' : 'goals have'} your attention right now.` : 'A clear day is a good place to begin.'}</p></div>
      <button className="momentum-card" onClick={() => onNavigate('profile')} aria-label="Open profile"><span className="momentum-ring" style={{ '--momentum': `${xpInLevel * 3.6}deg` } as React.CSSProperties}><b>{profile.level}</b></span><span><small>Personal progress</small><strong>{xpInLevel}% into this level</strong><em>{100 - xpInLevel} XP to the next</em></span><ArrowUpRight size={18}/></button>
    </header>

    <div className="dashboard-grid studio-grid">
      <section className="panel span-2 dashboard-action-panel focus-panel"><div className="panel-title"><div><p className="eyebrow">YOUR NEXT OUTCOME</p><h2>What deserves your attention?</h2></div><button className="panel-source-link" onClick={() => onNavigate('goals')}>All Goals <ArrowRight size={15}/></button></div><form className="dashboard-quick-add" onSubmit={quickAddQuest}><Plus size={18}/><input aria-label="Quick add goal" value={questTitle} onChange={(event) => setQuestTitle(event.target.value)} maxLength={160} placeholder="Capture a goal without breaking your flow…"/><button className="primary" type="submit">Add goal</button></form>{activeQuests.length ? <div className="stack focus-list">{activeQuests.map((quest) => <div className={`quest-row dashboard-quest-row focus-row ${quest.status}`} key={quest.id}><button className="check" aria-label={`Complete ${quest.title}`} onClick={() => update((current) => completeQuest(current, quest.id))}><Check size={15}/></button><div className="dashboard-goal-main"><button className="dashboard-item-link" onClick={() => onNavigate('goals')}><b>{quest.title}</b><small>{quest.priority} priority · {(quest.resourceIds?.length ?? 0)} connected resource{quest.resourceIds?.length === 1 ? '' : 's'}</small></button><GoalResourceLinks resourceIds={quest.resourceIds} resources={state.resources}/></div><span className="focus-lane"><Circle size={7}/>{quest.status}</span><select aria-label={`Plan for ${quest.title}`} value={quest.status} onChange={(event) => update((current) => setQuestStatus(current, quest.id, event.target.value as QuestStatus))}><option value="now">Now</option><option value="next">Next</option><option value="later">Later</option><option value="done">Done</option></select></div>)}</div> : <button className="dashboard-empty-action" onClick={() => onNavigate('goals')}><Target size={19}/><span><b>Nothing is competing for your attention.</b><small>Choose one meaningful outcome to start with.</small></span><ArrowRight size={15}/></button>}</section>

      <button className="panel dashboard-nav-card skills-glance" onClick={() => onNavigate('skills')}><div className="panel-title"><div><p className="eyebrow">Capabilities</p><h2>{skills.length ? `${skills.length} skills in view` : 'Start your profile'}</h2></div><span className="card-orb lilac"><Sparkles/></span></div>{skills.length ? <div className="skill-cloud">{skills.slice(0, 5).map((skill, index) => <span key={skill.id} style={{ '--level': `${skill.level * 10}%`, '--delay': index } as React.CSSProperties}><i/><b>{skill.name}</b><small>{skill.level}/10</small></span>)}</div> : <p className="empty">Add skills and the experience behind them.</p>}<span className="card-source">Open Skills <ArrowRight size={14}/></span></button>

      <button className="panel dashboard-nav-card money-glance" onClick={() => onNavigate('career')}><div className="panel-title"><div><p className="eyebrow">Monthly picture</p><h2>{money(income, state.moneyPlan.currency, locale)}</h2></div><span className="card-orb coral"><WalletCards/></span></div><p className="muted">active income across {state.incomeSources.filter((item) => item.profileId === profileId && item.active).length} source{state.incomeSources.filter((item) => item.profileId === profileId && item.active).length === 1 ? '' : 's'}</p><div className="money-path"><span><small>Current</small><i style={{ width: `${Math.min(100, state.moneyPlan.monthlyTarget ? income / state.moneyPlan.monthlyTarget * 100 : 0)}%` }}/></span><b>{state.moneyPlan.monthlyTarget ? `${Math.round(income / state.moneyPlan.monthlyTarget * 100)}% of target` : 'Set a target'}</b></div><div className="mini-metric"><span>Target</span><b>{money(state.moneyPlan.monthlyTarget, state.moneyPlan.currency, locale)}</b></div><span className="card-source">Open Career <ArrowRight size={14}/></span></button>

      <section className="panel span-2 dashboard-action-panel learning-glance"><div className="panel-title"><div><p className="eyebrow">Learning in motion</p><h2>Learning resources</h2></div><button className="panel-source-link" onClick={() => onNavigate('library')}>Open Library <ArrowRight size={15}/></button></div>{learning.length ? <div className="dashboard-learning-list">{learning.map((resource, index) => <div className="resource-row dashboard-learning-row" key={resource.id}><span className="resource-number">0{index + 1}</span><button className="dashboard-item-link" onClick={() => onNavigate('library')}><span className="kind">{resource.kind}</span><b>{resource.title}</b><small>{resource.creator || 'Creator not recorded'}</small></button><select aria-label={`Learning status for ${resource.title}`} value={resource.status} onChange={(event) => update((current) => ({ ...current, resources: current.resources.map((item) => item.id === resource.id ? { ...item, status: event.target.value as LearningResource['status'] } : item) }))}><option value="queued">Queued</option><option value="in-progress">In progress</option><option value="completed">Completed</option></select></div>)}</div> : <button className="dashboard-empty-action" onClick={() => onNavigate('library')}><BookOpen size={19}/><span><b>Your learning space is open.</b><small>Add something useful when it earns a place.</small></span><ArrowRight size={15}/></button>}</section>
    </div>
  </div>
}
