import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Breadcrumbs from '../components/Breadcrumbs.jsx'
import { CatalogueError, CatalogueLoading, CatalogueNotFound } from '../components/CatalogueStates.jsx'
import ProgramCard from '../components/ProgramCard.jsx'
import SourceAttribution from '../components/SourceAttribution.jsx'
import useCatalogueDetail from '../hooks/useCatalogueDetail.js'
import { getProgramsForUniversity, getUniversity } from '../services/catalogueApi.js'
import { getSafeExternalUrl } from '../utils/externalLinks.js'

function label(value) {
  return value?.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export default function UniversityDetailPage() {
  const { universityIdentifier = '' } = useParams()
  const detail = useCatalogueDetail(getUniversity, universityIdentifier)
  const [related, setRelated] = useState({ status: 'loading', programs: [] })

  useEffect(() => {
    if (detail.status !== 'ready') return undefined
    const controller = new AbortController()
    let active = true
    setRelated({ status: 'loading', programs: [] })
    const identifier = detail.item.slug || detail.item.id
    getProgramsForUniversity(identifier, controller.signal)
      .then((programs) => {
        if (active) setRelated({ status: 'ready', programs })
      })
      .catch((error) => {
        if (active && error.name !== 'CanceledError') setRelated({ status: 'error', programs: [] })
      })
    return () => {
      active = false
      controller.abort()
    }
  }, [detail.item, detail.status])

  if (detail.status === 'loading') {
    return <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-10"><CatalogueLoading label="Loading university details…" /></section>
  }
  if (detail.status === 'not-found') {
    return <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6"><CatalogueNotFound title="University not found" description="This university is unavailable, unpublished, unverified, or the address is incorrect." backTo="/universities" backLabel="Back to universities" /></section>
  }
  if (detail.status === 'error') {
    return <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6"><CatalogueError onRetry={detail.retry} /></section>
  }

  const university = detail.item
  const website = getSafeExternalUrl(university.contact?.websiteUrl)
  const hecProfile = getSafeExternalUrl(university.hecProfileUrl)
  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10 lg:py-14">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Universities', to: '/universities' }, { label: university.name }]} />
      <Link to="/universities" className="mb-5 inline-flex rounded text-sm font-black text-forest underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-leaf">← Back to universities</Link>

      <article className="overflow-hidden rounded-[2rem] border border-forest/10 bg-white/80 shadow-xl">
        <header className="bg-forest px-6 py-10 text-white sm:px-10">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-mint">{label(university.institutionType) || 'University'} · {label(university.sector)}</p>
          <h1 className="mt-3 break-words text-4xl font-black tracking-[-0.04em] sm:text-5xl">{university.name}</h1>
          {university.abbreviation && <p className="mt-3 text-lg font-bold text-white/70">{university.abbreviation}</p>}
          <p className="mt-3 text-sm text-white/80">{university.provinceOrTerritory || 'Location not recorded'} · {label(university.charterAuthority) || 'Charter authority not recorded'} charter</p>
        </header>

        <div className="grid gap-8 p-6 sm:p-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(16rem,0.65fr)]">
          <div className="min-w-0">
            <h2 className="text-2xl font-black">Campus information</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {university.campuses.map((campus) => (
                <section key={`${campus.name}-${campus.city}`} className="rounded-2xl border border-forest/10 bg-cream p-5">
                  <h3 className="font-black">{campus.name}</h3>
                  <p className="mt-2 text-sm leading-6 text-ink/60">{[campus.address, campus.city, campus.district, campus.province].filter(Boolean).join(', ')}</p>
                  {campus.isMainCampus && <span className="mt-3 inline-flex rounded-full bg-mint px-3 py-1 text-xs font-black text-forest">Main campus</span>}
                </section>
              ))}
              {university.campuses.length === 0 && <p className="text-ink/60">No public campus details are available.</p>}
            </div>

            {(university.establishedYear || university.recognitionBodies.length > 0) && (
              <dl className="mt-8 grid gap-4 rounded-2xl border border-forest/10 p-5 sm:grid-cols-2">
                {university.establishedYear && <div><dt className="text-sm text-ink/50">Established</dt><dd className="mt-1 font-black">{university.establishedYear}</dd></div>}
                {university.recognitionBodies.length > 0 && <div><dt className="text-sm text-ink/50">Recognition bodies listed</dt><dd className="mt-1 font-black">{university.recognitionBodies.join(', ')}</dd></div>}
              </dl>
            )}
          </div>
          <div className="space-y-4">
            <div className="rounded-2xl border border-forest/10 p-4 text-sm"><h2 className="font-black">HEC recognition record</h2><p className="mt-1 text-ink/60">{label(university.hecRecognitionStatus) || 'Unverified'}</p>{hecProfile && <a href={hecProfile} target="_blank" rel="noopener noreferrer" className="mt-2 block break-all text-teal-800 underline">Open HEC institution profile (external site)</a>}</div>
            {website && (
              <a href={website} target="_blank" rel="noopener noreferrer" className="flex min-h-12 items-center justify-center rounded-xl bg-forest px-4 py-3 text-center text-sm font-black text-white focus:outline-none focus-visible:ring-4 focus-visible:ring-leaf/35">
                Visit official website <span className="sr-only">(opens in a new tab)</span>
              </a>
            )}
            <SourceAttribution source={university.source} label="View official university source" />
            {(university.contact?.email || university.contact?.phone) && (
              <div className="rounded-2xl border border-forest/10 p-4 text-sm">
                <h2 className="font-black">Public contact</h2>
                {university.contact.email && <p className="mt-2 break-all text-ink/60">{university.contact.email}</p>}
                {university.contact.phone && <p className="mt-1 text-ink/60">{university.contact.phone}</p>}
              </div>
            )}
          </div>
        </div>
      </article>

      <section className="mt-12" aria-labelledby="related-programs-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-xs font-black uppercase tracking-[0.18em] text-leaf">Published catalogue</p><h2 id="related-programs-heading" className="mt-2 text-3xl font-black">Related programs</h2></div>
          <Link to={`/programs?university=${encodeURIComponent(university.slug || university.id)}`} className="rounded text-sm font-black text-forest underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-leaf">View filtered program list</Link>
        </div>
        {related.status === 'loading' && <div className="mt-6"><CatalogueLoading label="Loading related programs…" /></div>}
        {related.status === 'error' && <p role="alert" className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-900">Related programs could not be loaded. The university details remain available above.</p>}
        {related.status === 'ready' && related.programs.length === 0 && <p className="mt-6 rounded-2xl border border-dashed border-forest/20 p-6 text-ink/60">No verified published programs are listed for this university.</p>}
        {related.status === 'ready' && related.programs.length > 0 && <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{related.programs.map((program) => <ProgramCard key={program.id} program={program} />)}</div>}
      </section>
    </section>
  )
}
