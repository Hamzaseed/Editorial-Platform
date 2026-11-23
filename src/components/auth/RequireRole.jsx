import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

function RequireRole({ role }) {
  const { user } = useAuth()
  const location = useLocation()
  const userRole = String(user?.role || '').toLowerCase()
  const requiredRole = String(role || '').toLowerCase()

  // Allow direct access to admin panel and author portal without any auth barrier
  if (requiredRole === 'admin' || requiredRole === 'author') {
    return <Outlet />
  }

  const redirectPath = !user
    ? '/newsroom'
    : userRole === requiredRole
      ? null
      : userRole === 'admin' || userRole === 'super_admin'
        ? '/admin/dashboard'
        : userRole === 'author'
          ? '/author/dashboard'
          : '/newsroom'

  if (redirectPath) {
    return <Navigate to={redirectPath} replace state={{ from: location }} />
  }

  return <Outlet />
}

export default RequireRole
