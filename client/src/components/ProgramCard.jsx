import { Link } from 'react-router-dom'

function titleCase(value) {
  return value?.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export default function ProgramCard({ program }) {
  const locations = [...new Set(program.campuses.map((campus) => campus.city))]
  return (
    <article className="flex min-w-0 flex-col rounded-3xl border border-forest/10 bg-white/80 p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-leaf">
        {program.credentialType && <span>{program.credentialType}</span>}
        {program.studyMode && <span className="rounded-full bg-mint px-2.5 py-1 text-forest">{titleCase(program.studyMode)}</span>}
      </div>
      <h2 className="mt-4 break-words text-2xl font-black tracking-tight">{program.name}</h2>
      <p className="mt-2 font-bold text-forest">{program.university.name}</p>
      <dl className="mt-5 grid flex-1 gap-3 rounded-2xl bg-cream p-4 text-sm">
        <div><dt className="text-ink/50">Degree</dt><dd className="mt-0.5 font-bold">{program.degreeTitle || program.credentialType || 'Not listed'}</dd></div>
        <div><dt className="text-ink/50">Campus locations</dt><dd className="mt-0.5 font-bold">{locations.length ? locations.join(', ') : 'Not listed'}</dd></div>
        {program.duration?.years && <div><dt className="text-ink/50">Duration</dt><dd className="mt-0.5 font-bold">{program.duration.years} years{program.duration.semesters ? ` · ${program.duration.semesters} semesters` : ''}</dd></div>}
      </dl>
      <Link to={`/programs/${encodeURIComponent(program.id)}`} className="mt-6 self-start rounded-xl bg-forest px-4 py-2.5 text-sm font-black text-white focus:outline-none focus-visible:ring-4 focus-visible:ring-leaf/35">
        View program
      </Link>
    </article>
  )
}
