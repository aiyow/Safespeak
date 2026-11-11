import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { useAuth } from '../context/authContext.js'

export function SignOutButton({ variant = 'button' }) {
  const { logout } = useAuth()
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
    <div className={variant === 'menu'
      ? 'relative [&_[role=alert]]:mx-3 [&_[role=alert]]:mb-3 [&_[role=alert]]:font-normal'
      : 'relative [&_[role=alert]]:absolute [&_[role=alert]]:top-[calc(100%+8px)] [&_[role=alert]]:right-0 [&_[role=alert]]:z-2 [&_[role=alert]]:w-[min(260px,80vw)] [&_[role=alert]]:font-normal'}>
      <button type="button" className={variant === 'menu'
        ? 'flex min-h-12 w-full items-center gap-3 bg-transparent px-4 py-3 text-left text-sm text-[#4a2832] enabled:hover:bg-[#f8edef]'
        : 'inline-flex min-h-11 items-center justify-center gap-[9px] rounded-[9px] border border-[#cedadf] bg-white px-4 py-[9px] font-[650] text-[#274657] enabled:hover:bg-[#ecf3f5]'} onClick={signOut} disabled={pending}>
        <LogOut size={16} aria-hidden="true" /> {pending ? 'Signing out…' : 'Sign out'}
      </button>
      {error && <p className="m-0 rounded-lg border border-[#ebc2c2] bg-[#fff1f0] px-[13px] py-[11px] text-[.9rem] leading-normal text-[#872b2b]" role="alert">{error}</p>}
    </div>
  )
}
