import { useCallback, useEffect, useReducer, useRef } from 'react'

const initialState = { data: null, loading: true, error: '' }

function reducer(state, action) {
  switch (action.type) {
    case 'loading':
      return { ...state, loading: true, error: '' }
    case 'success':
      return { data: action.data, loading: false, error: '' }
    case 'error':
      return { data: null, loading: false, error: action.error }
    default:
      return state
  }
}

/**
 * Loader hook for API-backed pages.
 *
 * Runs the loader on mount and whenever `deps` change, then exposes
 * `{ data, loading, error, refresh }`. The newest loader is kept in a ref so
 * callers can pass an inline closure without re-triggering the effect on every
 * render; only `deps` control refetching.
 */
export function useWorkspaceApi(loader, deps = []) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const loaderRef = useRef(loader)

  useEffect(() => {
    loaderRef.current = loader
  })

  const run = useCallback(() => {
    let cancelled = false
    dispatch({ type: 'loading' })
    Promise.resolve(loaderRef.current())
      .then((data) => {
        if (!cancelled) dispatch({ type: 'success', data })
      })
      .catch((error) => {
        if (!cancelled) dispatch({ type: 'error', error: error.message || 'Gagal memuat data.' })
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const cancel = run()
    return cancel
    // deps intentionally drive refetch; loader identity must not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { ...state, refresh: run }
}