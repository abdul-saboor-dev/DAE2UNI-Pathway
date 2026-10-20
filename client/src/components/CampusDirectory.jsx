import { getCampusMapUrl } from '../utils/campusMap.js'
import { getSafeExternalUrl } from '../utils/externalLinks.js'

export default function CampusDirectory({ campuses = [] }) {
  if (!campuses.length) return <p className="body-copy mt-4">No public campus details are available.</p>
  return <div className="mt-5 divide-y divide-[var(--ui-border)] border-y border-[var(--ui-border)]">
    {campuses.map((campus, index) => {
      const mapUrl = getCampusMapUrl(campus)
      const imageUrl = getSafeExternalUrl(campus.image?.url)
      return <section key={`${campus.name}-${campus.city}-${index}`} className="grid gap-4 py-5 sm:grid-cols-[8rem_minmax(0,1fr)_auto]">
        {imageUrl ? <img src={imageUrl} srcSet={campus.image?.srcSet || undefined} sizes="128px" width={campus.image?.width} height={campus.image?.height} alt={`${campus.name} campus`} loading="lazy" decoding="async" className="aspect-[4/3] w-full rounded-[var(--ui-radius-sm)] border border-[var(--ui-border)] object-cover sm:w-32" /> : <div aria-hidden="true" className="hidden aspect-[4/3] w-32 rounded-[var(--ui-radius-sm)] border border-dashed border-[var(--ui-border)] bg-[var(--ui-surface-subtle)] sm:block" />}
        <div className="min-w-0">
          <h3 className="text-base font-black text-navy">{campus.name}</h3>
          <p className="body-copy mt-1 break-words text-sm">{[campus.address, campus.city, campus.district, campus.province].filter(Boolean).join(', ') || 'Location details not listed'}</p>
          <p className="mt-2 text-xs font-semibold text-[var(--ui-muted)]">{campus.isMainCampus ? 'Main campus' : 'Campus'} · {campus.isActive === false ? 'Inactive' : 'Active'}</p>
        </div>
        {mapUrl && <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center self-start font-bold text-academic underline decoration-gold decoration-2 focus-visible:outline-3">View on Google Maps <span className="sr-only">(opens in a new tab)</span></a>}
      </section>
    })}
  </div>
}
