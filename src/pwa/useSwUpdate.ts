import { useCallback, useEffect, useRef, useState } from 'react';

import { registerServiceWorker } from './registerServiceWorker';

/**
 * Update flow contract: the new worker waits until the user clicks Refresh.
 * Nothing here reloads the page on its own.
 */
export function useSwUpdate(): {
  needRefresh: boolean;
  refresh: () => Promise<void>;
  dismiss: () => void;
} {
  const [needRefresh, setNeedRefresh] = useState(false);
  const updateRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    const stop = registerServiceWorker({
      onNeedRefresh: () => setNeedRefresh(true),
      onUpdate: (update) => {
        updateRef.current = update;
      },
    });
    return () => {
      stop();
      updateRef.current = null;
    };
  }, []);

  const refresh = useCallback(async () => {
    const update = updateRef.current;
    if (!update) {
      window.location.reload();
      return;
    }
    setNeedRefresh(false);
    await update();
  }, []);

  const dismiss = useCallback(() => setNeedRefresh(false), []);

  return { needRefresh, refresh, dismiss };
}
