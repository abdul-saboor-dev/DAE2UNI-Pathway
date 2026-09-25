import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import useAuth from '../context/useAuth.js'
import { canManageRoles } from '../utils/roles.js'

const navClass = () => 'admin-nav-link'

function AdminLinks({ user, signOut }) {
  return <>
    <NavLink to="/admin" end className={navClass}>Dashboard</NavLink>
    <NavLink to="/admin/universities" className={navClass}>Universities</NavLink>
    <NavLink to="/admin/programs" className={navClass}>Programs</NavLink>
    <NavLink to="/admin/import" className={navClass}>Bulk import</NavLink>
    <NavLink to="/admin/verification-queue" className={navClass}>Verification queue</NavLink>
    {canManageRoles(user?.role) && <NavLink to="/admin/administrators" className={navClass}>Manage administrators</NavLink>}
    <div className="my-3 border-t border-white/20" />
    <NavLink to="/" className={navClass}>Public site</NavLink>
    <button type="button" onClick={signOut} className="admin-nav-link w-full text-left">Logout</button>
  </>
}

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  function signOut() {
    logout()
    navigate('/', { replace: true })
  }
  return <div className="admin-workspace min-h-screen min-w-0">
    <a href="#admin-main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:bg-white focus:px-4 focus:py-3">Skip to administrator content</a>
    <div className="mx-auto grid min-h-screen max-w-[1700px] min-w-0 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <header className="admin-sidebar relative z-20 min-w-0 lg:sticky lg:top-0 lg:h-screen">
        <div className="flex items-center justify-between gap-3 border-b border-white/15 px-4 py-4 lg:px-5 lg:py-6">
          <Link to="/admin" className="inline-flex min-h-11 min-w-0 items-center gap-3 font-black focus-visible:outline-3">
            <span className="grid size-10 shrink-0 place-items-center bg-gold text-xs tracking-[-.08em] text-navy">D2U</span>
            <span className="leading-tight">DAE2UNI <span className="block text-[.65rem] font-semibold uppercase tracking-[.12em] text-[#c4d7e6]">Operations</span></span>
          </Link>
          <details key={location.pathname} className="group lg:hidden">
            <summary className="flex min-h-11 cursor-pointer list-none items-center border border-white/35 px-3 text-sm font-bold focus-visible:outline-3">Admin menu</summary>
            <nav aria-label="Administrator navigation" className="absolute inset-x-0 top-full z-30 border-b border-white/20 bg-navy p-3 shadow-xl"><AdminLinks user={user} signOut={signOut} /></nav>
          </details>
        </div>
        <nav aria-label="Administrator navigation" className="hidden px-3 py-5 lg:block"><AdminLinks user={user} signOut={signOut} /></nav>
        <div className="hidden border-t border-white/15 px-5 py-5 text-sm lg:block">
          <p className="break-words font-bold">{user?.name || 'Administrator'}</p>
          <p className="mt-1 break-all text-xs text-[#c4d7e6]">{user?.email}</p>
          <p className="mt-2 text-xs uppercase tracking-wider text-[#c4d7e6]">{user?.role?.replaceAll('_', ' ')}</p>
        </div>
      </header>
      <main id="admin-main" className="min-w-0 px-4 py-7 sm:px-7 lg:px-10 lg:py-10" tabIndex={-1}><Outlet /></main>
    </div>
  </div>
}
