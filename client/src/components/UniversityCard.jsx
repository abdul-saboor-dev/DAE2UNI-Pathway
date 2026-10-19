import { Link } from 'react-router-dom'
import { getSafeExternalUrl } from '../utils/externalLinks.js'
import { universityMonogram } from '../utils/universityMonogram.js'

function titleCase(value) {
  return value?.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

// imageUrl is optional for a future, separately reviewed image source. The
// catalogue API supplies no image field, so current cards always use fallback.
export default function UniversityCard({ university, imageUrl }) {
  const locations = [...new Set((university.campuses || []).map((campus) => campus.city).filter(Boolean))]
  const officialUrl = getSafeExternalUrl(university.contact?.websiteUrl || university.source?.officialUrl)
  const safeImageUrl = getSafeExternalUrl(imageUrl)
  const identifier = university.slug || university.id
  return <article className="record-surface interactive-surface group flex min-w-0 flex-col overflow-hidden border-t-2 border-t-[var(--ui-accent)]" data-image-state={safeImageUrl ? 'image' : 'fallback'}>
    {safeImageUrl && <img src={safeImageUrl} alt="" loading="lazy" className="h-28 w-full border-b border-[var(--ui-border)] object-cover" />}
    <div className="flex flex-1 flex-col p-5 sm:p-6">
      <div className="flex min-w-0 items-start gap-4">
        <span aria-hidden="true" className="card-title grid size-12 shrink-0 place-items-center rounded-[var(--ui-radius-sm)] border border-[var(--ui-border-strong)] bg-[var(--ui-surface-subtle)] text-base text-academic">{universityMonogram(university)}</span>
        <div className="min-w-0"><p className="metadata text-academic">{titleCase(university.institutionType) || 'University'}{university.sector ? ` · ${titleCase(university.sector)}` : ''}</p><h2 className="card-title mt-2 break-words text-[1.4rem] text-navy">{university.name}</h2></div>
      </div>
      <dl className="mt-5 grid gap-3 text-sm">
        <div><dt className="metadata">Campus coverage</dt><dd className="mt-1 text-[var(--ui-muted-strong)]">{locations.length ? locations.join(', ') : university.provinceOrTerritory || 'Campus location not listed'}</dd></div>
        <div><dt className="metadata">Evidence</dt><dd className="mt-1 text-[var(--ui-muted-strong)]">{university.source?.verificationStatus === 'verified' ? 'Official source reviewed' : 'Official source listed'}{university.hecRecognitionStatus ? ` · HEC: ${titleCase(university.hecRecognitionStatus)}` : ''}</dd></div>
      </dl>
      <div className="editorial-rule mt-auto flex flex-wrap items-center justify-between gap-3 pt-5 text-sm">
        <Link to={`/universities/${encodeURIComponent(identifier)}`} className="inline-flex min-h-11 items-center font-semibold text-academic underline decoration-2 hover:text-navy focus-visible:outline-3">View university <span aria-hidden="true" className="ml-2">→</span></Link>
        {officialUrl && <a href={officialUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-xs font-semibold text-navy underline">Official site <span className="sr-only">(opens in a new tab)</span></a>}
      </div>
    </div>
  </article>
}
