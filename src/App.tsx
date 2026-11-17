import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Activity, ArrowRight, Award, BookOpen, Bot, CheckCircle2, ChevronRight, CircleHelp, Clock3, Compass, FileCheck2, GraduationCap, LayoutDashboard, LogOut, Menu, MessageSquareText, Play, Plus, Rocket, ShieldCheck, Sparkles, Target, Users, X, Zap } from 'lucide-react'
import { isSupabaseConfigured, supabase } from './lib/supabase'

type Profile = { full_name: string | null; role: string }
type Course = { id: string; title: string; summary: string; level: string; estimated_hours: number; published: boolean }
type Assignment = { id: string; title: string; instructions: string; due_at: string | null; status: string }

const curriculum = [
  { n: '01', title: 'AI Literacy & Research', desc: 'Tumia AI kufanya utafiti, kuuliza maswali bora na kuthibitisha taarifa.', icon: Compass, tag: 'Msingi' },
  { n: '02', title: 'Opportunity Discovery', desc: 'Tambua tatizo lenye thamani na chunguza kama soko linahitaji suluhisho.', icon: Target, tag: 'Utafiti' },
  { n: '03', title: 'Product & Service Creation', desc: 'Geuza wazo kuwa prototype ya bidhaa au huduma inayoweza kujaribiwa.', icon: Rocket, tag: 'Ujenzi' },
  { n: '04', title: 'Digital Marketing', desc: 'Tengeneza ujumbe, maudhui na kampeni zinazolenga wateja sahihi.', icon: Zap, tag: 'Masoko' },
  { n: '05', title: 'Sales & Customer Systems', desc: 'Jenga mchakato wa kupata leads, kufuatilia mazungumzo na mauzo.', icon: Users, tag: 'Mauzo' },
  { n: '06', title: 'Automation & Growth', desc: 'Unganisha hatua zinazojirudia na pima matokeo ili kuboresha mfumo.', icon: Activity, tag: 'Mifumo' },
]

const navItems = [
  { id: 'overview', label: 'Muhtasari', icon: LayoutDashboard },
  { id: 'learning', label: 'Mafunzo', icon: BookOpen },
  { id: 'projects', label: 'Projects', icon: Rocket },
  { id: 'assignments', label: 'Kazi zangu', icon: FileCheck2 },
  { id: 'community', label: 'Jumuiya', icon: MessageSquareText },
]

export default function App() {
  const [session, setSession] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [active, setActive] = useState('overview')
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup')
  const [mobileNav, setMobileNav] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!supabase || !session?.user) { setProfile(null); setCourses([]); setAssignments([]); return }
    let alive = true
    const load = async () => {
      const [p, c, a] = await Promise.all([
        supabase!.from('profiles').select('full_name, role').eq('id', session.user.id).maybeSingle(),
        supabase!.from('courses').select('id,title,summary,level,estimated_hours,published').eq('published', true).order('sort_order'),
        supabase!.from('assignments').select('id,title,instructions,due_at,cohort_members!inner(student_id)').eq('cohort_members.student_id', session.user.id).order('created_at', { ascending: false }).limit(8),
      ])
      if (!alive) return
      setProfile(p.data as Profile | null)
      setCourses((c.data || []) as Course[])
      setAssignments(((a.data || []) as any[]).map(row => ({ ...row, status: 'assigned' })) as Assignment[])
    }
    void load()
    return () => { alive = false }
  }, [session])

  const firstName = useMemo(() => profile?.full_name?.trim().split(/\s+/)[0] || session?.user?.email?.split('@')[0] || 'Mwanafunzi', [profile, session])
  const signOut = async () => { if (supabase) await supabase.auth.signOut(); setSession(null) }

  const submitAuth = async (e: FormEvent) => {
    e.preventDefault()
    if (!supabase) { setNotice('Usanidi wa mfumo wa akaunti bado haujakamilika.'); return }
    setBusy(true); setNotice('')
    const result = authMode === 'signup'
      ? await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } })
      : await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (result.error) setNotice(result.error.message)
    else { setNotice(authMode === 'signup' ? 'Angalia barua pepe yako kuthibitisha akaunti.' : 'Umeingia kikamilifu.'); if (authMode === 'signin') setAuthOpen(false) }
  }

  const title = navItems.find(n => n.id === active)?.label || 'Muhtasari'
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
        <div className="brand"><div className="brand-mark"><Sparkles size={20}/></div><div><strong>TIDA <span>ACADEMY</span></strong><small>LEARN • BUILD • IMPLEMENT</small></div><button className="icon-btn close-nav" onClick={() => setMobileNav(false)} aria-label="Funga menyu"><X size={19}/></button></div>
        <div className="workspace-label">WORKSPACE</div>
        <nav>{navItems.map(item => <button key={item.id} className={`nav-link ${active === item.id ? 'active' : ''}`} onClick={() => { setActive(item.id); setMobileNav(false) }}><item.icon size={18}/><span>{item.label}</span>{active === item.id && <ChevronRight size={16} className="nav-arrow"/>}</button>)}</nav>
        <div className="sidebar-bottom"><div className="help-card"><div className="help-icon"><CircleHelp size={18}/></div><strong>Unahitaji msaada?</strong><p>Wasiliana na timu ya programu kupitia sehemu ya jumuiya.</p><button onClick={() => setActive('community')}>Pata msaada <ArrowRight size={14}/></button></div><div className="sidebar-foot"><ShieldCheck size={15}/> Powered by TIDA TZ</div></div>
      </aside>
      {mobileNav && <button className="scrim" onClick={() => setMobileNav(false)} aria-label="Funga menyu"/>}
      <main className="main-area">
        <header className="topbar"><div className="top-left"><button className="icon-btn mobile-menu" onClick={() => setMobileNav(true)} aria-label="Fungua menyu"><Menu size={20}/></button><div className="breadcrumb">TIDA Academy <span>/</span> {title}</div></div><div className="top-actions"><span className="cohort-pill"><span className="pulse-dot"/> COMMUNITY LEARNING</span>{session ? <div className="user-menu"><div className="avatar">{firstName.slice(0,1).toUpperCase()}</div><div className="user-meta"><strong>{firstName}</strong><small>{profile?.role || 'Mwanafunzi'}</small></div><button className="icon-btn" onClick={signOut} aria-label="Toka"><LogOut size={17}/></button></div> : <button className="btn btn-primary btn-small" onClick={() => { setAuthMode('signin'); setAuthOpen(true) }}>Ingia / Jiunge</button>}</div></header>
        <div className="content">
          {!session ? <Landing onJoin={() => { setAuthMode('signup'); setAuthOpen(true) }} onLogin={() => { setAuthMode('signin'); setAuthOpen(true) }} /> : <Dashboard active={active} firstName={firstName} courses={courses} assignments={assignments} setActive={setActive} />}
        </div>
      </main>
      {authOpen && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setAuthOpen(false) }}><div className="auth-modal"><button className="modal-close icon-btn" onClick={() => setAuthOpen(false)} aria-label="Funga"><X size={19}/></button><div className="modal-symbol"><Sparkles size={22}/></div><div className="eyebrow">TIDA ACADEMY ACCOUNT</div><h2>{authMode === 'signup' ? 'Anza safari yako' : 'Karibu tena'}</h2><p className="muted">{authMode === 'signup' ? 'Fungua akaunti ili kujiunga na mafunzo na kufuatilia projects zako.' : 'Ingia kuendelea na mafunzo yako.'}</p><form onSubmit={submitAuth}>{authMode === 'signup' && <label>Jina kamili<input required value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Mfano: Amina Juma"/></label>}<label>Barua pepe<input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jina@example.com"/></label><label>Nenosiri<input required minLength={8} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Angalau herufi 8"/></label><button className="btn btn-primary full-btn" disabled={busy}>{busy ? 'Inashughulikia...' : authMode === 'signup' ? 'Tengeneza akaunti' : 'Ingia kwenye akaunti'} <ArrowRight size={16}/></button></form>{notice && <p className="form-notice">{notice}</p>}<p className="switch-auth">{authMode === 'signup' ? 'Una akaunti tayari?' : 'Huna akaunti?'} <button onClick={() => { setAuthMode(authMode === 'signup' ? 'signin' : 'signup'); setNotice('') }}>{authMode === 'signup' ? 'Ingia' : 'Jiunge'}</button></p></div></div>}
      {!isSupabaseConfigured && <div className="setup-banner"><span className="setup-dot"/> Backend setup pending — account registration will activate after Supabase connection.</div>}
    </div>
  )
}

function Landing({ onJoin, onLogin }: { onJoin: () => void; onLogin: () => void }) {
  return <div className="landing">
    <section className="hero"><div className="hero-copy"><div className="eyebrow"><span className="eyebrow-line"/> PRACTICAL AI & DIGITAL BUSINESS ACADEMY</div><h1>Usijifunze AI tu.<br/><em>Jenga kitu halisi.</em></h1><p className="hero-desc">Jifunze kutumia Artificial Intelligence kutambua fursa, kujenga bidhaa na huduma, kupata wateja na kuunda mifumo ya kidijitali.</p><div className="hero-actions"><button className="btn btn-primary" onClick={onJoin}>Jiunge na Academy <ArrowRight size={17}/></button><button className="btn btn-ghost" onClick={onLogin}>Ingia kwenye akaunti</button></div><div className="hero-proof"><div className="proof-item"><CheckCircle2 size={16}/> Mafunzo ya vitendo</div><div className="proof-item"><CheckCircle2 size={16}/> Projects halisi</div><div className="proof-item"><CheckCircle2 size={16}/> Ufuatiliaji wa maendeleo</div></div></div><div className="hero-visual"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="hero-core"><div className="core-icon"><Bot size={38}/></div><span>AI × HUMAN</span><strong>BUILD VALUE</strong><small>FROM IDEA TO SYSTEM</small></div><div className="float-card float-top"><div className="float-icon blue"><Target size={17}/></div><div><small>STEP 01</small><strong>Find an opportunity</strong></div></div><div className="float-card float-bottom"><div className="float-icon gold"><Rocket size={17}/></div><div><small>STEP 02</small><strong>Build a solution</strong></div><CheckCircle2 size={17} className="float-check"/></div><div className="visual-caption">FROM SURVIVAL TO SYSTEM <span>•</span> POWERED BY TIDA TZ</div></div></section>
    <section className="value-strip"><div><strong>01</strong><span>Jifunze kwa vitendo</span></div><div><strong>02</strong><span>Jenga portfolio yako</span></div><div><strong>03</strong><span>Tekeleza kwa siku 30</span></div><div><strong>04</strong><span>Pima maendeleo</span></div></section>
    <section className="curriculum-section"><div className="section-heading"><div><div className="eyebrow">LEARNING PATHWAY</div><h2>Ujuzi unaojengwa kwa hatua.</h2></div><p>Kila hatua ina maarifa, zoezi na matokeo yanayoweza kuoneshwa.</p></div><div className="curriculum-grid">{curriculum.map(item => <article className="curriculum-card" key={item.n}><div className="card-top"><span>{item.n}</span><div className="curriculum-icon"><item.icon size={19}/></div></div><span className="tag">{item.tag}</span><h3>{item.title}</h3><p>{item.desc}</p><div className="card-bottom">PRACTICAL LEARNING <ArrowRight size={14}/></div></article>)}</div></section>
    <section className="cta-band"><div><div className="eyebrow light">YOUR NEXT STEP STARTS HERE</div><h2>Maarifa yanakuwa na nguvu<br/>yanapogeuka vitendo.</h2><p>Jiunge na TIDA Academy na anza kujenga uwezo wako hatua kwa hatua.</p></div><button className="btn btn-white" onClick={onJoin}>Fungua akaunti <ArrowRight size={16}/></button></section>
    <footer className="footer"><strong>TIDA ACADEMY</strong><span>FROM SURVIVAL TO SYSTEM</span><span>© {new Date().getFullYear()} TIDA TZ Company</span></footer>
  </div>
}

function Dashboard({ active, firstName, courses, assignments, setActive }: { active: string; firstName: string; courses: Course[]; assignments: Assignment[]; setActive: (v: string) => void }) {
  if (active === 'learning') return <div className="page-view"><PageTitle eyebrow="LEARNING LIBRARY" title="Maktaba ya mafunzo" desc="Chagua somo, jifunze na tumia maarifa kwenye project yako."/><div className="empty-state"><BookOpen size={28}/><h3>{courses.length ? 'Mafunzo yako' : 'Mafunzo yanaandaliwa'}</h3><p>{courses.length ? 'Mafunzo yaliyochapishwa yataonekana hapa.' : 'Kozi zitakazoidhinishwa na timu ya TIDA zitaonekana hapa. Hakuna maudhui ya mfano yanayoonyeshwa.'}</p></div>{courses.map(c => <article className="course-row" key={c.id}><div className="course-icon"><BookOpen/></div><div><strong>{c.title}</strong><p>{c.summary}</p><small>{c.level} · {c.estimated_hours} saa</small></div><button className="icon-btn"><ArrowRight/></button></article>)}</div>
  if (active === 'projects') return <div className="page-view"><PageTitle eyebrow="BUILD & SHOW YOUR WORK" title="Projects zako" desc="Hapa ndipo utaweka kazi unazojenga na kuonesha maendeleo yako."/><div className="empty-state"><Rocket size={28}/><h3>Bado huna project</h3><p>Projects zako zitaonekana baada ya kuanzisha kazi ya kwanza kupitia challenge au assignment.</p><button className="btn btn-primary" onClick={() => setActive('assignments')}>Angalia kazi ulizopewa <ArrowRight size={15}/></button></div></div>
  if (active === 'assignments') return <div className="page-view"><PageTitle eyebrow="YOUR ACTION LIST" title="Kazi za utekelezaji" desc="Kazi ulizopewa, tarehe za mwisho na hali ya uwasilishaji."/><div className="empty-state"><FileCheck2 size={28}/><h3>{assignments.length ? 'Assignments zako' : 'Hakuna kazi mpya'}</h3><p>{assignments.length ? 'Kazi ulizopewa zitaonekana hapa.' : 'Kocha akishakupangia kazi, utaiona hapa pamoja na maelekezo na deadline.'}</p></div>{assignments.map(a => <article className="course-row" key={a.id}><div className="course-icon"><FileCheck2/></div><div><strong>{a.title}</strong><p>{a.instructions}</p><small>{a.status}{a.due_at ? ' · ' + new Date(a.due_at).toLocaleDateString('sw-TZ') : ''}</small></div></article>)}</div>
  if (active === 'community') return <div className="page-view"><PageTitle eyebrow="BUILD TOGETHER" title="Jumuiya ya builders" desc="Shirikiana, uliza maswali na jifunze kupitia kazi za wengine."/><div className="empty-state"><Users size={28}/><h3>Jumuiya inafunguliwa</h3><p>Majadiliano na vikundi vya project vitaonekana hapa baada ya community module kuunganishwa.</p></div></div>
  return <div className="dashboard"><div className="welcome-row"><div><div className="eyebrow">STUDENT WORKSPACE</div><h1>Karibu, {firstName} <span>✦</span></h1><p>Leo ni siku nyingine ya kujenga ujuzi na kutekeleza wazo lako.</p></div><div className="date-chip"><Clock3 size={15}/> {new Date().toLocaleDateString('sw-TZ', { weekday: 'long', day: 'numeric', month: 'long' })}</div></div><div className="progress-banner"><div className="progress-symbol"><GraduationCap size={25}/></div><div className="progress-copy"><span>PROGRAM YA MSINGI</span><strong>FROM SURVIVAL TO SYSTEM</strong><p>Safari yako ya kujenga uwezo wa kutumia AI kwa vitendo.</p></div><div className="progress-status"><span>MAENDELEO</span><strong>Yanasubiri kuanza</strong><small>Kozi na cohort zitaonekana baada ya kupewa access.</small></div></div><div className="stat-grid"><Stat icon={BookOpen} label="Mafunzo" value={String(courses.length)} note="Yaliyopatikana kwako"/><Stat icon={FileCheck2} label="Kazi" value={String(assignments.length)} note="Zilizopangiwa wewe"/><Stat icon={Award} label="Vyeti" value="0" note="Vilivyokamilishwa"/><Stat icon={Activity} label="Mfululizo" value="—" note="Siku za utekelezaji"/></div><div className="section-heading compact"><div><div className="eyebrow">YOUR LEARNING PATH</div><h2>Hatua za kujenga uwezo</h2></div><button className="text-action" onClick={() => setActive('learning')}>Ona mafunzo <ArrowRight size={15}/></button></div><div className="path-list">{curriculum.slice(0,3).map((item,i) => <div className="path-item" key={item.n}><div className={`path-number ${i === 0 ? 'path-current' : ''}`}>{item.n}</div><div className="path-copy"><strong>{item.title}</strong><p>{item.desc}</p></div><span className="path-state">{i === 0 ? 'INASUBIRI' : 'IMEFUNGWA'}</span></div>)}</div><div className="dashboard-bottom"><div className="mini-panel"><div className="panel-title"><Sparkles size={17}/> AI Business Coach</div><h3>Jenga kwa kuuliza maswali sahihi.</h3><p>Msaidizi wa AI ataunganishwa kwenye hatua za kujifunza na kukagua kazi zako.</p><span className="coming-label">INAKUJA</span></div><div className="mini-panel"><div className="panel-title"><Target size={17}/> Lengo la siku 30</div><h3>Geuza maarifa kuwa utekelezaji.</h3><p>Mpango wa siku 30 utaanza baada ya kupewa challenge yako ya kwanza.</p><button className="text-action" onClick={() => setActive('assignments')}>Angalia kazi <ArrowRight size={14}/></button></div></div></div>
}

function Stat({ icon: Icon, label, value, note }: { icon: any; label: string; value: string; note: string }) { return <div className="stat-card"><div className="stat-top"><span>{label}</span><Icon size={17}/></div><strong>{value}</strong><small>{note}</small></div> }
function PageTitle({ eyebrow, title, desc }: { eyebrow: string; title: string; desc: string }) { return <div className="page-title"><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{desc}</p></div> }
