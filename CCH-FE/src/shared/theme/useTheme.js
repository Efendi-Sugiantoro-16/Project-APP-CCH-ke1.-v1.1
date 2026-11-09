import { useContext } from 'react'
import { ThemeContext } from './ThemeContext.js'

/**
 * Hook to access current theme state and controls
 * @returns {{ theme: 'light'|'dark'|'system', resolvedTheme: 'light'|'dark', setTheme: (theme: string) => void, toggleTheme: () => void }}
 */
export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
