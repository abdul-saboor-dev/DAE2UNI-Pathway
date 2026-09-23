import { Navigate, Outlet, useLocation } from 'react-router-dom'
import useAuth from '../context/useAuth.js'
import LoadingScreen from './LoadingScreen.jsx'
import { getRoleDestination } from '../utils/navigation.js'
import { CONTENT_MANAGER_ROLES, ROLE_MANAGER_ROLES } from '../utils/roles.js'

export function PublicOnlyRoute() {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return <LoadingScreen label="Restoring your session…" />
  if (user) {
    return <Navigate to={getRoleDestination(location.state?.from, user.role)} replace />
  }
  return <Outlet />
}

export function AdminRouteGuard() {
  return <ProtectedRoute allowedRoles={CONTENT_MANAGER_ROLES} />
}

export function TeamRouteGuard() {
  return <ProtectedRoute allowedRoles={ROLE_MANAGER_ROLES} />
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
