import { Link } from 'react-router-dom'
import { getSafeExternalUrl } from '../utils/externalLinks.js'

function titleCase(value) {
  return value?.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export default function ProgramCard({ program }) {
  const locations = [...new Set((program.campuses || []).map((campus) => campus.city).filter(Boolean))]
  const imageUrl = getSafeExternalUrl(program.disciplineMedia?.image?.url)
  return (
    <article className="record-surface interactive-surface flex min-w-0 flex-col border-l-2 border-l-[var(--ui-accent)] p-5 sm:p-6">
      {imageUrl && <img src={imageUrl} srcSet={program.disciplineMedia.image.srcSet || undefined} sizes="(min-width: 1280px) 24rem, (min-width: 768px) 50vw, 100vw" width={program.disciplineMedia.image.width} height={program.disciplineMedia.image.height} alt={`${program.disciplineMedia.discipline} discipline`} loading="lazy" decoding="async" className="mb-5 aspect-[16/8] w-full rounded-[var(--ui-radius-sm)] border border-[var(--ui-border)] object-cover" />}
      <div className="metadata flex flex-wrap items-center gap-2 text-academic">
        {program.credentialType && <span>{program.credentialType}</span>}
        {program.studyMode && <span className="border-l border-[var(--ui-border)] pl-2 text-[var(--ui-muted)]">{titleCase(program.studyMode)}</span>}
      </div>
      <h2 className="card-title mt-3 break-words text-[1.45rem] text-navy">{program.name}</h2>
      <p className="mt-2 font-semibold text-academic">{program.university.name}</p>
      <dl className="editorial-rule mt-5 grid flex-1 gap-3 pt-4 text-sm">
        <div><dt className="text-ink/50">Degree</dt><dd className="mt-0.5 font-bold">{program.degreeTitle || program.credentialType || 'Not listed'}</dd></div>
        <div><dt className="text-ink/50">Campus locations</dt><dd className="mt-0.5 font-bold">{locations.length ? locations.join(', ') : 'Not listed'}</dd></div>
        {program.duration?.years && <div><dt className="text-ink/50">Duration</dt><dd className="mt-0.5 font-bold">{program.duration.years} years{program.duration.semesters ? ` · ${program.duration.semesters} semesters` : ''}</dd></div>}
      </dl>
      <Link to={`/programs/${encodeURIComponent(program.id)}`} className="mt-5 inline-flex min-h-11 items-center self-start font-semibold text-academic underline decoration-2 focus-visible:outline-3">
        View program <span aria-hidden="true" className="ml-2">→</span>
      </Link>
    </article>
  )
}
