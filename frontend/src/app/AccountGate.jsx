import { Navigate, Outlet } from 'react-router-dom'
import { Brand } from '../components/Brand.jsx'
import { paths, roles } from '../constants/routes.js'
import { useAuth } from '../context/authContext.js'

export function AccountGate({ requiredRole }) {
  const { status, user, retry } = useAuth()

  if (status !== 'ready') {
    return (
      <main className="grid min-h-svh content-center justify-items-center gap-3.5 p-6 [&_p]:m-0">
        <Brand />
        {status === 'loading' ? (
          <p role="status">Checking your session…</p>
        ) : (
          <>
            <p role="alert">Could not check your session.</p>
            <button className="inline-flex min-h-11 items-center justify-center gap-[9px] rounded-[9px] border border-transparent bg-[#08716b] px-4 py-[9px] font-[650] text-white enabled:hover:bg-[#095b56]" onClick={retry}>Try again</button>
          </>
        )}
      </main>
    )
  }

  if (requiredRole && !user) return <Navigate to={paths.login} replace />
  if (user && user.role !== requiredRole) return <Navigate to={roles[user.role].path} replace />
  return <Outlet />
}
