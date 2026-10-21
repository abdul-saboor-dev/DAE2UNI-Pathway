import { Link } from 'react-router-dom'
import HealthStatus from '../components/HealthStatus.jsx'
import useAuth from '../context/useAuth.js'
import { canManageContent } from '../utils/roles.js'
import pathwayArtwork from '../assets/dae2uni-hero-pathway.svg'

const steps = [
  ['01', 'DAE academic profile', 'Keep Matric, DAE stage, marks, discipline, and domicile together in one private student profile.'],
  ['02', 'Verified admission criteria', 'Where reviewed rules exist, guidance stays tied to published evidence and explains what still needs confirmation.'],
  ['03', 'University discovery', 'Explore published universities, campuses, and computing programs without turning research into an admission guarantee.'],
]

export default function HomePage() {
  const { user } = useAuth()
  const primary = canManageContent(user?.role) ? ['/admin', 'Open operations workspace'] : user?.role === 'student' ? ['/dashboard', 'Open your dashboard'] : ['/register', 'Create a student account']
  return <>
    <section className="landing-hero">
      <div className="landing-hero__grid site-container">
        <div className="self-center">
          <p className="eyebrow text-[var(--brand-cyan)]">DAE CIT pathways</p>
          <h1 className="display-type mt-5 max-w-[12ch] text-[clamp(3rem,5.5vw,5.2rem)] text-white">From DAE to <span className="hero-accent">University.</span></h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-white/75">Build a clear academic record, follow admission criteria back to official evidence, and explore university routes with confidence.</p>
          <div className="mt-9 flex flex-wrap gap-3"><Link to={primary[0]} className="action-primary">{primary[1]}</Link><Link to="/universities" className="action-secondary border-white/45 text-white hover:bg-white/10">Explore universities</Link><Link to="/programs" className="inline-flex min-h-11 items-center font-semibold text-white underline decoration-[var(--brand-amber)] decoration-2 underline-offset-4">Browse programs →</Link></div>
        </div>
        <figure className="hero-artwork-frame self-center"><img src={pathwayArtwork} className="hero-artwork" alt="DAE pathway from academic profile through merit and admission to university" /></figure>
      </div>
    </section>
    <section className="site-container py-14 lg:py-20" aria-labelledby="how-it-works">
      <div className="grid gap-5 border-b border-[var(--ui-border)] pb-8 lg:grid-cols-[minmax(0,.7fr)_minmax(18rem,.3fr)] lg:items-end"><div><p className="eyebrow">A traceable route</p><h2 id="how-it-works" className="section-title mt-3 max-w-2xl text-3xl text-navy sm:text-4xl">Research decisions in the right order.</h2></div><p className="body-copy text-sm">DAE2UNI keeps profile facts, official-source evidence, and catalogue discovery distinct so that uncertainty remains visible.</p></div>
      <ol className="mt-8 grid gap-7 md:grid-cols-3">{steps.map(([number, title, description]) => <li key={number} className="journey-step"><span className="metadata text-academic">{number}</span><h3 className="card-title mt-4 text-xl text-navy">{title}</h3><p className="body-copy mt-3 text-sm">{description}</p></li>)}</ol>
    </section>
    <section className="border-t border-[var(--ui-border)]">
      <div className="site-container flex flex-col gap-4 py-6 text-sm sm:flex-row sm:items-center sm:justify-between"><p className="text-[var(--ui-muted)]">Service availability</p><HealthStatus /></div>
    </section>
  </>
}
