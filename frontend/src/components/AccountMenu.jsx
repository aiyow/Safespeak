import { useEffect, useId, useRef, useState } from 'react'
import { Bell, ChevronDown, Settings, UserRound } from 'lucide-react'
import { useAuth } from '../context/authContext.js'
import { SignOutButton } from './SignOutButton.jsx'

export function AccountMenu({ name, role }) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const container = useRef(null)
  const trigger = useRef(null)
  const panelId = useId()
  const initials = name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()

  useEffect(() => {
    if (!open) return
    function dismissOutside(event) {
      if (!container.current?.contains(event.target)) setOpen(false)
    }
    function dismissOnEscape(event) {
      if (event.key === 'Escape') {
        setOpen(false)
        trigger.current?.focus()
      }
    }
    document.addEventListener('pointerdown', dismissOutside)
    document.addEventListener('keydown', dismissOnEscape)
    return () => {
      document.removeEventListener('pointerdown', dismissOutside)
      document.removeEventListener('keydown', dismissOnEscape)
    }
  }, [open])

  return (
    <div className="flex shrink-0 items-center gap-2">
      <button type="button" disabled aria-label="Notifications unavailable" title="Notifications are not available yet" className="grid size-8 shrink-0 place-items-center rounded-lg border border-[#e7dcde] bg-white text-[#986f7a] disabled:cursor-default! disabled:opacity-100!">
        <Bell size={16} strokeWidth={1.7} aria-hidden="true" />
      </button>
      <div ref={container} className="relative">
        <button ref={trigger} type="button" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(previous => !previous)} className="flex min-h-9 max-w-[220px] items-center gap-2 rounded-lg border border-[#dfcdd2] bg-[#fffdfd] px-2 py-1 text-left hover:bg-[#f8edef] focus-visible:outline-offset-2">
          <span className="grid size-7 shrink-0 place-items-center rounded-md bg-[#831f37] text-[.65rem] font-semibold text-white" aria-hidden="true">{initials}</span>
          <span className="min-w-0 max-[420px]:max-w-[105px]">
            <strong className="block truncate text-xs font-semibold text-[#352129]">{name}</strong>
            <span className="block truncate text-[.6rem] text-[#80616c]">{role}</span>
          </span>
          <ChevronDown size={12} aria-hidden="true" className={`shrink-0 text-[#80616c] transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <div id={panelId} className="absolute top-[calc(100%+8px)] right-0 z-50 w-[260px] max-w-[calc(100vw-32px)] overflow-hidden rounded-lg border border-[#e7dcde] bg-white shadow-[0_8px_24px_#3521291a]">
            <div className="border-b border-[#e7dcde] px-4 py-3">
              <p className="text-sm font-semibold text-[#352129] [overflow-wrap:anywhere]">{name}</p>
              <p className="mt-1 text-xs text-[#80616c] [overflow-wrap:anywhere]">{user.email}</p>
            </div>
            <div className="py-1">
              <button type="button" disabled className="flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left text-sm text-[#80616c] disabled:cursor-default! disabled:opacity-100!"><UserRound size={16} aria-hidden="true" /> Profile</button>
              <button type="button" disabled className="flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left text-sm text-[#80616c] disabled:cursor-default! disabled:opacity-100!"><Settings size={16} aria-hidden="true" /> Settings</button>
            </div>
            <div className="border-t border-[#e7dcde]"><SignOutButton variant="menu" /></div>
          </div>
        )}
      </div>
    </div>
  )
}
