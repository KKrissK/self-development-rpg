import { Languages, Moon, Settings, Sun } from 'lucide-react'
import { useWorkspace } from '../../app/AppState'
import { useI18n } from '../../i18n/I18n'
import type { Language } from '../../i18n/translations'

export function SettingsPage() {
  const { state, update } = useWorkspace()
  const { language, setLanguage } = useI18n()
  if (!state) return null

  const setTheme = (theme: 'light' | 'dark') => update((current) => ({ ...current, theme }))
  const languageOption = (value: Language, label: string, detail: string) => <button aria-pressed={language === value} className={language === value ? 'settings-option selected' : 'settings-option'} onClick={() => setLanguage(value)}><span className="settings-option-mark">{value.toUpperCase()}</span><span><b>{label}</b><small>{detail}</small></span></button>

  return <div className="page settings-page">
    <header className="page-head"><div><p className="eyebrow">WORKSPACE PREFERENCES</p><h1>Settings</h1><p>Control how your workspace looks and speaks. More workspace options can live here as the app grows.</p></div></header>
    <div className="settings-page-grid">
      <section className="panel settings-section"><header><span><Languages size={20}/></span><div><h2>Language</h2><p>Choose the language used throughout the interface.</p></div></header><div className="settings-options">{languageOption('en', 'English', 'Use the interface in English.')}{languageOption('hu', 'Magyar', 'A felület használata magyarul.')}</div></section>
      <section className="panel settings-section"><header><span>{state.theme === 'dark' ? <Moon size={20}/> : <Sun size={20}/>}</span><div><h2>Appearance</h2><p>Choose the atmosphere that is most comfortable for you.</p></div></header><div className="settings-options"><button aria-pressed={state.theme === 'light'} className={state.theme === 'light' ? 'settings-option selected' : 'settings-option'} onClick={() => setTheme('light')}><span className="settings-option-mark"><Sun size={17}/></span><span><b>Light mode</b><small>Bright surfaces and dark text.</small></span></button><button aria-pressed={state.theme === 'dark'} className={state.theme === 'dark' ? 'settings-option selected' : 'settings-option'} onClick={() => setTheme('dark')}><span className="settings-option-mark"><Moon size={17}/></span><span><b>Dark mode</b><small>Dim surfaces for lower-light environments.</small></span></button></div></section>
      <section className="panel settings-section settings-future"><header><span><Settings size={20}/></span><div><h2>More settings</h2><p>This page is ready for future notification, backup, privacy, and AI workflow preferences.</p></div></header></section>
    </div>
  </div>
}
