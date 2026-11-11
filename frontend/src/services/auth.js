async function request(path, { method = 'GET', body, signal } = {}) {
  let response
  try {
    response = await fetch('/api/v1/auth' + path, {
      method,
      signal,
      credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new Error('Could not reach SafeSpeak. Check your connection and try again.')
  }

  if (response.status === 204) return null
  const data = await response.json().catch(() => null)
  if (!response.ok || !data) {
    const error = new Error(data?.message || 'SafeSpeak could not complete this request. Try again.')
    error.status = response.status
    throw error
  }
  return data
}

export const auth = {
  registration: signal => request('/registration', { signal }),
  register: body => request('/register', { method: 'POST', body }),
  login: body => request('/login', { method: 'POST', body }),
  me: signal => request('/me', { signal }),
  logout: () => request('/logout', { method: 'POST' }),
}
