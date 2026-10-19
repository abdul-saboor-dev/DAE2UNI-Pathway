import { Link } from 'react-router-dom'
import HealthStatus from '../components/HealthStatus.jsx'
import useAuth from '../context/useAuth.js'
import { canManageContent } from '../utils/roles.js'

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
      <div className="hero-panel site-container grid gap-12 px-6 py-10 sm:px-10 sm:py-14 lg:grid-cols-[minmax(0,1.18fr)_minmax(20rem,.82fr)] lg:gap-20 lg:px-14 lg:py-16">
        <div className="self-center">
          <p className="eyebrow">DAE CIT pathways</p>
          <h1 className="display-type mt-5 max-w-[14ch] text-[clamp(3.2rem,7vw,6.4rem)]">From Diploma to University.</h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-[var(--ui-muted-strong)]">Build a clear academic record, follow criteria back to official evidence, and explore the university routes that deserve your attention.</p>
          <div className="mt-9 flex flex-wrap gap-3"><Link to={primary[0]} className="action-primary">{primary[1]}</Link><Link to="/universities" className="action-secondary">Explore universities</Link></div>
        </div>
        <aside className="border-l border-[var(--ui-border-strong)] py-2 pl-6 sm:pl-8" aria-label="The verified pathway">
          <p className="metadata uppercase text-[var(--ui-accent)]">The verified pathway</p>
          <ol className="pathway-route mt-6 space-y-7">
            {steps.map(([number, title]) => <li key={number} className="pathway-stop"><p className="metadata">{number}</p><p className="card-title mt-1 text-lg text-[var(--ui-text)]">{title}</p></li>)}
          </ol>
          <Link to="/programs" className="mt-8 inline-flex min-h-11 items-center font-semibold text-academic underline decoration-2">Browse published programs <span aria-hidden="true" className="ml-2">→</span></Link>
        </aside>
      </div>
    </section>
    <section className="site-container py-14 lg:py-20" aria-labelledby="how-it-works">
      <div className="grid gap-5 border-b border-[var(--ui-border)] pb-8 lg:grid-cols-[minmax(0,.7fr)_minmax(18rem,.3fr)] lg:items-end"><div><p className="eyebrow">A traceable route</p><h2 id="how-it-works" className="section-title mt-3 max-w-2xl text-3xl text-navy sm:text-4xl">Research decisions in the right order.</h2></div><p className="body-copy text-sm">DAE2UNI keeps profile facts, official-source evidence, and catalogue discovery distinct so that uncertainty remains visible.</p></div>
      <ol className="grid md:grid-cols-3">{steps.map(([number, title, description]) => <li key={number} className="border-b border-[var(--ui-border)] py-7 md:border-b-0 md:border-r md:px-7 md:first:pl-0 md:last:border-r-0 md:last:pr-0"><span className="metadata text-academic">{number}</span><h3 className="card-title mt-4 text-xl text-navy">{title}</h3><p className="body-copy mt-3 text-sm">{description}</p></li>)}</ol>
    </section>
    <section className="border-t border-[var(--ui-border)]">
      <div className="site-container flex flex-col gap-4 py-6 text-sm sm:flex-row sm:items-center sm:justify-between"><p className="text-[var(--ui-muted)]">Service availability</p><HealthStatus /></div>
    </section>
  </>
}
