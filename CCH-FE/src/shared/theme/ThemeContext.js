import { createContext } from 'react'

/**
 * Context for managing app theme: 'light' | 'dark' | 'system'
 */
export const ThemeContext = createContext({
  theme: 'system',
  resolvedTheme: 'light',
  setTheme: () => {},
  toggleTheme: () => {},
})
