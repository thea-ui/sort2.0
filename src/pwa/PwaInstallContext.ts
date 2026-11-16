import { createContext, useContext } from 'react';

import type { InstallMode } from './installMode';

export interface PwaInstallContextValue {
  mode: InstallMode;
  canInstall: boolean;
  installed: boolean;
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
}

export const PwaInstallContext = createContext<PwaInstallContextValue | undefined>(undefined);

export function usePwaInstall(): PwaInstallContextValue {
  const context = useContext(PwaInstallContext);
  if (!context) throw new Error('usePwaInstall must be used within PwaInstallProvider');
  return context;
}
