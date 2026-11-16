import React from 'react';

import { useOnlineStatus } from './useOnlineStatus';
import { useSwUpdate } from './useSwUpdate';
import { OfflineBanner } from '../components/pwa/OfflineBanner';
import { PwaUpdatePrompt } from '../components/pwa/PwaUpdatePrompt';

/**
 * Mounted once at the app root: registers the service worker after paint,
 * surfaces the offline notice, and shows the manual update prompt.
 */
export const PwaRuntime: React.FC = () => {
  const online = useOnlineStatus();
  const { needRefresh, refresh, dismiss } = useSwUpdate();

  return (
    <>
      <OfflineBanner offline={!online} />
      <PwaUpdatePrompt open={needRefresh} onRefresh={() => void refresh()} onLater={dismiss} />
    </>
  );
};
