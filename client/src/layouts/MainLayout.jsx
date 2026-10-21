import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import BrandLogo from '../components/BrandLogo.jsx'
import RouteSeo from '../components/RouteSeo.jsx'
import useAuth from '../context/useAuth.js'
import { canManageContent } from '../utils/roles.js'

const navigationClass = () => 'site-nav-link'

function AccountLinks({ user, isLoading, onLogout }) {
  return <>
    {!isLoading && !user && <>
      <NavLink to="/login" className={navigationClass}>Login</NavLink>
      <Link to="/register" className="action-primary">Register</Link>
    </>}
    {!isLoading && user?.role === 'student' && <>
      <NavLink to="/dashboard" className={navigationClass}>Dashboard</NavLink>
      <NavLink to="/eligibility" className={navigationClass}>Eligibility</NavLink>
      <NavLink to="/merit-calculator" className={navigationClass}>Merit calculator</NavLink>
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
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const isHome = location.pathname === '/'

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    function updateScrolled() { setScrolled(window.scrollY > 20) }
    updateScrolled()
    window.addEventListener('scroll', updateScrolled, { passive: true })
    return () => window.removeEventListener('scroll', updateScrolled)
  }, [])

  useEffect(() => {
    function closeOnEscape(event) {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [])

  function handleLogout() {
    setMenuOpen(false)
    logout()
    navigate('/', { replace: true })
  }

  const solidHeader = !isHome || scrolled || menuOpen
  const homePositionClass = !isHome ? '' : menuOpen ? 'site-header--home-menu' : scrolled ? 'site-header--home-scrolled' : 'site-header--home-top'

  return <div className="site-shell flex min-h-screen min-w-0 flex-col">
    <RouteSeo />
    <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-[var(--ui-radius-sm)] focus:bg-[var(--ui-surface-raised)] focus:px-4 focus:py-3">Skip to content</a>
    <header className={`site-header ${solidHeader ? 'site-header--solid' : 'site-header--transparent'} ${homePositionClass}`}>
      <div className="site-container site-header__grid py-3">
        <Link to="/" className="justify-self-start focus-visible:outline-3" aria-label="DAE2UNI home">
          <BrandLogo variant="navigation" />
        </Link>
        <nav className="hidden items-center justify-center gap-1 lg:flex" aria-label="Primary navigation">
          <NavLink to="/" end className={navigationClass}>Home</NavLink>
          <NavLink to="/universities" className={navigationClass}>Universities</NavLink>
          <NavLink to="/programs" className={navigationClass}>Programs</NavLink>
        </nav>
        <nav className="hidden items-center justify-end gap-1 lg:flex" aria-label="Account navigation"><AccountLinks user={user} isLoading={isLoading} onLogout={handleLogout} /></nav>
        <button type="button" className="site-menu-toggle action-secondary justify-self-end lg:hidden" aria-expanded={menuOpen} aria-controls="mobile-site-navigation" onClick={() => setMenuOpen((open) => !open)}><span aria-hidden="true">☰</span> Menu</button>
      </div>
      {menuOpen && <nav id="mobile-site-navigation" aria-label="Mobile navigation" className="mobile-navigation lg:hidden"><div className="site-container flex flex-col gap-1 py-3"><NavLink to="/" end className={navigationClass}>Home</NavLink><NavLink to="/universities" className={navigationClass}>Universities</NavLink><NavLink to="/programs" className={navigationClass}>Programs</NavLink><AccountLinks user={user} isLoading={isLoading} onLogout={handleLogout} /></div></nav>}
    </header>
    <main id="main-content" className="min-w-0 flex-1" tabIndex={-1}><Outlet /></main>
    <footer className="site-footer mt-14">
      <div className="site-container grid gap-5 py-8 text-sm sm:grid-cols-[1fr_auto] sm:items-end">
        <div><p className="font-bold text-white">DAE2UNI Pathway</p><p className="mt-1 max-w-xl">A practical pathway for DAE CIT students exploring undergraduate study. Published guidance remains source-attributed and reviewable.</p></div>
        <p className="font-semibold text-academic">From Diploma to University</p>
      </div>
    </footer>
  </div>
}
