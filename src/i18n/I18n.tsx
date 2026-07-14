import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Languages, Moon, Settings, Sun, X } from 'lucide-react'
import { translateText, type Language } from './translations'

const STORAGE_KEY = 'untitled-language'
const I18nContext = createContext<{ language: Language; locale: string; setLanguage: (language: Language) => void; t: (text: string) => string } | null>(null)

function localize(root: ParentNode, language: Language) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let node = walker.nextNode()
  while (node) {
    const parent = node.parentElement
    if (parent && !['SCRIPT', 'STYLE', 'TEXTAREA', 'OPTION'].includes(parent.tagName) && node.textContent) {
      const translated = translateText(node.textContent, language)
      if (translated !== node.textContent) node.textContent = translated
    }
    node = walker.nextNode()
  }
  root.querySelectorAll?.<HTMLElement>('[placeholder], [aria-label], [title]').forEach((element) => {
    for (const attribute of ['placeholder', 'aria-label', 'title']) {
      const value = element.getAttribute(attribute)
      if (value) {
        const translated = translateText(value, language)
        if (translated !== value) element.setAttribute(attribute, translated)
      }
    }
  })
  root.querySelectorAll?.<HTMLOptionElement>('option').forEach((option) => {
    const translated = translateText(option.textContent ?? '', language)
    if (translated !== option.textContent) option.textContent = translated
  })
}

function DomLocalizer({ language, children }: { language: Language; children: ReactNode }) {
  useEffect(() => {
    const root = document.getElementById('localized-app')
    if (!root) return
    localize(root, language)
    const observer = new MutationObserver((records) => records.forEach((record) => record.addedNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) localize(node as ParentNode, language)
      else if (node.nodeType === Node.TEXT_NODE && node.textContent) {
        const translated = translateText(node.textContent, language)
        if (translated !== node.textContent) node.textContent = translated
      }
    })))
    observer.observe(root, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [language])
  return <div id="localized-app" key={language}>{children}</div>
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => localStorage.getItem(STORAGE_KEY) === 'hu' ? 'hu' : 'en')
  const setLanguage = (next: Language) => { localStorage.setItem(STORAGE_KEY, next); setLanguageState(next) }
  useEffect(() => { document.documentElement.lang = language }, [language])
  const value = useMemo(() => ({ language, locale: language === 'hu' ? 'hu-HU' : 'en-GB', setLanguage, t: (text: string) => translateText(text, language) }), [language])
  return <I18nContext.Provider value={value}><DomLocalizer language={language}>{children}</DomLocalizer></I18nContext.Provider>
}

export function useI18n() {
  const value = useContext(I18nContext)
  if (!value) throw new Error('useI18n must be used within I18nProvider')
  return value
}

export function SettingsMenu({ theme, onToggleTheme, placement = 'default' }: { theme?: 'light' | 'dark'; onToggleTheme?: () => void; placement?: 'default' | 'landing' | 'onboarding' }) {
  const { language, setLanguage } = useI18n()
  const [open, setOpen] = useState(false)
  return <div className={`settings-menu ${placement}`}><button className="settings-trigger" aria-label={language === 'hu' ? 'Beállítások' : 'Settings'} aria-expanded={open} onClick={() => setOpen((current) => !current)}><Settings size={18}/><span>{language === 'hu' ? 'Beállítások' : 'Settings'}</span></button>{open && <div className="settings-popover" role="dialog" aria-label={language === 'hu' ? 'Beállítások' : 'Settings'}><header><b>{language === 'hu' ? 'Beállítások' : 'Settings'}</b><button className="icon-btn" aria-label={language === 'hu' ? 'Beállítások bezárása' : 'Close settings'} onClick={() => setOpen(false)}><X size={16}/></button></header><label><span><Languages size={16}/>{language === 'hu' ? 'Felület nyelve' : 'Interface language'}</span><select aria-label={language === 'hu' ? 'Felület nyelve' : 'Interface language'} value={language} onChange={(event) => setLanguage(event.target.value as Language)}><option value="en">English</option><option value="hu">Magyar</option></select></label>{theme && onToggleTheme && <button className="settings-theme" onClick={onToggleTheme}>{theme === 'dark' ? <Sun size={17}/> : <Moon size={17}/>}<span><b>{language === 'hu' ? 'Megjelenés' : 'Appearance'}</b><small>{theme === 'dark' ? (language === 'hu' ? 'Váltás világos módra' : 'Switch to light mode') : (language === 'hu' ? 'Váltás sötét módra' : 'Switch to dark mode')}</small></span></button>}</div>}</div>
}
