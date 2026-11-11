import axios from 'axios'
const client = axios.create({ baseURL: '/api/v1' })
export async function api(path, { method = 'GET', data, params, signal } = {}) {
  try { const response = await client.request({ url: path, method, data, params, signal }); return response.status === 204 ? null : response.data }
  catch (error) {
    if (axios.isCancel(error)) throw error
    const failure = new Error(error.response?.data?.message || 'Could not reach SafeSpeak. Please try again.')
    failure.status = error.response?.status
    throw failure
  }
}
