import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { AppRoutes } from './routes.jsx'
import { statsApi } from '../features/stats/api/statsApi.js'

function App() {
  useEffect(() => {
    statsApi.recordHit()
  }, [])

  return <RouterProvider router={AppRoutes} />
}

export default App

