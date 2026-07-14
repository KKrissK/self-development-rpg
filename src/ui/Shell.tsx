import { BookOpen, Bot, BriefcaseBusiness, CircleUserRound, Command, Ellipsis, ListChecks, Moon, Sun, TrendingUp } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { brand } from '../config/brand'
import { useWorkspace } from '../app/AppState'

export type PageId = 'command' | 'skills' | 'quests' | 'library' | 'career' | 'coach' | 'profile'
const items: { id: PageId; label: string; icon: typeof Command }[] = [
  { id: 'command', label: 'Command', icon: Command },
  { id: 'skills', label: 'Skills', icon: TrendingUp },
  { id: 'quests', label: 'Quests', icon: ListChecks },
  { id: 'library', label: 'Library', icon: BookOpen },
  { id: 'career', label: 'Career', icon: BriefcaseBusiness },
  { id: 'coach', label: 'AI Coach', icon: Bot },
  { id: 'profile', label: 'Profile', icon: CircleUserRound },
]
const primaryMobile = items.filter(({ id }) => ['command', 'skills', 'quests', 'career'].includes(id))

export function Shell({ page, setPage, children }: { page: PageId; setPage: (page: PageId) => void; children: ReactNode }) {
  const { state, update, storageWarning } = useWorkspace()
  const [moreOpen, setMoreOpen] = useState(false)
  if (!state) return null
  const profile = state.profiles.find((item) => item.id === state.activeProfileId) ?? state.profiles[0]
  const navigate = (id: PageId) => { setPage(id); setMoreOpen(false) }
  const toggleTheme = () => update((s) => ({ ...s, theme: s.theme === 'dark' ? 'light' : 'dark' }))
  return <div className="app-shell">
    <aside className="sidebar">
      <button className="brand" onClick={() => navigate('command')} aria-label={`${brand.productName} command page`}><span className="brand-mark">{brand.mark}</span><span><b>{brand.productName}</b><small>{brand.eyebrow}</small></span></button>
      <nav aria-label="Main navigation">{items.map(({ id, label, icon: Icon }) => <button key={id} aria-current={page === id ? 'page' : undefined} className={page === id ? 'nav-item active' : 'nav-item'} onClick={() => navigate(id)}><Icon size={18}/><span>{label}</span></button>)}</nav>
      <div className="sidebar-bottom">
        <button className="theme-toggle" onClick={toggleTheme}>{state.theme === 'dark' ? <Sun size={18}/> : <Moon size={18}/>} {state.theme === 'dark' ? 'Light mode' : 'Dark mode'}</button>
        <button className="profile-chip" onClick={() => navigate('profile')}><span className="avatar">{profile.name.slice(0, 2).toUpperCase()}</span><span><b>{profile.name}</b><small>Level {profile.level} · {profile.xp} XP</small></span></button>
      </div>
    </aside>
    <main className="main-content">{storageWarning && <div className="warning" role="status">{storageWarning}</div>}{children}</main>
    {moreOpen && <div className="mobile-more" role="dialog" aria-label="More navigation"><button onClick={() => navigate('library')}><BookOpen size={20}/> Library</button><button onClick={() => navigate('coach')}><Bot size={20}/> AI Coach</button><button onClick={() => navigate('profile')}><CircleUserRound size={20}/> Profile & data</button><button onClick={toggleTheme}>{state.theme === 'dark' ? <Sun size={20}/> : <Moon size={20}/>} {state.theme === 'dark' ? 'Light mode' : 'Dark mode'}</button></div>}
    <nav className="mobile-nav" aria-label="Mobile navigation">{primaryMobile.map(({ id, label, icon: Icon }) => <button key={id} aria-current={page === id ? 'page' : undefined} className={page === id ? 'active' : ''} onClick={() => navigate(id)}><Icon size={20}/><span>{label}</span></button>)}<button aria-expanded={moreOpen} className={['library', 'coach', 'profile'].includes(page) ? 'active' : ''} onClick={() => setMoreOpen((open) => !open)}><Ellipsis size={20}/><span>More</span></button></nav>
  </div>
}
