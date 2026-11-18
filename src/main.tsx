import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppRouter from './AppRouter'
import { setupRegionalApiInterceptor } from './services/apiClient'

// Initialize regional jurisdiction header interceptor
setupRegionalApiInterceptor()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppRouter />
  </StrictMode>,
)

