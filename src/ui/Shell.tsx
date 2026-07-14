import { BookOpen, Bot, BriefcaseBusiness, CircleUserRound, Ellipsis, LayoutDashboard, ListChecks, Moon, Sparkles, Sun, TrendingUp } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { brand } from '../config/brand'
import { useWorkspace } from '../app/AppState'

export type PageId = 'dashboard' | 'skills' | 'goals' | 'library' | 'career' | 'coach' | 'profile'
const items: { id: PageId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'skills', label: 'Skills', icon: TrendingUp },
  { id: 'goals', label: 'Goals', icon: ListChecks },
  { id: 'library', label: 'Library', icon: BookOpen },
  { id: 'career', label: 'Career', icon: BriefcaseBusiness },
  { id: 'coach', label: 'AI Coach', icon: Bot },
  { id: 'profile', label: 'Profile', icon: CircleUserRound },
]
const primaryMobile = items.filter(({ id }) => ['dashboard', 'skills', 'goals', 'career'].includes(id))
const navigationGroups: { label: string; ids: PageId[] }[] = [
  { label: 'Plan', ids: ['dashboard', 'goals'] },
  { label: 'Grow', ids: ['skills', 'library'] },
  { label: 'Move', ids: ['career', 'coach'] },
]

export function Shell({ page, setPage, children }: { page: PageId; setPage: (page: PageId) => void; children: ReactNode }) {
  const { state, update, storageWarning } = useWorkspace()
  const [moreOpen, setMoreOpen] = useState(false)
  if (!state) return null
  const profile = state.profiles.find((item) => item.id === state.activeProfileId) ?? state.profiles[0]
  const current = items.find((item) => item.id === page) ?? items[0]
  const CurrentIcon = current.icon
  const today = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())
  const navigate = (id: PageId) => { setPage(id); setMoreOpen(false) }
  const toggleTheme = () => update((s) => ({ ...s, theme: s.theme === 'dark' ? 'light' : 'dark' }))
  return <div className="app-shell">
    <div className="ambient-canvas" aria-hidden="true"><i/><i/><i/></div>
    <aside className="sidebar">
      <button className="brand" onClick={() => navigate('dashboard')} aria-label={`${brand.productName} dashboard`}><span className="brand-mark">{brand.mark}</span><span><b>{brand.productName}</b><small>Your private space</small></span></button>
      <nav aria-label="Main navigation">{navigationGroups.map((group) => <section className="nav-group" key={group.label}><span className="nav-group-label">{group.label}</span>{group.ids.map((id) => { const item = items.find((candidate) => candidate.id === id)!; const Icon = item.icon; return <button key={id} aria-current={page === id ? 'page' : undefined} className={page === id ? 'nav-item active' : 'nav-item'} onClick={() => navigate(id)}><span className="nav-icon"><Icon size={18}/></span><span>{item.label}</span>{page === id && <i/>}</button> })}</section>)}<section className="nav-group nav-personal"><span className="nav-group-label">You</span><button aria-current={page === 'profile' ? 'page' : undefined} className={page === 'profile' ? 'nav-item active' : 'nav-item'} onClick={() => navigate('profile')}><span className="nav-icon"><CircleUserRound size={18}/></span><span>Profile</span>{page === 'profile' && <i/>}</button></section></nav>
      <div className="sidebar-bottom">
        <button className="theme-toggle" onClick={toggleTheme}>{state.theme === 'dark' ? <Sun size={18}/> : <Moon size={18}/>} {state.theme === 'dark' ? 'Light atmosphere' : 'Dark atmosphere'}</button>
        <button className="profile-chip" onClick={() => navigate('profile')}><span className="avatar">{profile.name.slice(0, 2).toUpperCase()}</span><span><b>{profile.name}</b><small>{profile.xp} XP across level {profile.level}</small></span><Sparkles size={14}/></button>
      </div>
    </aside>
    <main className="main-content"><header className="workspace-bar"><div className="workspace-location"><span className="workspace-location-icon"><CurrentIcon size={16}/></span><b>{current.label}</b></div><span className="workspace-date">{today}</span><button className="workspace-avatar" onClick={() => navigate('profile')} aria-label={`Open ${profile.name} profile`}>{profile.name.slice(0, 2).toUpperCase()}</button></header>{storageWarning && <div className="warning" role="status">{storageWarning}</div>}<div className="page-stage" key={page}>{children}</div></main>
    {moreOpen && <div className="mobile-more" role="dialog" aria-label="More navigation"><button onClick={() => navigate('library')}><BookOpen size={20}/> Library</button><button onClick={() => navigate('coach')}><Bot size={20}/> AI Coach</button><button onClick={() => navigate('profile')}><CircleUserRound size={20}/> Profile & data</button><button onClick={toggleTheme}>{state.theme === 'dark' ? <Sun size={20}/> : <Moon size={20}/>} {state.theme === 'dark' ? 'Light atmosphere' : 'Dark atmosphere'}</button></div>}
    <nav className="mobile-nav" aria-label="Mobile navigation">{primaryMobile.map(({ id, label, icon: Icon }) => <button key={id} aria-current={page === id ? 'page' : undefined} className={page === id ? 'active' : ''} onClick={() => navigate(id)}><Icon size={20}/><span>{label}</span></button>)}<button aria-expanded={moreOpen} className={['library', 'coach', 'profile'].includes(page) ? 'active' : ''} onClick={() => setMoreOpen((open) => !open)}><Ellipsis size={20}/><span>More</span></button></nav>
  </div>
}
