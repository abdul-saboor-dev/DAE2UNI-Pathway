import { Link } from 'react-router-dom'
import HealthStatus from '../components/HealthStatus.jsx'
import useAuth from '../context/useAuth.js'
import { canManageContent } from '../utils/roles.js'

const steps = [
  ['01', 'Search the catalogue', 'Explore source-attributed universities, campuses, and undergraduate programs.'],
  ['02', 'Build your profile', 'Record DAE CIT, Matric, domicile, and study preferences as a draft or complete profile.'],
  ['03', 'Plan the next decision', 'Eligibility, merit, entry tests, and application planning are planned—not presented as completed results.'],
]

export default function HomePage() {
  const { user } = useAuth()
  const primary = canManageContent(user?.role) ? ['/admin', 'Open operations workspace'] : user?.role === 'student' ? ['/dashboard', 'Open your dashboard'] : ['/register', 'Create a student account']
  return <>
    <section className="border-b border-[var(--ui-border)] bg-navy text-white">
      <div className="site-container grid gap-10 py-12 sm:py-16 lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,.75fr)] lg:gap-16 lg:py-20">
        <div>
          <p className="text-xs font-black uppercase tracking-[.2em] text-[#d9b56e]">DAE CIT · Undergraduate pathways</p>
          <h1 className="display-type mt-5 max-w-[14ch] text-[clamp(3.2rem,7vw,6.4rem)]">From Diploma to University.</h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-[#e1e8eb]">A clearer place to explore universities and programs, keep your academic details together, and understand what to research next after DAE.</p>
          <div className="mt-9 flex flex-wrap gap-3"><Link to={primary[0]} className="action-primary !bg-[#e5efe9] !text-navy hover:!bg-white">{primary[1]}</Link><Link to="/universities" className="action-secondary !border-white/50 !text-white hover:!bg-white/10">Explore universities</Link></div>
        </div>
        <aside className="self-end border-t border-[#7f99a6] pt-5 lg:border-l lg:border-t-0 lg:pl-7" aria-label="What is available now">
          <p className="text-xs font-black uppercase tracking-[.18em] text-[#d9b56e]">Available now</p>
          <h2 className="section-title mt-3 text-2xl text-white">Discovery starts with reliable records.</h2>
          <p className="mt-4 text-sm leading-7 text-[#d9e3e6]">Browse published, source-verified catalogue entries. A university’s HEC recognition is shown separately from source verification. No eligibility or merit decision is made yet.</p>
          <Link to="/programs" className="mt-5 inline-flex min-h-11 items-center font-bold text-white underline decoration-[#d9b56e] decoration-2">Browse programs <span aria-hidden="true" className="ml-2">→</span></Link>
        </aside>
      </div>
    </section>
    <section className="site-container grid gap-10 py-12 lg:grid-cols-[16rem_1fr] lg:py-16" aria-labelledby="how-it-works">
      <div><p className="eyebrow">A practical sequence</p><h2 id="how-it-works" className="section-title mt-3 text-3xl text-navy">Your next step, made legible.</h2></div>
      <ol className="border-t border-[var(--ui-border)]">{steps.map(([number, title, description]) => <li key={number} className="grid gap-3 border-b border-[var(--ui-border)] py-5 sm:grid-cols-[3rem_minmax(0,1fr)]"><span className="text-sm font-black text-forest">{number}</span><div><h3 className="text-lg font-black text-navy">{title}</h3><p className="body-copy mt-1 text-sm">{description}</p></div></li>)}</ol>
    </section>
    <section className="border-y border-[var(--ui-border)] bg-[var(--ui-paper)]">
      <div className="site-container grid gap-6 py-9 md:grid-cols-[1fr_auto] md:items-center"><div><p className="eyebrow">Development connection</p><h2 className="section-title mt-2 text-2xl text-navy">Platform status</h2><p className="body-copy mt-2 text-sm">This indicator checks the application API and database; it is not an admission-status signal.</p></div><HealthStatus /></div>
    </section>
  </>
}
