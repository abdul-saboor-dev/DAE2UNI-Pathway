import { Link } from 'react-router-dom'

function NotFoundPage() {
  return (
    <section className="mx-auto flex min-h-[58vh] max-w-3xl items-center px-6 py-14 text-center">
      <div className="w-full rounded-[2rem] border border-forest/10 bg-white/80 p-8 shadow-xl sm:p-12">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-leaf">404 · Path not found</p>
        <h1 className="mt-4 text-4xl font-black tracking-tight">That pathway does not exist.</h1>
        <p className="mx-auto mt-4 max-w-xl leading-7 text-ink/60">The address may be incorrect, or the page may belong to a future DAE2UNI milestone.</p>
        <Link className="mt-7 inline-flex rounded-xl bg-forest px-5 py-3 text-sm font-black text-white" to="/">Return home</Link>
      </div>
    </section>
  )
}

export default NotFoundPage
