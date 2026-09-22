import { Link } from 'react-router-dom'

export function CatalogueLoading({ label = 'Loading catalogue results…' }) {
  return (
    <div role="status" aria-live="polite" className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      <span className="sr-only">{label}</span>
      {[1, 2, 3, 4, 5, 6].map((item) => (
        <div key={item} aria-hidden="true" className="min-h-64 animate-pulse rounded-3xl border border-forest/8 bg-white/70 p-6">
          <div className="h-3 w-24 rounded bg-mint" />
          <div className="mt-5 h-7 w-4/5 rounded bg-forest/10" />
          <div className="mt-3 h-4 w-3/5 rounded bg-forest/10" />
          <div className="mt-10 h-16 rounded-2xl bg-cream" />
        </div>
      ))}
    </div>
  )
}

export function CatalogueEmpty({ title, description, onClear }) {
  return (
    <section className="rounded-3xl border border-dashed border-forest/20 bg-white/60 px-6 py-12 text-center">
      <h2 className="text-2xl font-black">{title}</h2>
      <p className="mx-auto mt-3 max-w-xl leading-7 text-ink/60">{description}</p>
      {onClear && (
        <button type="button" onClick={onClear} className="mt-6 rounded-xl bg-forest px-5 py-3 text-sm font-black text-white focus:outline-none focus-visible:ring-4 focus-visible:ring-leaf/35">
          Clear all filters
        </button>
      )}
    </section>
  )
}

export function CatalogueError({ onRetry }) {
  return (
    <section role="alert" className="rounded-3xl border border-red-200 bg-red-50 px-6 py-10 text-center">
      <h2 className="text-2xl font-black text-red-950">We couldn’t load the catalogue.</h2>
      <p className="mx-auto mt-3 max-w-xl leading-7 text-red-900/70">The service may be temporarily unavailable. No account or profile information was affected.</p>
      <button type="button" onClick={onRetry} className="mt-6 rounded-xl bg-red-900 px-5 py-3 text-sm font-black text-white focus:outline-none focus-visible:ring-4 focus-visible:ring-red-300">
        Try again
      </button>
    </section>
  )
}

export function CatalogueNotFound({ title, description, backTo, backLabel }) {
  return (
    <section className="rounded-3xl border border-forest/10 bg-white/75 px-6 py-12 text-center shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-leaf">Not found</p>
      <h1 className="mt-3 text-3xl font-black">{title}</h1>
      <p className="mx-auto mt-3 max-w-xl leading-7 text-ink/60">{description}</p>
      <Link to={backTo} className="mt-6 inline-flex rounded-xl bg-forest px-5 py-3 text-sm font-black text-white focus:outline-none focus-visible:ring-4 focus-visible:ring-leaf/35">
        {backLabel}
      </Link>
    </section>
  )
}
