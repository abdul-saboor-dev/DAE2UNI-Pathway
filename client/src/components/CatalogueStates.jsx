import { Link } from 'react-router-dom'

export function CatalogueLoading({ label = 'Loading catalogue results…' }) {
  return (
    <div role="status" aria-live="polite" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <span className="sr-only">{label}</span>
      {[1, 2, 3, 4, 5, 6].map((item) => (
        <div key={item} aria-hidden="true" className="paper-surface min-h-64 animate-pulse p-6">
          <div className="h-3 w-24 rounded bg-mint" />
          <div className="mt-5 h-7 w-4/5 rounded bg-forest/10" />
          <div className="mt-3 h-4 w-3/5 rounded bg-forest/10" />
          <div className="mt-10 h-16 bg-cream" />
        </div>
      ))}
    </div>
  )
}

export function CatalogueEmpty({ title, description, onClear }) {
  return (
    <section className="paper-surface border-dashed px-6 py-12 text-center">
      <h2 className="section-title text-2xl text-navy">{title}</h2>
      <p className="mx-auto mt-3 max-w-xl leading-7 text-ink/60">{description}</p>
      {onClear && (
        <button type="button" onClick={onClear} className="action-primary mt-6">
          Clear all filters
        </button>
      )}
    </section>
  )
}

export function CatalogueError({ onRetry }) {
  return (
    <section role="alert" className="border-l-4 border-[#8b2525] bg-[#fff6f3] px-6 py-10 text-center">
      <h2 className="section-title text-2xl text-[#731d1d]">We couldn’t load the catalogue.</h2>
      <p className="mx-auto mt-3 max-w-xl leading-7 text-red-900/70">The service may be temporarily unavailable. No account or profile information was affected.</p>
      <button type="button" onClick={onRetry} className="action-primary mt-6 !bg-[#8b2525] hover:!bg-[#731d1d]">
        Try again
      </button>
    </section>
  )
}

export function CatalogueNotFound({ title, description, backTo, backLabel }) {
  return (
    <section className="paper-surface px-6 py-12 text-center">
      <p className="eyebrow">Not found</p>
      <h1 className="page-title mt-3 text-3xl text-navy">{title}</h1>
      <p className="mx-auto mt-3 max-w-xl leading-7 text-ink/60">{description}</p>
      <Link to={backTo} className="action-primary mt-6">
        {backLabel}
      </Link>
    </section>
  )
}
