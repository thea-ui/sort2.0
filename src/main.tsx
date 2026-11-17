import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './hooks/useTheme'
import { TextScaleProvider } from './hooks/useTextScale'
import { PwaInstallProvider } from './pwa/PwaInstallProvider'

const rootElement = document.getElementById('root')!;

createRoot(rootElement).render(
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

// Fade out the pre-hydration splash once React has committed its first tree.
// The React LoadingScreen renders the same visuals underneath, so the handoff
// is seamless for every role; the timeout is a safety net if rendering fails.
const bootSplash = document.getElementById('boot-splash');
if (bootSplash) {
  let dismissed = false;
  const dismissSplash = () => {
    if (dismissed) return;
    dismissed = true;
    bootSplash.classList.add('is-hidden');
    window.setTimeout(() => bootSplash.remove(), 400);
  };
  const observer = new MutationObserver(() => {
    if (rootElement.childElementCount > 0) {
      observer.disconnect();
      requestAnimationFrame(() => requestAnimationFrame(dismissSplash));
    }
  });
  observer.observe(rootElement, { childList: true });
  window.setTimeout(() => {
    observer.disconnect();
    dismissSplash();
  }, 10000);
}
