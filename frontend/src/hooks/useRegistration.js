import { useEffect, useState } from 'react'
import { auth } from '../services/auth.js'

export function useRegistration() {
  const [registration, setRegistration] = useState({ allowedRoles: [], loading: true, error: '' })

  useEffect(() => {
    const controller = new AbortController()
    auth.registration(controller.signal).then(({ allowedRoles }) => {
      if (!controller.signal.aborted) setRegistration({ allowedRoles, loading: false, error: '' })
    }).catch(error => {
      if (!controller.signal.aborted) setRegistration({ allowedRoles: [], loading: false, error: error.message })
    })
    return () => controller.abort()
  }, [])

  return registration
}
