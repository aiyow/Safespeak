import { Navigate, Outlet } from 'react-router-dom'
import { Brand } from '../components/Brand.jsx'
import { paths, roles } from '../constants/routes.js'
import { useAuth } from '../context/authContext.js'

export function AccountGate({ requiredRole }) {
  const { status, user, retry } = useAuth()

  if (status !== 'ready') {
    return (
      <main className="session-screen">
        <Brand />
        {status === 'loading' ? (
          <p role="status">Checking your session…</p>
        ) : (
          <>
            <p role="alert">Could not check your session.</p>
            <button className="button" onClick={retry}>Try again</button>
          </>
        )}
      </main>
    )
  }

  if (requiredRole && !user) return <Navigate to={paths.login} replace />
  if (user && user.role !== requiredRole) return <Navigate to={roles[user.role].path} replace />
  return <Outlet />
}
