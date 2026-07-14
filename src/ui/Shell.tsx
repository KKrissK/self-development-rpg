import { BookOpen, Bot, BriefcaseBusiness, CircleUserRound, Ellipsis, LayoutDashboard, ListChecks, ListTodo, Sparkles, TrendingUp, Trophy } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { brand } from '../config/brand'
import { useWorkspace } from '../app/AppState'
import { SettingsMenu, useI18n } from '../i18n/I18n'

export type PageId = 'dashboard' | 'skills' | 'achievements' | 'goals' | 'tasks' | 'library' | 'career' | 'coach' | 'profile'
const items: { id: PageId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'goals', label: 'Goals', icon: ListChecks },
  { id: 'tasks', label: 'Tasks', icon: ListTodo },
  { id: 'skills', label: 'Skills', icon: TrendingUp },
  { id: 'achievements', label: 'Achievements', icon: Trophy },
  { id: 'library', label: 'Library', icon: BookOpen },
  { id: 'career', label: 'Career', icon: BriefcaseBusiness },
  { id: 'coach', label: 'AI Coach', icon: Bot },
  { id: 'profile', label: 'Profile', icon: CircleUserRound },
]
const primaryMobile = items.filter(({ id }) => ['dashboard', 'goals', 'tasks', 'skills'].includes(id))
const navigationGroups: { label: string; ids: PageId[] }[] = [
  { label: 'Plan', ids: ['dashboard', 'goals', 'tasks'] },
  { label: 'Grow', ids: ['skills', 'achievements', 'library'] },
  { label: 'Move', ids: ['career', 'coach'] },
]

export function Shell({ page, setPage, children }: { page: PageId; setPage: (page: PageId) => void; children: ReactNode }) {
  const { state, update, storageWarning } = useWorkspace()
  const { locale } = useI18n()
  const [moreOpen, setMoreOpen] = useState(false)
  if (!state) return null
  const profile = state.profiles.find((item) => item.id === state.activeProfileId) ?? state.profiles[0]
  const current = items.find((item) => item.id === page) ?? items[0]
  const CurrentIcon = current.icon
  const today = new Intl.DateTimeFormat(locale, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())
  const navigate = (id: PageId) => { setPage(id); setMoreOpen(false) }
  const toggleTheme = () => update((s) => ({ ...s, theme: s.theme === 'dark' ? 'light' : 'dark' }))
  return <div className="app-shell">
    <div className="ambient-canvas" aria-hidden="true"><i/><i/><i/></div>
    <aside className="sidebar">
      <button className="brand" onClick={() => navigate('dashboard')} aria-label={`${brand.productName} dashboard`}><span className="brand-mark">{brand.mark}</span><span><b>{brand.productName}</b><small>Your private space</small></span></button>
      <nav aria-label="Main navigation">{navigationGroups.map((group) => <section className="nav-group" key={group.label}><span className="nav-group-label">{group.label}</span>{group.ids.map((id) => { const item = items.find((candidate) => candidate.id === id)!; const Icon = item.icon; return <button key={id} aria-current={page === id ? 'page' : undefined} className={page === id ? 'nav-item active' : 'nav-item'} onClick={() => navigate(id)}><span className="nav-icon"><Icon size={18}/></span><span>{item.label}</span>{page === id && <i/>}</button> })}</section>)}<section className="nav-group nav-personal"><span className="nav-group-label">You</span><button aria-current={page === 'profile' ? 'page' : undefined} className={page === 'profile' ? 'nav-item active' : 'nav-item'} onClick={() => navigate('profile')}><span className="nav-icon"><CircleUserRound size={18}/></span><span>Profile</span>{page === 'profile' && <i/>}</button></section></nav>
      <div className="sidebar-bottom">
        <SettingsMenu theme={state.theme} onToggleTheme={toggleTheme}/>
        <button className="profile-chip" onClick={() => navigate('profile')}><span className="avatar">{profile.name.slice(0, 2).toUpperCase()}</span><span><b>{profile.name}</b><small>{profile.xp} XP across level {profile.level}</small></span><Sparkles size={14}/></button>
      </div>
    </aside>
    <main className="main-content"><header className="workspace-bar"><div className="workspace-location"><span className="workspace-location-icon"><CurrentIcon size={16}/></span><b>{current.label}</b></div><span className="workspace-date">{today}</span><div className="workspace-settings"><SettingsMenu theme={state.theme} onToggleTheme={toggleTheme}/></div><button className="workspace-avatar" onClick={() => navigate('profile')} aria-label={`Open ${profile.name} profile`}>{profile.name.slice(0, 2).toUpperCase()}</button></header>{storageWarning && <div className="warning" role="status">{storageWarning}</div>}<div className="page-stage" key={page}>{children}</div></main>
    {moreOpen && <div className="mobile-more" role="dialog" aria-label="More navigation"><button onClick={() => navigate('career')}><BriefcaseBusiness size={20}/> Career</button><button onClick={() => navigate('achievements')}><Trophy size={20}/> Achievements</button><button onClick={() => navigate('library')}><BookOpen size={20}/> Library</button><button onClick={() => navigate('coach')}><Bot size={20}/> AI Coach</button><button onClick={() => navigate('profile')}><CircleUserRound size={20}/> Profile & data</button></div>}
    <nav className="mobile-nav" aria-label="Mobile navigation">{primaryMobile.map(({ id, label, icon: Icon }) => <button key={id} aria-current={page === id ? 'page' : undefined} className={page === id ? 'active' : ''} onClick={() => navigate(id)}><Icon size={20}/><span>{label}</span></button>)}<button aria-expanded={moreOpen} className={['career', 'achievements', 'library', 'coach', 'profile'].includes(page) ? 'active' : ''} onClick={() => setMoreOpen((open) => !open)}><Ellipsis size={20}/><span>More</span></button></nav>
  </div>
}
