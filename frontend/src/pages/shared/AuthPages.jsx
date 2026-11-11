import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AuthLayout } from '../../components/AuthLayout.jsx'
import { PasswordField } from '../../components/PasswordField.jsx'
import { RegistrationNameFields, StudentRegistrationFields } from '../../components/RegistrationFields.jsx'
import { paths, roles } from '../../constants/routes.js'
import { useAuth } from '../../context/authContext.js'
import { useRegistration } from '../../hooks/useRegistration.js'
import { auth } from '../../services/auth.js'

function EmailField() {
  return (
    <div className="grid gap-[7px] [&_label]:text-[.88rem] [&_label]:font-[650] [&_input]:min-h-[46px] [&_input]:w-full [&_input]:min-w-0 [&_input]:rounded-[9px] [&_input]:border [&_input]:border-[#dfcdd0] [&_input]:bg-[#fffaf9] [&_input]:px-3 [&_input]:py-[9px] [&_input:hover]:border-[#b88c96] [&_input:focus]:border-[#831f37] [&_select]:min-h-[46px] [&_select]:w-full [&_select]:min-w-0 [&_select]:rounded-[9px] [&_select]:border [&_select]:border-[#dfcdd0] [&_select]:bg-[#fffaf9] [&_select]:px-3 [&_select]:py-[9px] [&_select:hover]:border-[#b88c96] [&_select:focus]:border-[#831f37]">
      <label htmlFor="email">Email address</label>
      <input id="email" name="email" type="email" autoComplete="email" maxLength={255} required />
    </div>
  )
}

function SubmitButton({ children, pending }) {
  return (
    <button className="mt-0.5 inline-flex min-h-[47px] items-center justify-between gap-[9px] rounded-[9px] border border-transparent bg-[#831f37] px-4 py-[9px] font-[650] text-white enabled:hover:bg-[#68152a]" type="submit" disabled={pending}>
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
      <form className="grid gap-[19px]" onSubmit={submit}>
        {location.state?.registered && <p className="m-0 rounded-lg border border-[#bfe2d8] bg-[#ecfaf5] px-[13px] py-[11px] text-[.9rem] leading-normal text-[#155e4a]" role="status">Account created. Sign in to continue.</p>}
        <EmailField />
        <PasswordField />
        {error && <p className="m-0 rounded-lg border border-[#ebc2c2] bg-[#fff1f0] px-[13px] py-[11px] text-[.9rem] leading-normal text-[#872b2b]" role="alert">{error}</p>}
        <SubmitButton pending={pending}>{pending ? 'Signing in…' : 'Sign in'}</SubmitButton>
      </form>
    </AuthLayout>
  )
}

export function RegisterPage() {
  const { allowedRoles, loading, error: availabilityError } = useRegistration()
  const navigate = useNavigate()
  const [role, setRole] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setError('')
    setPending(true)
    try {
      await auth.register(new FormData(event.currentTarget))
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
      {availabilityError && <p className="m-0 rounded-lg border border-[#ebc2c2] bg-[#fff1f0] px-[13px] py-[11px] text-[.9rem] leading-normal text-[#872b2b]" role="alert">{availabilityError}</p>}
      {!loading && !availabilityError && !allowedRoles.length && <p className="m-0 rounded-lg border border-[#dfcdd0] bg-[#f4f7f8] px-[13px] py-[11px] text-[.9rem] leading-normal">Registration is closed.</p>}
      {allowedRoles.length > 0 && (
        <form className="grid gap-[19px]" onSubmit={submit}>
          <fieldset className="m-0 min-w-0 border-0 p-0 [&_legend]:mb-2 [&_legend]:p-0 [&_legend]:text-[.88rem] [&_legend]:font-[650]">
            <legend>Account role</legend>
            <div className="grid grid-cols-3 gap-2">
              {allowedRoles.map(allowedRole => {
                const { icon: Icon, label } = roles[allowedRole]
                return (
                  <label className="relative cursor-pointer [&_input]:absolute [&_input]:size-px [&_input]:opacity-0 [&_span]:grid [&_span]:min-h-[65px] [&_span]:place-items-center [&_span]:gap-1.5 [&_span]:rounded-[9px] [&_span]:border [&_span]:border-[#dfcdd0] [&_span]:px-0.5 [&_span]:py-2 [&_span]:text-[.8rem] [&_span]:font-[650] [&_span]:text-[#6f414c] hover:[&_span]:border-[#b88c96] [&_input:checked+span]:border-[#831f37] [&_input:checked+span]:bg-[#faeef0] [&_input:checked+span]:text-[#831f37] [&_input:focus-visible+span]:outline-3 [&_input:focus-visible+span]:outline-offset-2 [&_input:focus-visible+span]:outline-[#831f37]" key={allowedRole}>
                    <input type="radio" name="role" value={allowedRole} checked={role === allowedRole}
                      onChange={() => setRole(allowedRole)} required />
                    <span><Icon size={19} aria-hidden="true" />{label}</span>
                  </label>
                )
              })}
            </div>
          </fieldset>
          <RegistrationNameFields />
          {role === 'student' && <StudentRegistrationFields />}
          <EmailField />
          <PasswordField isNew />
          {error && <p className="m-0 rounded-lg border border-[#ebc2c2] bg-[#fff1f0] px-[13px] py-[11px] text-[.9rem] leading-normal text-[#872b2b]" role="alert">{error}</p>}
          <SubmitButton pending={pending}>{pending ? 'Creating account…' : 'Create account'}</SubmitButton>
        </form>
      )}
    </AuthLayout>
  )
}
