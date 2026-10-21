import { Link } from 'react-router-dom'
import { getSafeExternalUrl } from '../utils/externalLinks.js'
import { universityMonogram } from '../utils/universityMonogram.js'

function titleCase(value) {
  return value?.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export default function UniversityCard({ university, imageUrl }) {
  const locations = [...new Set((university.campuses || []).map((campus) => campus.city).filter(Boolean))]
  const officialUrl = getSafeExternalUrl(university.contact?.websiteUrl || university.source?.officialUrl)
  const safeImageUrl = getSafeExternalUrl(university.cover?.url || imageUrl)
  const safeLogoUrl = getSafeExternalUrl(university.logo?.url)
  const identifier = university.slug || university.id
  const evidence = [
    university.source?.verificationStatus === 'verified'
      ? 'Official source reviewed'
      : university.source?.officialUrl ? 'Official source available' : null,
    university.hecRecognitionStatus === 'recognized' ? 'HEC recognized' : null,
    university.hecRecognitionStatus === 'needs_review' ? 'HEC recognition needs review' : null,
    university.hecRecognitionStatus === 'not_recognized' ? 'HEC not recognized' : null,
  ].filter(Boolean)

  return <article className="university-card record-surface interactive-surface group flex h-full min-w-0 flex-col overflow-hidden" data-image-state={safeImageUrl ? 'image' : 'fallback'}>
    <div className="university-card__cover aspect-video w-full overflow-hidden border-b border-[var(--ui-border)]">
      {safeImageUrl
        ? <img src={safeImageUrl} srcSet={university.cover?.srcSet || undefined} sizes="(min-width: 1280px) 24rem, (min-width: 768px) 50vw, 100vw" width={university.cover?.width} height={university.cover?.height} alt={`${university.name} cover`} loading="lazy" decoding="async" className="h-full w-full object-cover" />
        : <div className="grid h-full place-items-center bg-[var(--ui-surface-subtle)]" role="img" aria-label={`${university.name} cover image not available`}><span aria-hidden="true" className="card-title text-3xl text-[var(--ui-muted)]">{universityMonogram(university)}</span></div>}
    </div>
    <div className="flex flex-1 flex-col p-5 sm:p-6">
      <div className="flex min-w-0 items-start gap-4">
        {safeLogoUrl ? <img src={safeLogoUrl} srcSet={university.logo?.srcSet || undefined} sizes="56px" width={university.logo?.width} height={university.logo?.height} alt={`${university.name} logo`} loading="lazy" decoding="async" className="size-14 shrink-0 rounded-[.75rem] border border-[var(--ui-border-strong)] bg-white object-contain p-1.5" /> : <span aria-hidden="true" className="card-title grid size-14 shrink-0 place-items-center rounded-[.75rem] border border-[var(--ui-border-strong)] bg-[var(--ui-surface-subtle)] text-base text-academic">{universityMonogram(university)}</span>}
        <div className="min-w-0"><p className="metadata text-academic">{titleCase(university.institutionType) || 'University'}{university.sector ? ` · ${titleCase(university.sector)}` : ''}</p><h2 className="card-title mt-1.5 break-words text-[1.2rem] leading-snug text-navy">{university.name}</h2></div>
      </div>
      <dl className="mt-5 grid gap-4 border-t border-[var(--ui-border)] pt-4 text-sm">
        <div><dt className="metadata">Campus coverage</dt><dd className="mt-1.5 flex flex-wrap items-baseline gap-y-1 text-[var(--ui-muted-strong)]">{locations.length ? locations.map((location, index) => <span key={location} className="inline-flex items-baseline"><span>{location}</span>{index < locations.length - 1 && <span aria-hidden="true" className="mx-2 text-[var(--ui-muted)]">·</span>}</span>) : <span>{university.provinceOrTerritory || 'Campus location not listed'}</span>}</dd></div>
        <div><dt className="metadata">Evidence</dt><dd className="mt-1.5 grid gap-1 text-[var(--ui-muted-strong)]">{evidence.length ? evidence.map((item) => <span key={item}>{item}</span>) : <span>Verification evidence not yet listed</span>}</dd></div>
      </dl>
      <div className="editorial-rule mt-auto flex flex-wrap items-center justify-between gap-3 pt-5 text-sm">
        <Link to={`/universities/${encodeURIComponent(identifier)}`} className="inline-flex min-h-11 items-center font-semibold text-academic underline decoration-2 hover:text-navy focus-visible:outline-3">View university <span aria-hidden="true" className="ml-2">→</span></Link>
        {officialUrl && <a href={officialUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-xs font-semibold text-navy underline">Official site <span className="sr-only">(opens in a new tab)</span></a>}
      </div>
    </div>
  </article>
}
