import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import useAuth from '../context/useAuth.js'

function navigationClass({ isActive }) {
  return `rounded-lg px-3 py-2 text-sm font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-leaf ${isActive ? 'bg-mint text-forest' : 'text-ink/65 hover:bg-white/70 hover:text-forest'}`
}

function MainLayout() {
  const { user, isLoading, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-cream text-ink">
      <header className="relative z-20 border-b border-forest/8 bg-cream/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4 lg:px-10">
        <Link to="/" className="flex items-center gap-3 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-leaf" aria-label="DAE2UNI Pathway home">
          <span className="grid size-10 place-items-center rounded-xl bg-forest text-sm font-black tracking-tight text-white shadow-lg shadow-forest/15">
            D2U
          </span>
          <span className="font-bold tracking-tight">DAE2UNI Pathway</span>
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-1" aria-label="Main navigation">
          <NavLink to="/" end className={navigationClass}>Home</NavLink>
          <NavLink to="/universities" className={navigationClass}>Universities</NavLink>
          <NavLink to="/programs" className={navigationClass}>Programs</NavLink>
          {!isLoading && !user && (
            <>
              <NavLink to="/login" className={navigationClass}>Login</NavLink>
              <Link to="/register" className="ml-1 rounded-lg bg-forest px-4 py-2 text-sm font-black text-white transition hover:bg-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-leaf">Register</Link>
            </>
          )}
          {!isLoading && user?.role === 'student' && (
            <>
              <NavLink to="/dashboard" className={navigationClass}>Dashboard</NavLink>
              <NavLink to="/profile" className={navigationClass}>Profile</NavLink>
              <button type="button" onClick={handleLogout} className="ml-1 rounded-lg border border-forest/20 bg-white/60 px-4 py-2 text-sm font-black text-forest transition hover:bg-mint focus:outline-none focus-visible:ring-2 focus-visible:ring-leaf">Logout</button>
            </>
          )}
          {!isLoading && user?.role !== 'student' && user && (
            <button type="button" onClick={handleLogout} className="rounded-lg border border-forest/20 bg-white/60 px-4 py-2 text-sm font-black text-forest">Logout</button>
          )}
        </nav>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-8 text-sm text-ink/60 sm:flex-row sm:items-center sm:justify-between lg:px-10">
        <span>Built for DAE CIT students exploring university pathways in Punjab.</span>
        <span>From Diploma to University</span>
      </footer>
    </div>
  )
}

export default MainLayout
