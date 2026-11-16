import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { resolveInstallMode } from './installMode';
import { PwaInstallContext, type PwaInstallContextValue } from './PwaInstallContext';

/**
 * One source of truth for install state across every role shell.
 *
 * The inline script in index.html captures `beforeinstallprompt` as early as
 * possible; this provider also listens for events fired after boot and after
 * React mounts. Nothing here can throw into the app tree.
 */

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return (
      window.matchMedia?.('(display-mode: standalone)').matches === true ||
      navigator.standalone === true
    );
  } catch {
    return false;
  }
}

function readEarlyEvent(): BeforeInstallPromptEvent | null {
  if (typeof window === 'undefined') return null;
  return window.__sortPwaInstallEvent ?? null;
}

export const PwaInstallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(() => readEarlyEvent());
  const [installed, setInstalled] = useState(() => isStandalone());
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      const prompt = event as BeforeInstallPromptEvent;
      try {
        prompt.preventDefault?.();
      } catch {
        // Some browsers expose similar events without preventDefault.
      }
      setPromptEvent(prompt);
      setDismissed(false);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
      setDismissed(false);
    };
    const onEarlyCapture = () => {
      const early = readEarlyEvent();
      if (early) {
        setPromptEvent(early);
        setDismissed(false);
      }
    };

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    window.addEventListener('sort:pwa-install-available', onEarlyCapture);
    window.addEventListener('sort:pwa-installed', onInstalled);

    // The event can land between the inline capture and this mount.
    setPromptEvent(readEarlyEvent());
    setInstalled(isStandalone());

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      window.removeEventListener('sort:pwa-install-available', onEarlyCapture);
      window.removeEventListener('sort:pwa-installed', onInstalled);
    };
  }, []);

  const mode = useMemo(
    () =>
      resolveInstallMode({
        standalone: installed,
        hasPrompt: Boolean(promptEvent) && !dismissed,
        userAgent: typeof navigator === 'undefined' ? '' : navigator.userAgent,
        platform: typeof navigator === 'undefined' ? undefined : navigator.platform,
        maxTouchPoints: typeof navigator === 'undefined' ? 0 : navigator.maxTouchPoints,
      }),
    [installed, promptEvent, dismissed]
  );

  const promptInstall = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!promptEvent || installed || dismissed) return 'unavailable';
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === 'accepted') {
        setInstalled(true);
        setPromptEvent(null);
        return 'accepted';
      }
      setDismissed(true);
      return 'dismissed';
    } catch {
      setDismissed(true);
      return 'unavailable';
    }
  }, [promptEvent, installed, dismissed]);

  const value = useMemo<PwaInstallContextValue>(
    () => ({
      mode,
      canInstall: mode === 'prompt',
      installed: mode === 'installed',
      promptInstall,
    }),
    [mode, promptInstall]
  );

  return <PwaInstallContext.Provider value={value}>{children}</PwaInstallContext.Provider>;
};
