import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import BrandLogo from '../components/BrandLogo.jsx'
import useAuth from '../context/useAuth.js'
import { canManageRoles } from '../utils/roles.js'

const navClass = () => 'admin-nav-link'

function AdminLinks({ user, signOut }) {
  return <>
    <NavLink to="/admin" end className={navClass}>Dashboard</NavLink>
    <NavLink to="/admin/universities" className={navClass}>Universities</NavLink>
    <NavLink to="/admin/programs" className={navClass}>Programs</NavLink>
    <NavLink to="/admin/program-images" className={navClass}>Program images</NavLink>
    <NavLink to="/admin/import" className={navClass}>Bulk import</NavLink>
    <NavLink to="/admin/verification-queue" className={navClass}>Verification queue</NavLink>
    <NavLink to="/admin/eligibility-research" className={navClass}>Eligibility research</NavLink>
    <NavLink to="/admin/eligibility-rules" className={navClass}>Eligibility rules</NavLink>
    <NavLink to="/admin/entry-tests" className={navClass}>Entry tests</NavLink>
    <NavLink to="/admin/merit-formulas" className={navClass}>Merit formulas</NavLink>
    {canManageRoles(user?.role) && <NavLink to="/admin/administrators" className={navClass}>Manage administrators</NavLink>}
    {user?.role === 'owner' && <NavLink to="/admin/students" className={navClass}>Student accounts</NavLink>}
    <div className="my-3 border-t border-white/20" />
    <NavLink to="/" className={navClass}>Public site</NavLink>
    <button type="button" onClick={signOut} className="admin-nav-link w-full text-left">Logout</button>
  </>
}

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    function closeOnEscape(event) {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [])

  function signOut() {
    setMenuOpen(false)
    logout()
    navigate('/', { replace: true })
  }
  return <div className="admin-workspace min-h-screen min-w-0">
    <a href="#admin-main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-[var(--ui-radius-sm)] focus:bg-[var(--ui-surface-raised)] focus:px-4 focus:py-3">Skip to administrator content</a>
    <div className="mx-auto grid min-h-screen max-w-[1700px] min-w-0 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <header className="admin-sidebar relative z-20 min-w-0 lg:sticky lg:top-0 lg:flex lg:h-dvh lg:self-start lg:flex-col lg:overflow-hidden">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/15 px-4 py-4 lg:px-5 lg:py-6">
          <Link to="/admin" className="inline-flex min-h-11 min-w-0 items-center focus-visible:outline-3" aria-label="DAE2UNI administrator dashboard">
            <BrandLogo variant="admin" />
          </Link>
          <button type="button" className="admin-menu-toggle flex min-h-11 items-center rounded-[var(--ui-radius-sm)] border border-white/35 px-4 text-sm font-semibold focus-visible:outline-3 lg:hidden" aria-expanded={menuOpen} aria-controls="mobile-admin-navigation" onClick={() => setMenuOpen((open) => !open)}>Admin menu</button>
        </div>
        {menuOpen && <nav id="mobile-admin-navigation" aria-label="Administrator navigation" className="border-b border-white/20 px-3 py-3 lg:hidden"><AdminLinks user={user} signOut={signOut} /></nav>}
        <nav aria-label="Administrator navigation" className="admin-sidebar-scroll hidden min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-3 py-5 lg:block"><AdminLinks user={user} signOut={signOut} /></nav>
        <div className="hidden shrink-0 border-t border-white/15 px-5 py-5 text-sm lg:block">
          <p className="break-words font-bold">{user?.name || 'Administrator'}</p>
          <p className="mt-1 break-all text-xs text-white/65">{user?.email}</p>
          <p className="mt-2 text-xs uppercase tracking-wider text-white/65">{user?.role?.replaceAll('_', ' ')}</p>
        </div>
      </header>
      <main id="admin-main" className="min-w-0 px-4 py-7 sm:px-7 lg:px-10 lg:py-10" tabIndex={-1}><Outlet /></main>
    </div>
  </div>
}
