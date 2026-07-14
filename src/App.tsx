import { useEffect, useState } from 'react'
import { WorkspaceProvider, useWorkspace } from './app/AppState'
import { Shell, type PageId } from './ui/Shell'
import { Onboarding } from './features/onboarding/Onboarding'
import { ProfilePage } from './features/profile/ProfilePage'
import { CoachPage } from './features/coach/CoachPage'
import { SkillsPage } from './features/skills/SkillsPage'
import { CareerPage } from './features/career/CareerPage'
import { GoalsPage } from './features/quests/QuestsPage'
import { TasksPage } from './features/tasks/TasksPage'
import { LibraryPage } from './features/library/LibraryPage'
import { Dashboard } from './features/dashboard/Dashboard'
import { AchievementsPage } from './features/achievements/AchievementsPage'
import { LandingPage } from './features/landing/LandingPage'
import { SettingsPage } from './features/settings/SettingsPage'
import './styles.css'
import './redesign.css'
import { I18nProvider } from './i18n/I18n'

const pageIds: PageId[] = ['dashboard', 'skills', 'achievements', 'goals', 'tasks', 'library', 'career', 'coach', 'profile', 'settings']
const pageFromUrl = (): PageId => {
  const candidate = window.location.hash.replace(/^#\/?/, '')
  return pageIds.includes(candidate as PageId) ? candidate as PageId : 'dashboard'
}

function Workspace() {
  const { state } = useWorkspace()
  const [page, setPage] = useState<PageId>(pageFromUrl)
  const [taskGoalId, setTaskGoalId] = useState('')
  const [entry, setEntry] = useState<'landing' | 'onboarding'>('landing')
  useEffect(() => {
    const syncPage = () => setPage(pageFromUrl())
    window.addEventListener('hashchange', syncPage)
    window.addEventListener('popstate', syncPage)
    return () => { window.removeEventListener('hashchange', syncPage); window.removeEventListener('popstate', syncPage) }
  }, [])
  if (!state) return entry === 'landing' ? <LandingPage onStart={() => setEntry('onboarding')}/> : <Onboarding onBack={() => setEntry('landing')}/>
  const navigate = (next: PageId) => {
    setPage(next)
    if (window.location.hash !== `#/${next}`) window.history.pushState(null, '', `#/${next}`)
  }
  const openTasks = (goalId: string) => { setTaskGoalId(goalId); navigate('tasks') }
  const pages: Record<PageId, React.ReactNode> = { dashboard: <Dashboard onNavigate={navigate}/>, skills: <SkillsPage/>, achievements: <AchievementsPage/>, goals: <GoalsPage onOpenTasks={openTasks}/>, tasks: <TasksPage initialGoalId={taskGoalId} onNavigateGoals={() => navigate('goals')}/>, library: <LibraryPage/>, career: <CareerPage/>, coach: <CoachPage/>, profile: <ProfilePage/>, settings: <SettingsPage/> }
  return <Shell page={page} setPage={navigate}>{pages[page]}</Shell>
}

export default function App() { return <I18nProvider><WorkspaceProvider><Workspace/></WorkspaceProvider></I18nProvider> }
