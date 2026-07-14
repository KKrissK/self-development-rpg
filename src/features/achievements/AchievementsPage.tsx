import { useEffect, useRef, useState } from 'react'
import { Award, CalendarDays, ExternalLink, ImagePlus, Link2, Pencil, Plus, Sparkles, Trash2, Trophy } from 'lucide-react'
import { uid, useWorkspace } from '../../app/AppState'
import type { Achievement, AchievementKind } from '../../domain/model'
import { ACHIEVEMENT_IMAGE_ACCEPT, validateAchievementImage } from '../../platform/storage/achievementImageRepository'
import { useI18n } from '../../i18n/I18n'

const kindLabels: Record<AchievementKind, string> = {
  project: 'Project', milestone: 'Milestone', award: 'Award', certification: 'Certification', contribution: 'Contribution', other: 'Other',
}

function cleanUrl(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  const parsed = new URL(candidate)
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Use an http or https link.')
  return parsed.toString()
}

function AchievementImagePreview({ imageId, title }: { imageId: string; title: string }) {
  const { achievementImages } = useWorkspace()
  const [source, setSource] = useState('')
  useEffect(() => {
    let active = true
    let objectUrl = ''
    void achievementImages.get(imageId).then((stored) => {
      if (!active || !stored) return
      objectUrl = URL.createObjectURL(stored.blob)
      setSource(objectUrl)
    })
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [achievementImages, imageId])
  return source ? <img src={source} alt={`${title} achievement`}/> : <div className="achievement-image-missing"><ImagePlus size={24}/><span>Image unavailable</span></div>
}

function AchievementSkillPicker({ skills, selectedIds }: { skills: { id: string; name: string }[]; selectedIds: string[] }) {
  return <fieldset className="achievement-skill-picker"><legend>Related skills</legend>{skills.length ? <div className="goal-skill-options">{skills.map((skill) => <label key={skill.id}><input type="checkbox" name="skillIds" value={skill.id} defaultChecked={selectedIds.includes(skill.id)}/><span><b>{skill.name}</b></span></label>)}</div> : <p>No skills yet.</p>}</fieldset>
}

function AchievementEditor({ achievement, skills, onCancel, onSaved }: { achievement?: Achievement; skills: { id: string; name: string }[]; onCancel: () => void; onSaved: () => void }) {
  const { state, update, achievementImages } = useWorkspace()
  const fileInput = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  if (!state) return null
  const profileId = state.activeProfileId

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    let newImage: Achievement['image']
    let newImageId = ''
    try {
      const form = new FormData(event.currentTarget)
      const title = String(form.get('title')).trim()
      if (!title) throw new Error('Give this achievement a title.')
      const url = cleanUrl(String(form.get('url')))
      const skillIds = form.getAll('skillIds').map(String)
      if (file) {
        const validationError = validateAchievementImage(file)
        if (validationError) throw new Error(validationError)
        newImageId = uid()
        newImage = await achievementImages.save(newImageId, file)
      }
      const next: Achievement = {
        id: achievement?.id ?? uid(),
        profileId,
        title,
        kind: form.get('kind') as AchievementKind,
        description: String(form.get('description')).trim(),
        url,
        achievedAt: String(form.get('achievedAt')) || undefined,
        skillId: skillIds[0],
        skillIds,
        image: newImage ?? achievement?.image,
        createdAt: achievement?.createdAt ?? new Date().toISOString(),
      }
      update((current) => ({ ...current, achievements: achievement ? current.achievements.map((item) => item.id === achievement.id ? next : item) : [next, ...current.achievements] }))
      if (newImage && achievement?.image) await achievementImages.delete(achievement.image.id)
      onSaved()
    } catch (error) {
      if (newImageId) await achievementImages.delete(newImageId).catch(() => undefined)
      setMessage(error instanceof Error ? error.message : 'This achievement could not be saved.')
    } finally { setBusy(false) }
  }

  function chooseFile(next?: File) {
    if (!next) return
    const error = validateAchievementImage(next)
    if (error) { setMessage(error); if (fileInput.current) fileInput.current.value = ''; return }
    setFile(next)
    setMessage('')
  }

  return <form className="inline-form achievement-form" onSubmit={(event) => void submit(event)}>
    <label className="achievement-title-field">Achievement title<input name="title" required maxLength={160} defaultValue={achievement?.title} placeholder="The app I built, a promotion, an award…"/></label>
    <label>Type<select name="kind" defaultValue={achievement?.kind ?? 'project'}>{Object.entries(kindLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
    <label>Date<input name="achievedAt" type="date" defaultValue={achievement?.achievedAt}/></label>
    <label className="wide">Link<input name="url" type="text" inputMode="url" maxLength={2048} defaultValue={achievement?.url} placeholder="Project, portfolio, article, certificate…"/></label>
    <AchievementSkillPicker skills={skills} selectedIds={[...new Set([...(achievement?.skillIds ?? []), ...(achievement?.skillId ? [achievement.skillId] : [])])]}/>
    <label className="achievement-file-field">Picture<input ref={fileInput} type="file" accept={ACHIEVEMENT_IMAGE_ACCEPT} onChange={(event) => chooseFile(event.target.files?.[0])}/><small>{file ? file.name : achievement?.image ? `Keep ${achievement.image.fileName}, or choose a replacement` : 'Optional JPG, PNG, WebP, GIF, or AVIF · max 10 MB'}</small></label>
    <label className="achievement-description-field">What makes it meaningful?<textarea name="description" maxLength={3000} defaultValue={achievement?.description} placeholder="What you made or achieved, why it mattered, and the outcome you are proud of."/></label>
    {message && <p className="notice achievement-form-notice" role="status">{message}</p>}
    <div className="form-actions"><button className="primary" disabled={busy} type="submit">{achievement ? 'Save changes' : 'Add achievement'}</button><button className="secondary" disabled={busy} type="button" onClick={onCancel}>Cancel</button></div>
  </form>
}

export function AchievementsPage() {
  const { locale } = useI18n()
  const { state, update, achievementImages } = useWorkspace()
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  if (!state) return null
  const achievements = state.achievements.filter((item) => item.profileId === state.activeProfileId)
  const skills = state.skills.filter((item) => item.profileId === state.activeProfileId).map(({ id, name }) => ({ id, name }))
  const editing = achievements.find((item) => item.id === editingId)

  async function remove(achievement: Achievement) {
    if (!confirm(`Delete “${achievement.title}”? This removes the achievement${achievement.image ? ' and its locally stored picture' : ''}.`)) return
    try {
      if (achievement.image) await achievementImages.delete(achievement.image.id)
      update((current) => ({ ...current, achievements: current.achievements.filter((item) => item.id !== achievement.id) }))
      setMessage('Achievement deleted.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'This achievement could not be deleted.') }
  }

  const closeEditor = () => { setAdding(false); setEditingId(null) }
  return <div className="page achievements-page">
    <header className="page-head"><div><p className="eyebrow">PROOF & PROGRESS</p><h1>Achievements</h1><p>Keep the projects, milestones, awards, and contributions that remind you what you can do.</p></div><button className="primary" onClick={() => { setAdding(!adding); setEditingId(null) }}><Plus size={18}/> {adding ? 'Close add' : 'Add achievement'}</button></header>
    <section className="achievement-intro"><div><Trophy size={22}/><span><b>{achievements.length}</b><small>things worth remembering</small></span></div><p>Build a private record of proof. Add context, connect a skill, and include a link or picture when it helps tell the story.</p></section>
    {adding && <AchievementEditor skills={skills} onCancel={closeEditor} onSaved={() => { closeEditor(); setMessage('Achievement added.') }}/>} 
    {editing && <AchievementEditor achievement={editing} skills={skills} onCancel={closeEditor} onSaved={() => { closeEditor(); setMessage('Achievement updated.') }}/>} 
    {message && <p className="notice" role="status">{message}</p>}
    <div className="achievement-grid">{achievements.map((achievement) => {
      const linkedSkills = [...new Set([...(achievement.skillIds ?? []), ...(achievement.skillId ? [achievement.skillId] : [])])].map((id) => skills.find((skill) => skill.id === id)).filter((skill): skill is { id: string; name: string } => Boolean(skill))
      return <article className={`panel achievement-card ${achievement.image ? 'has-image' : ''}`} key={achievement.id}>
        <div className="achievement-visual">{achievement.image ? <AchievementImagePreview imageId={achievement.image.id} title={achievement.title}/> : <div className="achievement-placeholder"><Sparkles size={30}/><span>{kindLabels[achievement.kind]}</span></div>}</div>
        <div className="achievement-card-body"><div className="achievement-meta"><span className="kind"><Award size={13}/>{kindLabels[achievement.kind]}</span>{achievement.achievedAt && <time dateTime={achievement.achievedAt}><CalendarDays size={13}/>{new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(`${achievement.achievedAt}T00:00:00`))}</time>}</div><h2>{achievement.title}</h2>{achievement.description && <p>{achievement.description}</p>}{linkedSkills.length > 0 && <div className="achievement-skills">{linkedSkills.map((skill) => <span className="achievement-skill" key={skill.id}>Built with {skill.name}</span>)}</div>}<footer>{achievement.url ? <a className="achievement-link" href={achievement.url} target="_blank" rel="noreferrer"><Link2 size={16}/> Open link <ExternalLink size={13}/></a> : <span/>}<div><button className="icon-btn" aria-label={`Edit ${achievement.title}`} onClick={() => { setEditingId(achievement.id); setAdding(false) }}><Pencil size={16}/></button><button className="icon-btn" aria-label={`Delete ${achievement.title}`} onClick={() => void remove(achievement)}><Trash2 size={17}/></button></div></footer></div>
      </article>
    })}</div>
    {!achievements.length && !adding && <section className="achievement-empty"><Trophy size={32}/><h2>Make your progress visible to yourself.</h2><p>Your first entry can be this app, a work win, a certificate, or anything you are genuinely proud of.</p><button className="primary" onClick={() => setAdding(true)}><Plus size={18}/> Add the first one</button></section>}
  </div>
}
