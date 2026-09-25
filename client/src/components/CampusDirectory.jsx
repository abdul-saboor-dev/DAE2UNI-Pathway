import { getCampusMapUrl } from '../utils/campusMap.js'

export default function CampusDirectory({ campuses = [] }) {
  if (!campuses.length) return <p className="body-copy mt-4">No public campus details are available.</p>
  return <div className="mt-5 divide-y divide-[var(--ui-border)] border-y border-[var(--ui-border)]">
    {campuses.map((campus, index) => {
      const mapUrl = getCampusMapUrl(campus)
      return <section key={`${campus.name}-${campus.city}-${index}`} className="grid gap-3 py-5 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <h3 className="text-base font-black text-navy">{campus.name}</h3>
          <p className="body-copy mt-1 break-words text-sm">{[campus.address, campus.city, campus.district, campus.province].filter(Boolean).join(', ') || 'Location details not listed'}</p>
          <p className="mt-2 text-xs font-semibold text-[var(--ui-muted)]">{campus.isMainCampus ? 'Main campus' : 'Campus'} · {campus.isActive === false ? 'Inactive' : 'Active'}</p>
        </div>
        {mapUrl && <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center self-start font-bold text-academic underline decoration-gold decoration-2 focus-visible:outline-3">Search address on Google Maps <span className="sr-only">(opens in a new tab)</span></a>}
      </section>
    })}
  </div>
}
