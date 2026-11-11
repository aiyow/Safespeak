import { useState } from 'react'
import { LayoutDashboard, LogOut } from 'lucide-react'
import { Brand } from '../components/Brand.jsx'
import { roles } from '../constants/routes.js'
import { useAuth } from '../context/authContext.js'

export function DashboardPage() {
  const { user, logout } = useAuth()
  const { label, icon: Icon } = roles[user.role]
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function signOut() {
    setError('')
    setPending(true)
    try {
      await logout()
    } catch (error) {
      setError(error.message)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="dashboard" data-role={user.role}>
      <aside className="dashboard-sidebar">
        <Brand />
        <div className="dashboard-location"><LayoutDashboard size={18} aria-hidden="true" /> Dashboard</div>
      </aside>
      <div className="dashboard-body">
        <header className="dashboard-header">
          <span>{label} portal</span>
          <button type="button" className="button button-outline" onClick={signOut} disabled={pending}>
            <LogOut size={17} aria-hidden="true" /> {pending ? 'Signing out…' : 'Sign out'}
          </button>
        </header>
        <main className="dashboard-main">
          {error && <p className="notice notice-error" role="alert">{error}</p>}
          <div className="dashboard-welcome">
            <p>{label} dashboard</p>
            <h1>Welcome, {user.fullName}.</h1>
          </div>
          <section className="role-card" aria-labelledby="role-title">
            <div className="role-icon"><Icon size={23} aria-hidden="true" /></div>
            <div>
              <h2 id="role-title">Account role</h2>
              <p>{label}</p>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
