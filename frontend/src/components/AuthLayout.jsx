import { LogIn, UserPlus } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { paths } from '../constants/routes.js'
import { Brand } from './Brand.jsx'

export function AuthLayout({ title, description, children }) {
  return (
    <div className="auth-layout">
      <header className="auth-header">
        <div className="auth-header-inner">
          <Brand />
          <nav className="auth-nav" aria-label="Account access">
            <NavLink to={paths.login}>
              <LogIn size={17} aria-hidden="true" />
              Sign in
            </NavLink>
            <NavLink to={paths.register}>
              <UserPlus size={17} aria-hidden="true" />
              Register
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="auth-main">
        <section className="auth-content" aria-labelledby="auth-title">
          <h1 id="auth-title">{title}</h1>
          {description && <p className="muted auth-description">{description}</p>}
          {children}
        </section>
      </main>
    </div>
  )
}
