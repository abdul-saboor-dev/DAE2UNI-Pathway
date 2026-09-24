import { Link } from 'react-router-dom'
import useAuth from '../context/useAuth.js'

function UnauthorizedPage() {
  const { user } = useAuth()
  return (
    <section className="site-container flex min-h-[58vh] max-w-3xl items-center py-14">
      <div className="paper-surface w-full border-t-4 !border-t-gold p-8 sm:p-12">
        <p className="eyebrow">Access restricted</p>
        <h1 className="page-title mt-4 text-4xl text-navy">This area is not available for your account.</h1>
        <p className="mx-auto mt-4 max-w-xl leading-7 text-ink/60">Frontend role checks improve navigation, but the API remains the authority for every protected action.</p>
        <Link className="action-primary mt-7" to={user?.role === 'student' ? '/dashboard' : '/'}>Return to a safe page</Link>
      </div>
    </section>
  )
}

export default UnauthorizedPage
