import { useEffect, useState } from 'react'
import { api } from '../services/api.js'
export function useApiList(path, params = {}, externalVersion = 0) {
  const key = JSON.stringify(params)
  const [version, setVersion] = useState(0)
  const [state, setState] = useState({ data: [], pagination: { total: 0, page: 1, pageSize: 20 }, loading: true, error: '' })
  useEffect(() => {
    const controller = new AbortController()
    setState(previous => ({ ...previous, loading: true, error: '' }))
    api(path, { params: JSON.parse(key), signal: controller.signal }).then(result => {
      if (!controller.signal.aborted) setState({ ...result, loading: false, error: '' })
    }).catch(error => {
      if (!controller.signal.aborted) setState({ data: [], pagination: { total: 0, page: 1, pageSize: 20 }, loading: false, error: error.message })
    })
    return () => controller.abort()
  }, [path, key, version, externalVersion])
  return { ...state, reload: () => setVersion(value => value + 1) }
}
