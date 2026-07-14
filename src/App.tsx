import { useState } from 'react'
import { WorkspaceProvider, useWorkspace } from './app/AppState'
import { Shell, type PageId } from './ui/Shell'
import { CareerPage, CoachPage, Dashboard, LibraryPage, Onboarding, ProfilePage, QuestsPage, SkillsPage } from './features/pages'
import './styles.css'

function Workspace() {
  const { state } = useWorkspace()
  const [page, setPage] = useState<PageId>('command')
  if (!state) return <Onboarding />
  const pages: Record<PageId, React.ReactNode> = { command: <Dashboard/>, skills: <SkillsPage/>, quests: <QuestsPage/>, library: <LibraryPage/>, career: <CareerPage/>, coach: <CoachPage/>, profile: <ProfilePage/> }
  return <Shell page={page} setPage={setPage}>{pages[page]}</Shell>
}

export default function App() { return <WorkspaceProvider><Workspace/></WorkspaceProvider> }
