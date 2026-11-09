import { useCallback, useMemo, useState } from 'react'
import { AuthContext } from './auth-context.js'

const STAFF_TOKEN_KEY = 'cch_staff_token'
const STAFF_USER_KEY = 'cch_staff_user'

function readStoredToken() {
  try {
    return window.sessionStorage.getItem(STAFF_TOKEN_KEY) || ''
  } catch {
    return ''
  }
}

function readStoredUser() {
  try {
    const raw = window.sessionStorage.getItem(STAFF_USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(readStoredToken)
  const [user, setUser] = useState(readStoredUser)

  const login = useCallback((nextToken, nextUser = null) => {
    try {
      window.sessionStorage.setItem(STAFF_TOKEN_KEY, nextToken)
      if (nextUser) {
        window.sessionStorage.setItem(STAFF_USER_KEY, JSON.stringify(nextUser))
      }
    } catch {
      // Storage can be unavailable; the in-memory session still works.
    }
    setToken(nextToken)
    setUser(nextUser)
  }, [])

  const logout = useCallback(() => {
    try {
      window.sessionStorage.removeItem(STAFF_TOKEN_KEY)
      window.sessionStorage.removeItem(STAFF_USER_KEY)
    } catch {
      // Ignore storage failures; the in-memory session is cleared below.
    }
    setToken('')
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ token, user, isAuthenticated: Boolean(token), login, logout }),
    [token, user, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}