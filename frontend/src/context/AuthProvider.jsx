import { useEffect, useState } from 'react'
import { auth } from '../services/auth.js'
import { AuthContext } from './authContext.js'

export function AuthProvider({ children }) {
  const [session, setSession] = useState({ status: 'loading', user: null })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    auth.me(controller.signal).then(({ user }) => {
      if (!controller.signal.aborted) setSession({ status: 'ready', user })
    }).catch(error => {
      if (!controller.signal.aborted) {
        setSession({ status: error.status === 401 ? 'ready' : 'error', user: null })
      }
    })
    return () => controller.abort()
  }, [attempt])

  function retry() {
    setSession({ status: 'loading', user: null })
    setAttempt(previous => previous + 1)
  }

  async function login(credentials) {
    const { user } = await auth.login(credentials)
    setSession({ status: 'ready', user })
  }

  async function logout() {
    await auth.logout()
    setSession({ status: 'ready', user: null })
  }

  return <AuthContext.Provider value={{ ...session, retry, login, logout }}>{children}</AuthContext.Provider>
}
