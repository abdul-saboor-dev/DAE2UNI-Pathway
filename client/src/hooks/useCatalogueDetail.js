import { useEffect, useState } from 'react'
import { isApiError } from '../utils/apiErrors.js'

export default function useCatalogueDetail(load, identifier) {
  const [retryKey, setRetryKey] = useState(0)
  const [state, setState] = useState({ status: 'loading', item: null })

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    setState({ status: 'loading', item: null })

    load(identifier, controller.signal)
      .then((item) => {
        if (active) setState({ status: 'ready', item })
      })
      .catch((error) => {
        if (!active || error.name === 'CanceledError') return
        const notFound = isApiError(error, 404) || isApiError(error, 400, 'REQUEST_VALIDATION_ERROR')
        setState({ status: notFound ? 'not-found' : 'error', item: null })
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [identifier, load, retryKey])

  return { ...state, retry: () => setRetryKey((value) => value + 1) }
}
