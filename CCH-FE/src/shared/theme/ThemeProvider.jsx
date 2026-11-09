import { useCallback, useEffect, useState } from 'react'
import { ThemeContext } from './ThemeContext.js'

const THEME_STORAGE_KEY = 'cch_theme_preference'
const VALID_THEMES = ['light', 'dark', 'system']

function getIsSystemDark() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function getStoredTheme() {
  if (typeof window === 'undefined') return 'system'
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (stored && VALID_THEMES.includes(stored)) {
      return stored
    }
  } catch {
    // LocalStorage fallback
  }
  return 'system'
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getStoredTheme)
  const [isSystemDark, setIsSystemDark] = useState(getIsSystemDark)

  // Derived resolved theme
  const resolvedTheme = theme === 'system' ? (isSystemDark ? 'dark' : 'light') : theme

  // Synchronize DOM with resolved theme
  useEffect(() => {
    const root = document.documentElement
    if (resolvedTheme === 'dark') {
      root.classList.add('dark')
      root.setAttribute('data-theme', 'dark')
      root.style.colorScheme = 'dark'
    } else {
      root.classList.remove('dark')
      root.setAttribute('data-theme', 'light')
      root.style.colorScheme = 'light'
    }
  }, [resolvedTheme])

  // Listen to system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e) => {
      setIsSystemDark(e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  // Update theme preference
  const setTheme = useCallback((newTheme) => {
    if (!VALID_THEMES.includes(newTheme)) return
    setThemeState(newTheme)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme)
    } catch {
      // LocalStorage fallback
    }
  }, [])

  // Toggle between themes (light -> dark -> system -> light)
  const toggleTheme = useCallback(() => {
    const sequence = ['light', 'dark', 'system']
    const nextIndex = (sequence.indexOf(theme) + 1) % sequence.length
    setTheme(sequence[nextIndex])
  }, [theme, setTheme])

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
