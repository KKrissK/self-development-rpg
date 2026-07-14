import { ArrowRight, BookOpen, Check, CheckCircle2, CircleUserRound, Database, FileText, LockKeyhole, Sparkles, Target, TrendingUp, WalletCards } from 'lucide-react'
import { brand } from '../../config/brand'
import './landing.css'

function ProductFrame() {
  return <div className="landing-product-frame" aria-label="Dashboard preview">
    <div className="preview-sidebar"><span className="preview-brand">U/</span>{[0, 1, 2, 3, 4].map((item) => <i key={item} className={item === 0 ? 'active' : ''}/>)}</div>
    <div className="preview-main">
      <div className="preview-top"><div><small>DASHBOARD · LEVEL 4</small><b>Your life, in motion.</b></div><span>4</span></div>
      <div className="preview-progress"><i/><span>68 / 100 XP</span></div>
      <div className="preview-dashboard-grid">
        <section className="preview-goals"><small>YOUR NEXT OUTCOME</small><h3>Active Goals</h3><div><Check size={13}/><span>Publish the portfolio</span><b>+30</b></div><div><span className="preview-empty-check"/><span>Finish system design</span><b>+20</b></div><div><span className="preview-empty-check"/><span>Prepare the interview story</span><b>+15</b></div></section>
        <section className="preview-money"><small>MONEY PULSE</small><h3>€4,200</h3><span>monthly income</span><div><span>Target</span><b>€5,000</b></div></section>
        <section className="preview-skills"><small>SKILL MAP</small><h3>6 mapped</h3>{[['TypeScript', 72], ['System design', 54], ['Jenkins', 42]].map(([name, level]) => <div key={name}><span>{name}</span><i><em style={{ width: `${level}%` }}/></i></div>)}</section>
        <section className="preview-library"><small>IN MOTION</small><h3>Learning support</h3><div><BookOpen size={14}/><span>Designing Data-Intensive Applications</span><b>Goal-linked</b></div></section>
      </div>
    </div>
  </div>
}

function GoalLibraryPreview() {
  return <div className="landing-link-preview">
    <section className="landing-goal-card"><div><span>NOW</span><b>+25 XP</b></div><h3>Design the new system</h3><p>Turn the architecture into a decision the team can build from.</p><small><BookOpen size={13}/> LIBRARY SUPPORT</small><article><BookOpen size={16}/><span><b>Architecture field guide</b><small>in progress</small></span></article><article><FileText size={16}/><span><b>Decision record examples</b><small>queued</small></span></article></section>
    <span className="landing-connection"><ArrowRight size={18}/></span>
    <section className="landing-resource-card"><span>BOOK</span><h3>Architecture field guide</h3><div className="landing-impact"><CheckCircle2 size={17}/><span><b>Goal completed</b><small>Design the new system</small></span></div><small>GOAL CONNECTIONS</small><p><Check size={13}/> Design the new system <em>DONE</em></p></section>
  </div>
}

function SkillPreview() {
  return <div className="landing-skill-preview"><div className="landing-skill-head"><div><span>DEVOPS</span><h3>Jenkins</h3></div><b>4<small>/10</small></b></div><div className="landing-skill-meter"><i/><em/></div><section><small>ASSESSMENT SUMMARY</small><p>Independently handles routine job configuration and maintenance across several repositories.</p></section><details open><summary>Skill profile</summary><div><small>DEMONSTRATED STRENGTHS</small><p><Check size={13}/> Builds and maintains freestyle jobs</p><p><Check size={13}/> Connects deployment and migration steps</p><small>GROWTH AREAS</small><p><Target size={13}/> Credentials, concurrency, and safeguards</p></div></details></div>
}

function AiPreview() {
  return <div className="landing-ai-preview"><div><span>1</span><section><small>DESCRIBE WHAT YOU WANT</small><b>Assess my SQL skill honestly.</b></section></div><div><span>2</span><section><small>USE ANY AI</small><p>Question 3 of 6 — walk me through how you would diagnose a slow query.</p></section></div><div><span>3</span><section><small>IMPORT ONLY AFTER REVIEW</small><p>{'{ "level": 3, "strengths": [...], "gaps": [...] }'}</p></section></div></div>
}

export function LandingPage({ onStart }: { onStart: () => void }) {
  return <main className="landing-page">
    <nav className="landing-nav" aria-label="Landing navigation"><a className="landing-logo" href="#top"><span>{brand.mark}</span><div><b>{brand.productName}</b><small>{brand.eyebrow}</small></div></a><div className="landing-nav-links"><a href="#system">The system</a><a href="#privacy">Privacy</a><a href="#ai">AI workflow</a></div><button onClick={onStart}>Open your workspace <ArrowRight size={15}/></button></nav>

    <section className="landing-hero" id="top"><div className="landing-hero-glow"/><div className="landing-hero-copy"><p className="landing-kicker"><Sparkles size={14}/> A clearer way to grow</p><h1>See where you are. Decide where you’re going. Keep moving forward.</h1><p className="landing-lede">Bring your skills, Goals, learning, career, and finances into one private place—so you can focus on what matters next.</p><div className="landing-hero-actions"><button className="landing-cta" onClick={onStart}>Build your workspace <ArrowRight size={18}/></button><a href="#system">See how it works</a></div><div className="landing-proof"><span><LockKeyhole size={15}/> Local-first</span><span><CircleUserRound size={15}/> No account</span><span><Sparkles size={15}/> Bring your own AI</span></div></div><div className="landing-hero-visual"><ProductFrame/><span className="landing-float-card one"><Target size={15}/><b>3 active Goals</b></span><span className="landing-float-card two"><TrendingUp size={15}/><b>Skill level updated</b></span></div></section>

    <section className="landing-trust"><p>Built for people whose growth does not fit inside a task list.</p><div><span>SKILLS</span><i/> <span>GOALS</span><i/> <span>LIBRARY</span><i/> <span>CAREER</span><i/> <span>AI COACH</span></div></section>

    <section className="landing-section landing-system" id="system"><header><p className="landing-kicker">ONE COHERENT SYSTEM</p><h2>Your plans make more sense when the context stays attached.</h2><p>Untitled connects capability, outcomes, learning, and career reality instead of scattering them across five disconnected apps.</p></header><div className="landing-bento"><article className="landing-bento-card goals"><Target/><span>GOALS + LIBRARY</span><h3>Knowledge with a reason to exist.</h3><p>Pull books, courses, articles, and notes into a Goal. When the outcome is finished, the Library remembers what the resource helped accomplish.</p><GoalLibraryPreview/></article><article className="landing-bento-card skills"><TrendingUp/><span>SKILL PROFILES</span><h3>Track experience, not self-image.</h3><p>Separate level rationale, real experience, demonstrated strengths, and growth areas into a profile you can revisit.</p><SkillPreview/></article><article className="landing-bento-card career"><WalletCards/><span>CAREER REALITY</span><h3>Keep ambition grounded.</h3><p>See income, targets, CV variants, and capability in the same place as the work needed to change them.</p><div className="landing-career-metrics"><div><small>MONTHLY INCOME</small><b>€4,200</b></div><div><small>TARGET</small><b>€5,000</b></div><div><small>CV VAULT</small><b>4 variants</b></div></div></article></div></section>

    <section className="landing-story"><div className="landing-story-copy"><p className="landing-kicker">FROM INTENTION TO EVIDENCE</p><h2>A loop that turns growth into something visible.</h2><ol><li><span>01</span><div><b>Map the capability</b><p>Record what you can do, the experience behind it, and where the gaps are.</p></div></li><li><span>02</span><div><b>Choose an outcome</b><p>Create a Goal with a definition of done, focus lane, and the Library support it needs.</p></div></li><li><span>03</span><div><b>Close the loop</b><p>Complete the Goal once, claim XP once, and preserve the learning and career evidence.</p></div></li></ol></div><div className="landing-loop-visual"><div className="landing-orbit"><span><TrendingUp/>Skills</span><span><Target/>Goals</span><span><BookOpen/>Library</span><span><FileText/>Evidence</span><i>U/</i></div></div></section>

    <section className="landing-ai-section" id="ai"><div><p className="landing-kicker">AI WITHOUT THE LOCK-IN</p><h2>Use the model you trust. Keep control of what enters your workspace.</h2><p>Generate a purpose-built prompt, use it with any AI, then validate and preview the structured response before importing. No hidden calls. No surprise writes.</p><ul><li><Check/>Progress-tracked skill assessment</li><li><Check/>Structured Goals and Library items</li><li><Check/>Explicit review before every import</li></ul></div><AiPreview/></section>

    <section className="landing-privacy" id="privacy"><div className="landing-privacy-icon"><Database/><LockKeyhole/></div><div><p className="landing-kicker">YOUR DATA STAYS YOURS</p><h2>Private by architecture, not by promise.</h2><p>Your workspace is stored locally in this browser. CV files stay on this device in IndexedDB. There is no account, analytics layer, remote font, or direct AI connection.</p></div><div className="landing-privacy-list"><span><b>Browser-local</b><small>Workspace data and preferences</small></span><span><b>Portable</b><small>JSON export and validated restore</small></span><span><b>Resettable</b><small>Erase the workspace and stored files</small></span></div></section>

    <section className="landing-final"><span className="landing-final-mark">U/</span><p className="landing-kicker">START WITH WHAT IS TRUE TODAY</p><h2>Your next version needs a place to take shape.</h2><p>No account. No setup ceremony. Build the first version of your personal operating system in under a minute.</p><button className="landing-cta" onClick={onStart}>Create my workspace <ArrowRight size={18}/></button></section>
    <footer className="landing-footer"><a className="landing-logo" href="#top"><span>{brand.mark}</span><div><b>{brand.productName}</b><small>{brand.tagline}</small></div></a><p>Local-first · Account-free · Built for deliberate growth</p><button onClick={onStart}>Open app <ArrowRight size={14}/></button></footer>
  </main>
}
