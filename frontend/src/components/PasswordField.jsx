import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export function PasswordField({ isNew = false }) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="field">
      <label htmlFor="password">Password</label>
      <div className="password-field">
        <input
          id="password"
          name="password"
          type={visible ? 'text' : 'password'}
          autoComplete={isNew ? 'new-password' : 'current-password'}
          minLength={isNew ? 12 : undefined}
          aria-describedby={isNew ? 'password-hint' : undefined}
          required
        />
        <button type="button" className="password-toggle" aria-label={visible ? 'Hide password' : 'Show password'}
          onClick={() => setVisible(previous => !previous)}>
          {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      </div>
      {isNew && <small id="password-hint" className="muted">Use at least 12 characters.</small>}
    </div>
  )
}
