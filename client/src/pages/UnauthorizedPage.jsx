import { Link } from 'react-router-dom'
import useAuth from '../context/useAuth.js'

function UnauthorizedPage() {
  const { user } = useAuth()
  return (
    <section className="mx-auto flex min-h-[58vh] max-w-3xl items-center px-6 py-14 text-center">
      <div className="w-full rounded-[2rem] border border-amber-200 bg-white/80 p-8 shadow-xl sm:p-12">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-700">Access restricted</p>
        <h1 className="mt-4 text-4xl font-black tracking-tight">This area is not available for your account.</h1>
        <p className="mx-auto mt-4 max-w-xl leading-7 text-ink/60">Frontend role checks improve navigation, but the API remains the authority for every protected action.</p>
        <Link className="mt-7 inline-flex rounded-xl bg-forest px-5 py-3 text-sm font-black text-white" to={user?.role === 'student' ? '/dashboard' : '/'}>Return to a safe page</Link>
      </div>
    </section>
  )
}

export default UnauthorizedPage
