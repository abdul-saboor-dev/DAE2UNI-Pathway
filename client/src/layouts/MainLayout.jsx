import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import useAuth from '../context/useAuth.js'
import { canManageContent } from '../utils/roles.js'

const navigationClass = () => 'site-nav-link'

function NavigationLinks({ user, isLoading, onLogout }) {
  return <>
    <NavLink to="/" end className={navigationClass}>Home</NavLink>
    <NavLink to="/universities" className={navigationClass}>Universities</NavLink>
    <NavLink to="/programs" className={navigationClass}>Programs</NavLink>
    {!isLoading && !user && <>
      <NavLink to="/login" className={navigationClass}>Login</NavLink>
      <Link to="/register" className="action-primary">Register</Link>
    </>}
    {!isLoading && user?.role === 'student' && <>
      <NavLink to="/dashboard" className={navigationClass}>Dashboard</NavLink>
      <NavLink to="/profile" className={navigationClass}>Profile</NavLink>
      <button type="button" onClick={onLogout} className="action-secondary">Logout</button>
    </>}
    {!isLoading && canManageContent(user?.role) && <>
      <NavLink to="/admin" className={navigationClass}>Admin</NavLink>
      <button type="button" onClick={onLogout} className="action-secondary">Logout</button>
    </>}
  </>
}

export default function MainLayout() {
  const { user, isLoading, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  function handleLogout() {
    logout()
    navigate('/', { replace: true })
  }

  return <div className="site-shell flex min-h-screen min-w-0 flex-col">
    <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:bg-white focus:px-4 focus:py-3">Skip to content</a>
    <header className="site-header relative z-20">
      <div className="site-container flex min-h-20 items-center justify-between gap-5 py-3">
        <Link to="/" className="flex min-w-0 items-center gap-3 focus-visible:outline-3" aria-label="DAE2UNI Pathway home">
          <span className="grid size-11 shrink-0 place-items-center bg-navy text-[.8rem] font-black tracking-[-.08em] text-white">D2U</span>
          <span className="min-w-0 leading-tight"><strong className="block text-lg tracking-[-.04em] text-navy">DAE2UNI</strong><span className="block text-[.62rem] font-bold uppercase tracking-[.14em] text-academic">Pathway</span></span>
        </Link>
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation"><NavigationLinks user={user} isLoading={isLoading} onLogout={handleLogout} /></nav>
        <details key={location.pathname} className="group relative lg:hidden">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 border border-[var(--ui-border)] px-3 text-sm font-bold text-navy focus-visible:outline-3"><span aria-hidden="true">☰</span> Menu</summary>
          <nav aria-label="Mobile navigation" className="absolute right-0 top-full z-30 mt-2 flex w-[min(18rem,calc(100vw-1.5rem))] flex-col gap-1 border border-[var(--ui-border)] bg-[var(--ui-paper)] p-3 shadow-lg"><NavigationLinks user={user} isLoading={isLoading} onLogout={handleLogout} /></nav>
        </details>
      </div>
    </header>
    <main id="main-content" className="min-w-0 flex-1" tabIndex={-1}><Outlet /></main>
    <footer className="site-footer mt-14 bg-[var(--ui-paper)]">
      <div className="site-container grid gap-5 py-8 text-sm sm:grid-cols-[1fr_auto] sm:items-end">
        <div><p className="font-black text-navy">DAE2UNI Pathway</p><p className="mt-1 max-w-xl">A practical pathway for DAE CIT students exploring undergraduate study. Catalogue information is source-attributed; eligibility and merit tools are future work.</p></div>
        <p className="font-semibold text-academic">From Diploma to University</p>
      </div>
    </footer>
  </div>
}
