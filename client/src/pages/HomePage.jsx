import HealthStatus from '../components/HealthStatus.jsx'
import { Link } from 'react-router-dom'
import useAuth from '../context/useAuth.js'

const pathwaySteps = [
  ['01', 'Discover', 'Explore relevant universities and degree programs.'],
  ['02', 'Understand', 'See clear DAE-specific eligibility guidance.'],
  ['03', 'Prepare', 'Plan merit, entry tests, deadlines, and documents.'],
]

function HomePage() {
  const { user } = useAuth()

  return (
    <>
      <section className="relative mx-auto grid max-w-7xl gap-14 px-6 pb-20 pt-14 lg:grid-cols-[1.12fr_0.88fr] lg:px-10 lg:pb-28 lg:pt-24">
        <div className="pointer-events-none absolute -left-24 top-10 size-72 rounded-full bg-mint/70 blur-3xl" />
        <div className="relative">
          <p className="mb-6 inline-flex rounded-full border border-leaf/20 bg-white/70 px-4 py-2 text-sm font-semibold text-forest shadow-sm backdrop-blur">
            A clearer next step after DAE
          </p>
          <h1 className="max-w-3xl text-5xl font-black leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
            From Diploma to{' '}
            <span className="relative text-forest">
              University
              <span className="absolute -bottom-2 left-1 h-2 w-full -rotate-1 rounded-full bg-leaf/25" />
            </span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-8 text-ink/70 sm:text-xl">
            DAE2UNI Pathway will help DAE CIT students discover suitable programs, understand admission rules, and plan a confident route into undergraduate study across Punjab.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link to={user?.role === 'student' ? '/dashboard' : '/register'} className="rounded-xl bg-forest px-5 py-3 text-sm font-bold text-white shadow-xl shadow-forest/20 transition hover:bg-ink focus:outline-none focus-visible:ring-4 focus-visible:ring-leaf/35">
              {user?.role === 'student' ? 'Open dashboard' : 'Create your pathway'}
            </Link>
            <span className="text-sm font-medium text-ink/60">Web application · Final Year Project</span>
          </div>
          <div className="mt-5 flex flex-wrap gap-3 text-sm font-bold">
            <Link to="/universities" className="rounded-lg text-forest underline decoration-leaf/30 underline-offset-4 hover:decoration-leaf focus:outline-none focus-visible:ring-2 focus-visible:ring-leaf">Browse universities</Link>
            <span aria-hidden="true" className="text-ink/25">·</span>
            <Link to="/programs" className="rounded-lg text-forest underline decoration-leaf/30 underline-offset-4 hover:decoration-leaf focus:outline-none focus-visible:ring-2 focus-visible:ring-leaf">Browse programs</Link>
          </div>
        </div>

        <div className="relative flex items-center">
          <div className="absolute -right-16 -top-12 size-64 rounded-full bg-leaf/10 blur-3xl" />
          <div className="relative w-full rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-[0_30px_90px_-40px_rgba(16,42,42,0.45)] backdrop-blur-xl sm:p-8">
            <div className="mb-8 flex items-start justify-between gap-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-leaf">Development status</p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight">Public catalogue is ready</h2>
              </div>
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-mint text-xl" aria-hidden="true">↗</span>
            </div>
            <HealthStatus />
            <p className="mt-6 border-t border-ink/10 pt-5 text-sm leading-6 text-ink/55">
              University and program browsing, student accounts, and profile onboarding are available. Eligibility and merit calculations remain later milestones.
            </p>
          </div>
        </div>
      </section>

      <section className="border-y border-forest/10 bg-white/45">
        <div className="mx-auto grid max-w-7xl gap-px px-6 py-4 md:grid-cols-3 lg:px-10">
          {pathwaySteps.map(([number, title, description]) => (
            <article key={number} className="group flex gap-5 rounded-2xl p-5 transition hover:bg-white/70">
              <span className="pt-1 font-mono text-xs font-bold text-leaf">{number}</span>
              <div>
                <h2 className="font-bold">{title}</h2>
                <p className="mt-1 text-sm leading-6 text-ink/60">{description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  )
}

export default HomePage
