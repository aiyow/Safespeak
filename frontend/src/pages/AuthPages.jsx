import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AuthLayout } from '../components/AuthLayout.jsx'
import { PasswordField } from '../components/PasswordField.jsx'
import { paths, roles } from '../constants/routes.js'
import { useAuth } from '../context/authContext.js'
import { useRegistration } from '../hooks/useRegistration.js'
import { auth } from '../services/auth.js'

function EmailField() {
  return (
    <div className="field">
      <label htmlFor="email">Email address</label>
      <input id="email" name="email" type="email" autoComplete="email" maxLength={255} required />
    </div>
  )
}

function SubmitButton({ children, pending }) {
  return (
    <button className="button auth-submit" type="submit" disabled={pending}>
      {children} <ArrowRight size={18} aria-hidden="true" />
    </button>
  )
}

export function LoginPage() {
  const { login } = useAuth()
  const location = useLocation()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setError('')
    setPending(true)
    try {
      await login(Object.fromEntries(new FormData(event.currentTarget)))
    } catch (error) {
      setError(error.message)
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthLayout title="Welcome back" description="Sign in to your SafeSpeak account.">
      <form className="auth-form" onSubmit={submit}>
        {location.state?.registered && <p className="notice notice-success" role="status">Account created. Sign in to continue.</p>}
        <EmailField />
        <PasswordField />
        {error && <p className="notice notice-error" role="alert">{error}</p>}
        <SubmitButton pending={pending}>{pending ? 'Signing in…' : 'Sign in'}</SubmitButton>
      </form>
    </AuthLayout>
  )
}

export function RegisterPage() {
  const { allowedRoles, loading, error: availabilityError } = useRegistration()
  const navigate = useNavigate()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setError('')
    setPending(true)
    try {
      await auth.register(Object.fromEntries(new FormData(event.currentTarget)))
      navigate(paths.login, { replace: true, state: { registered: true } })
    } catch (error) {
      setError(error.message)
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthLayout title="Create an account" description={allowedRoles.length ? 'Use fictional details for local testing.' : undefined}>
      {loading && <p role="status">Checking registration availability…</p>}
      {availabilityError && <p className="notice notice-error" role="alert">{availabilityError}</p>}
      {!loading && !availabilityError && !allowedRoles.length && <p className="notice">Registration is closed.</p>}
      {allowedRoles.length > 0 && (
        <form className="auth-form" onSubmit={submit}>
          <fieldset className="role-field">
            <legend>Account role</legend>
            <div className="role-options">
              {allowedRoles.map(role => {
                const { icon: Icon, label } = roles[role]
                return (
                  <label className="role-option" key={role}>
                    <input type="radio" name="role" value={role} required />
                    <span><Icon size={19} aria-hidden="true" />{label}</span>
                  </label>
                )
              })}
            </div>
          </fieldset>
          <div className="field">
            <label htmlFor="fullName">Full name</label>
            <input id="fullName" name="fullName" autoComplete="name" maxLength={150} required />
          </div>
          <EmailField />
          <PasswordField isNew />
          {error && <p className="notice notice-error" role="alert">{error}</p>}
          <SubmitButton pending={pending}>{pending ? 'Creating account…' : 'Create account'}</SubmitButton>
        </form>
      )}
    </AuthLayout>
  )
}
