import { useState } from 'react'
import { WorkspaceProvider, useWorkspace } from './app/AppState'
import { Shell, type PageId } from './ui/Shell'
import { CoachPage, Onboarding, ProfilePage } from './features/pages'
import { SkillsPage } from './features/skills/SkillsPage'
import { CareerPage } from './features/career/CareerPage'
import { GoalsPage } from './features/quests/QuestsPage'
import { LibraryPage } from './features/library/LibraryPage'
import { Dashboard } from './features/dashboard/Dashboard'
import { LandingPage } from './features/landing/LandingPage'
import './styles.css'
import './redesign.css'

function Workspace() {
  const { state } = useWorkspace()
  const [page, setPage] = useState<PageId>('dashboard')
  const [entry, setEntry] = useState<'landing' | 'onboarding'>('landing')
  if (!state) return entry === 'landing' ? <LandingPage onStart={() => setEntry('onboarding')}/> : <Onboarding onBack={() => setEntry('landing')}/>
  const pages: Record<PageId, React.ReactNode> = { dashboard: <Dashboard onNavigate={setPage}/>, skills: <SkillsPage/>, goals: <GoalsPage/>, library: <LibraryPage/>, career: <CareerPage/>, coach: <CoachPage/>, profile: <ProfilePage/> }
  return <Shell page={page} setPage={setPage}>{pages[page]}</Shell>
}

export default function App() { return <WorkspaceProvider><Workspace/></WorkspaceProvider> }
