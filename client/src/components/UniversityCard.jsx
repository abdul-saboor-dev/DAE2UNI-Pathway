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
  return <article className="paper-surface group flex min-w-0 flex-col overflow-hidden transition-colors hover:border-forest/50">
    <div className="relative flex h-32 min-w-0 items-center justify-between overflow-hidden bg-navy px-6 text-white" data-image-state={safeImageUrl ? 'image' : 'fallback'}>
      {safeImageUrl ? <img src={safeImageUrl} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" /> : <>
        <span aria-hidden="true" className="display-type break-all text-5xl text-white">{universityMonogram(university)}</span>
        <span aria-hidden="true" className="self-end border-t border-gold pb-4 pt-2 text-[.65rem] font-black uppercase tracking-[.2em] text-[#d9b56e]">DAE2UNI catalogue</span>
      </>}
    </div>
    <div className="flex flex-1 flex-col p-5 sm:p-6">
      <p className="text-[.7rem] font-black uppercase tracking-[.13em] text-forest">{titleCase(university.institutionType) || 'University'}{university.sector ? ` · ${titleCase(university.sector)}` : ''}</p>
      <h2 className="section-title mt-3 break-words text-[1.45rem] text-navy">{university.name}</h2>
      <p className="mt-3 text-sm text-[var(--ui-muted)]">{locations.length ? locations.join(', ') : university.provinceOrTerritory || 'Campus location not listed'}</p>
      <p className="mt-2 text-xs text-[var(--ui-muted)]">{university.source?.verificationStatus === 'verified' ? 'Official source reviewed' : 'Official source listed'}{university.hecRecognitionStatus ? ` · HEC: ${titleCase(university.hecRecognitionStatus)}` : ''}</p>
      <div className="editorial-rule mt-auto flex flex-wrap items-center justify-between gap-3 pt-5 text-sm">
        <Link to={`/universities/${encodeURIComponent(identifier)}`} className="inline-flex min-h-11 items-center font-black text-forest underline decoration-gold decoration-2 hover:text-navy focus-visible:outline-3">View university <span aria-hidden="true" className="ml-2">→</span></Link>
        {officialUrl && <a href={officialUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-xs font-bold text-navy underline">Official site <span className="sr-only">(opens in a new tab)</span></a>}
      </div>
    </div>
  </article>
}
