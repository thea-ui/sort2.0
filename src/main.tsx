import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './hooks/useTheme'
import { TextScaleProvider } from './hooks/useTextScale'
import { PwaInstallProvider } from './pwa/PwaInstallProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <TextScaleProvider>
        <PwaInstallProvider>
          <App />
        </PwaInstallProvider>
      </TextScaleProvider>
    </ThemeProvider>
  </StrictMode>,
)
