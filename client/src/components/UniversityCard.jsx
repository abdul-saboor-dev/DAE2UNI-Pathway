import { Link } from 'react-router-dom'
import { getSafeExternalUrl } from '../utils/externalLinks.js'

function titleCase(value) {
  return value?.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export default function UniversityCard({ university }) {
  const locations = [...new Set(university.campuses.map((campus) => campus.city))]
  const officialUrl = getSafeExternalUrl(university.contact?.websiteUrl || university.source?.officialUrl)
  const identifier = university.slug || university.id
  return (
    <article className="flex min-w-0 flex-col rounded-3xl border border-forest/10 bg-white/80 p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-leaf">
        <span>{titleCase(university.institutionType) || 'University'}</span>
        {university.sector && <span className="rounded-full bg-mint px-2.5 py-1 text-forest">{titleCase(university.sector)}</span>}
      </div>
      <h2 className="mt-4 break-words text-2xl font-black tracking-tight">{university.name}</h2>
      {university.abbreviation && <p className="mt-1 font-bold text-ink/50">{university.abbreviation}</p>}
      <div className="mt-5 flex-1 rounded-2xl bg-cream p-4 text-sm leading-6 text-ink/65">
        <span className="font-bold text-ink">Campus locations: </span>
        {locations.length ? locations.join(', ') : 'Location not listed'}
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <Link to={`/universities/${encodeURIComponent(identifier)}`} className="rounded-xl bg-forest px-4 py-2.5 text-sm font-black text-white focus:outline-none focus-visible:ring-4 focus-visible:ring-leaf/35">
          View university
        </Link>
        {officialUrl && (
          <a href={officialUrl} target="_blank" rel="noopener noreferrer" className="rounded text-sm font-bold text-forest underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-leaf">
            Official website <span className="sr-only">(opens in a new tab)</span>
          </a>
        )}
      </div>
    </article>
  )
}
