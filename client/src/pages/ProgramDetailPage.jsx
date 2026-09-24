import { Link, useParams } from 'react-router-dom'
import Breadcrumbs from '../components/Breadcrumbs.jsx'
import CampusDirectory from '../components/CampusDirectory.jsx'
import { CatalogueError, CatalogueLoading, CatalogueNotFound } from '../components/CatalogueStates.jsx'
import SourceAttribution from '../components/SourceAttribution.jsx'
import useCatalogueDetail from '../hooks/useCatalogueDetail.js'
import { getProgram } from '../services/catalogueApi.js'

function label(value) {
  return value?.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export default function ProgramDetailPage() {
  const { programId = '' } = useParams()
  const detail = useCatalogueDetail(getProgram, programId)

  if (detail.status === 'loading') {
    return <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-10"><CatalogueLoading label="Loading program details…" /></section>
  }
  if (detail.status === 'not-found') {
    return <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6"><CatalogueNotFound title="Program not found" description="This program is unavailable, unpublished, unverified, or the address is incorrect." backTo="/programs" backLabel="Back to programs" /></section>
  }
  if (detail.status === 'error') {
    return <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6"><CatalogueError onRetry={detail.retry} /></section>
  }

  const program = detail.item
  const universityIdentifier = program.university.slug || program.university.id
  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10 lg:py-14">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Programs', to: '/programs' }, { label: program.name }]} />
      <Link to="/programs" className="mb-5 inline-flex rounded text-sm font-black text-forest underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-leaf">← Back to programs</Link>

      <article className="paper-surface overflow-hidden">
        <header className="border-b-4 border-gold bg-navy px-6 py-10 text-white sm:px-10">
          <div className="flex flex-wrap gap-2 text-xs font-black uppercase tracking-[0.16em] text-mint">
            {program.credentialType && <span>{program.credentialType}</span>}
            {program.degreeLevel && <span>· {label(program.degreeLevel)}</span>}
            {program.studyMode && <span>· {label(program.studyMode)}</span>}
          </div>
          <h1 className="page-title mt-3 break-words text-4xl sm:text-5xl">{program.name}</h1>
          <Link to={`/universities/${encodeURIComponent(universityIdentifier)}`} className="mt-4 inline-flex rounded font-bold text-mint underline decoration-mint/50 underline-offset-4 hover:decoration-mint focus:outline-none focus-visible:ring-2 focus-visible:ring-mint">
            {program.university.name}
          </Link>
        </header>

        <div className="grid gap-8 p-6 sm:p-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(16rem,0.65fr)]">
          <div className="min-w-0">
            <h2 className="section-title text-2xl text-navy">Program information</h2>
            <dl className="mt-5 grid gap-4 border-y border-[var(--ui-border)] py-5 sm:grid-cols-2">
              <div><dt className="text-sm text-ink/50">Degree title</dt><dd className="mt-1 font-black">{program.degreeTitle || 'Not listed'}</dd></div>
              <div><dt className="text-sm text-ink/50">Credential</dt><dd className="mt-1 font-black">{program.credentialType || 'Not listed'}</dd></div>
              <div><dt className="text-sm text-ink/50">Study mode</dt><dd className="mt-1 font-black">{label(program.studyMode) || 'Not listed'}</dd></div>
              <div><dt className="text-sm text-ink/50">Duration</dt><dd className="mt-1 font-black">{program.duration?.years ? `${program.duration.years} years${program.duration.semesters ? ` · ${program.duration.semesters} semesters` : ''}` : 'Not listed'}</dd></div>
              {program.department && <div><dt className="text-sm text-ink/50">Department</dt><dd className="mt-1 font-black">{program.department}</dd></div>}
              {program.disciplineCode && <div><dt className="text-sm text-ink/50">Discipline code</dt><dd className="mt-1 font-black">{program.disciplineCode}</dd></div>}
            </dl>

            <h2 className="section-title mt-8 text-2xl text-navy">Available campuses</h2>
            <CampusDirectory campuses={program.campuses} />
          </div>

          <div className="space-y-4">
            <SourceAttribution source={program.source} label="View official program source" />
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
              <p className="font-black">Eligibility is not evaluated here</p>
              <p className="mt-1 text-amber-900/75">This page reports catalogue information only. DAE eligibility, merit, fees, deadlines, and entry-test requirements belong to later verified services.</p>
            </div>
            <Link to={`/universities/${encodeURIComponent(universityIdentifier)}`} className="flex min-h-12 items-center justify-center rounded-xl border border-forest/20 px-4 py-3 text-center text-sm font-black text-forest hover:bg-mint focus:outline-none focus-visible:ring-4 focus-visible:ring-leaf/20">
              View parent university
            </Link>
          </div>
        </div>
      </article>
    </section>
  )
}
