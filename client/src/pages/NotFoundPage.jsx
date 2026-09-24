import { Link } from 'react-router-dom'

function NotFoundPage() {
  return (
    <section className="site-container flex min-h-[58vh] max-w-3xl items-center py-14">
      <div className="paper-surface w-full border-t-4 !border-t-gold p-8 sm:p-12">
        <p className="eyebrow">404 · Path not found</p>
        <h1 className="page-title mt-4 text-4xl text-navy">That pathway does not exist.</h1>
        <p className="mx-auto mt-4 max-w-xl leading-7 text-ink/60">The address may be incorrect, or the page may belong to a future DAE2UNI milestone.</p>
        <Link className="action-primary mt-7" to="/">Return home</Link>
      </div>
    </section>
  )
}

export default NotFoundPage
