import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import useAuth from '../context/useAuth.js'
import { canManageRoles } from '../utils/roles.js'

const navClass = ({ isActive }) => `block rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 ${isActive ? 'bg-teal-100 text-slate-950' : 'text-slate-200 hover:bg-white/10'}`

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  function signOut() {
    logout()
    navigate('/', { replace: true })
  }
  return (
    <div className="min-h-screen min-w-0 bg-slate-50 text-slate-900">
      <div className="mx-auto grid min-h-screen max-w-[1600px] min-w-0 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <header className="min-w-0 bg-slate-950 px-4 py-4 text-white sm:px-6 lg:px-5 lg:py-7">
          <div className="flex flex-wrap items-center justify-between gap-3 lg:block">
            <Link to="/admin" className="inline-flex min-h-11 items-center gap-3 rounded-lg font-black focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300">
              <span className="grid size-10 place-items-center rounded-xl bg-teal-500 text-slate-950">D2U</span>
              <span>DAE2UNI <span className="block text-xs font-semibold text-teal-200">Administrator</span></span>
            </Link>
            <details className="group lg:hidden">
              <summary className="flex min-h-11 cursor-pointer items-center rounded-xl border border-white/20 px-4 text-sm font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300">Admin menu</summary>
              <nav aria-label="Administrator navigation" className="mt-3 grid gap-1">
                <NavLink to="/admin" end className={navClass}>Dashboard</NavLink>
                <NavLink to="/admin/universities" className={navClass}>Universities</NavLink>
                <NavLink to="/admin/programs" className={navClass}>Programs</NavLink>
                {canManageRoles(user?.role) && <NavLink to="/admin/administrators" className={navClass}>Manage administrators</NavLink>}
                <NavLink to="/" className={navClass}>Public site</NavLink>
                <button type="button" onClick={signOut} className="min-h-11 rounded-xl px-4 text-left text-sm font-bold text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300">Logout</button>
              </nav>
            </details>
          </div>
          <nav aria-label="Administrator navigation" className="mt-10 hidden space-y-1 lg:block">
            <NavLink to="/admin" end className={navClass}>Dashboard</NavLink>
            <NavLink to="/admin/universities" className={navClass}>Universities</NavLink>
            <NavLink to="/admin/programs" className={navClass}>Programs</NavLink>
            {canManageRoles(user?.role) && <NavLink to="/admin/administrators" className={navClass}>Manage administrators</NavLink>}
            <div className="my-5 border-t border-white/15" />
            <NavLink to="/" className={navClass}>Public site</NavLink>
          </nav>
          <div className="mt-10 hidden min-w-0 rounded-2xl border border-white/10 bg-white/5 p-4 lg:block">
            <p className="break-words text-sm font-bold">{user?.name || 'Administrator'}</p>
            <p className="mt-1 break-all text-xs text-slate-300">{user?.email}</p>
            <button type="button" onClick={signOut} className="mt-4 min-h-11 rounded-lg border border-white/20 px-4 text-sm font-bold text-white hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300">Logout</button>
          </div>
        </header>
        <main className="min-w-0 px-4 py-7 sm:px-7 lg:px-10 lg:py-10"><Outlet /></main>
      </div>
    </div>
  )
}
