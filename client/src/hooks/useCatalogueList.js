import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  catalogueApiParams,
  parseCatalogueQuery,
  setCatalogueQueryValue,
} from '../utils/catalogueQuery.js'

export default function useCatalogueList({ definition, load, pageSize = 9 }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const latestParams = useRef(searchParams)
  const parsed = useMemo(
    () => parseCatalogueQuery(searchParams, definition),
    [definition, searchParams],
  )
  const [searchInput, setSearchInput] = useState(parsed.values.search || '')
  const [retryKey, setRetryKey] = useState(0)
  const [state, setState] = useState({ status: 'loading', items: [], pagination: null })
  const normalizedQuery = parsed.normalized.toString()

  useEffect(() => { latestParams.current = searchParams }, [searchParams])

  useEffect(() => {
    if (searchParams.toString() !== normalizedQuery) {
      setSearchParams(parsed.normalized, { replace: true })
    }
  }, [normalizedQuery, parsed.normalized, searchParams, setSearchParams])

  useEffect(() => {
    setSearchInput(parsed.values.search || '')
  }, [parsed.values.search])

  const setQueryValue = useCallback((key, value, options = {}) => {
    const next = setCatalogueQueryValue(
      latestParams.current,
      definition,
      key,
      value,
      options.resetPage !== false,
    )
    latestParams.current = next
    setSearchParams(next, { replace: options.replace === true })
  }, [definition, setSearchParams])

  useEffect(() => {
    const trimmed = searchInput.trim()
    if (trimmed === (parsed.values.search || '')) return undefined
    const timer = window.setTimeout(() => {
      setQueryValue('search', trimmed)
    }, 350)
    return () => window.clearTimeout(timer)
  }, [parsed.values.search, searchInput, setQueryValue])

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    setState({ status: 'loading', items: [], pagination: null })

    load(catalogueApiParams(parsed.values, definition, pageSize), controller.signal)
      .then((result) => {
        if (!active) return
        const maximumPage = Math.max(1, result.pagination.totalPages)
        if (parsed.values.page > maximumPage) {
          setQueryValue('page', maximumPage, { resetPage: false, replace: true })
          return
        }
        setState({ status: 'ready', items: result.items, pagination: result.pagination })
      })
      .catch((error) => {
        if (!active || error.name === 'CanceledError') return
        setState({ status: 'error', items: [], pagination: null })
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [definition, load, pageSize, parsed.values, retryKey, setQueryValue])

  const clearFilters = useCallback(() => {
    setSearchInput('')
    const empty = new URLSearchParams()
    latestParams.current = empty
    setSearchParams(empty)
  }, [setSearchParams])

  return {
    query: parsed.values,
    normalizedParams: parsed.normalized,
    searchInput,
    setSearchInput,
    setQueryValue,
    clearFilters,
    retry: () => setRetryKey((value) => value + 1),
    ...state,
  }
}
