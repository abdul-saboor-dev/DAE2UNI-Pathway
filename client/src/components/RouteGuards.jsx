import { Navigate, Outlet, useLocation } from 'react-router-dom'
import useAuth from '../context/useAuth.js'
import LoadingScreen from './LoadingScreen.jsx'

export function PublicOnlyRoute() {
  const { user, isLoading } = useAuth()

  if (isLoading) return <LoadingScreen label="Restoring your session…" />
  if (user) {
    return <Navigate to={user.role === 'student' ? '/dashboard' : '/unauthorized'} replace />
  }
  return <Outlet />
}

export function ProtectedRoute({ allowedRoles }) {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return <LoadingScreen label="Restoring your session…" />
  if (!user) {
    const from = `${location.pathname}${location.search}${location.hash}`
    return <Navigate to="/login" replace state={{ from }} />
  }
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />
  }
  return <Outlet />
}
