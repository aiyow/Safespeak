import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export function PasswordField({ isNew = false }) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="grid gap-[7px] [&_label]:text-[.88rem] [&_label]:font-[650] [&_input]:min-h-[46px] [&_input]:w-full [&_input]:min-w-0 [&_input]:rounded-[9px] [&_input]:border [&_input]:border-[#dfcdd0] [&_input]:bg-[#fffaf9] [&_input]:px-3 [&_input]:py-[9px] [&_input:hover]:border-[#b88c96] [&_input:focus]:border-[#831f37] [&_select]:min-h-[46px] [&_select]:w-full [&_select]:min-w-0 [&_select]:rounded-[9px] [&_select]:border [&_select]:border-[#dfcdd0] [&_select]:bg-[#fffaf9] [&_select]:px-3 [&_select]:py-[9px] [&_select:hover]:border-[#b88c96] [&_select:focus]:border-[#831f37]">
      <label htmlFor="password">Password</label>
      <div className="relative [&_input]:pr-12">
        <input
          id="password"
          name="password"
          type={visible ? 'text' : 'password'}
          autoComplete={isNew ? 'new-password' : 'current-password'}
          minLength={isNew ? 12 : undefined}
          aria-describedby={isNew ? 'password-hint' : undefined}
          required
        />
        <button type="button" className="absolute top-1 right-1 grid size-[38px] place-items-center rounded-[7px] border-0 bg-transparent text-[#66535a] hover:bg-[#faeef0] hover:text-[#831f37]" aria-label={visible ? 'Hide password' : 'Show password'}
          onClick={() => setVisible(previous => !previous)}>
          {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      </div>
      {isNew && <small id="password-hint" className="text-[#66535a]">Use at least 12 characters.</small>}
    </div>
  )
}
