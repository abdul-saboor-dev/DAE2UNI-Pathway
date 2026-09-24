import { Link } from 'react-router-dom'

function titleCase(value) {
  return value?.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export default function ProgramCard({ program }) {
  const locations = [...new Set((program.campuses || []).map((campus) => campus.city).filter(Boolean))]
  return (
    <article className="paper-surface flex min-w-0 flex-col border-l-4 !border-l-gold p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-forest">
        {program.credentialType && <span>{program.credentialType}</span>}
        {program.studyMode && <span className="border-l border-[var(--ui-border)] pl-2 text-[var(--ui-muted)]">{titleCase(program.studyMode)}</span>}
      </div>
      <h2 className="section-title mt-3 break-words text-[1.45rem] text-navy">{program.name}</h2>
      <p className="mt-2 font-bold text-forest">{program.university.name}</p>
      <dl className="editorial-rule mt-5 grid flex-1 gap-3 pt-4 text-sm">
        <div><dt className="text-ink/50">Degree</dt><dd className="mt-0.5 font-bold">{program.degreeTitle || program.credentialType || 'Not listed'}</dd></div>
        <div><dt className="text-ink/50">Campus locations</dt><dd className="mt-0.5 font-bold">{locations.length ? locations.join(', ') : 'Not listed'}</dd></div>
        {program.duration?.years && <div><dt className="text-ink/50">Duration</dt><dd className="mt-0.5 font-bold">{program.duration.years} years{program.duration.semesters ? ` · ${program.duration.semesters} semesters` : ''}</dd></div>}
      </dl>
      <Link to={`/programs/${encodeURIComponent(program.id)}`} className="mt-5 inline-flex min-h-11 items-center self-start font-black text-forest underline decoration-gold decoration-2 focus-visible:outline-3">
        View program <span aria-hidden="true" className="ml-2">→</span>
      </Link>
    </article>
  )
}
