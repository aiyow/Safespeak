import axios from 'axios'

const client = axios.create({ baseURL: '/api/v1/auth' })

async function request(url, { method = 'GET', data, signal } = {}) {
  let response
  try {
    response = await client.request({ url, method, data, signal })
  } catch (error) {
    if (axios.isCancel(error)) throw error
    if (!axios.isAxiosError(error)) throw error

    const { response } = error
    const message = response
      ? response.data?.message || 'SafeSpeak could not complete this request. Try again.'
      : 'Could not reach SafeSpeak. Check your connection and try again.'
    const failure = new Error(message)
    failure.status = response?.status
    throw failure
  }

  if (response.status === 204) return null
  if (!response.data || typeof response.data !== 'object') {
    throw new Error('SafeSpeak returned an unexpected response. Try again.')
  }
  return response.data
}

export const auth = {
  registration: signal => request('/registration', { signal }),
  register: data => request('/register', { method: 'POST', data }),
  login: data => request('/login', { method: 'POST', data }),
  me: signal => request('/me', { signal }),
  logout: () => request('/logout', { method: 'POST' }),
}
