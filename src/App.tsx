import { useState } from 'react'
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
import './styles.css'
import './redesign.css'
import { I18nProvider } from './i18n/I18n'

function Workspace() {
  const { state } = useWorkspace()
  const [page, setPage] = useState<PageId>('dashboard')
  const [taskGoalId, setTaskGoalId] = useState('')
  const [entry, setEntry] = useState<'landing' | 'onboarding'>('landing')
  if (!state) return entry === 'landing' ? <LandingPage onStart={() => setEntry('onboarding')}/> : <Onboarding onBack={() => setEntry('landing')}/>
  const openTasks = (goalId: string) => { setTaskGoalId(goalId); setPage('tasks') }
  const pages: Record<PageId, React.ReactNode> = { dashboard: <Dashboard onNavigate={setPage}/>, skills: <SkillsPage/>, achievements: <AchievementsPage/>, goals: <GoalsPage onOpenTasks={openTasks}/>, tasks: <TasksPage initialGoalId={taskGoalId} onNavigateGoals={() => setPage('goals')}/>, library: <LibraryPage/>, career: <CareerPage/>, coach: <CoachPage/>, profile: <ProfilePage/> }
  return <Shell page={page} setPage={setPage}>{pages[page]}</Shell>
}

export default function App() { return <I18nProvider><WorkspaceProvider><Workspace/></WorkspaceProvider></I18nProvider> }
