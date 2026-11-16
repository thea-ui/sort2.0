import { useCallback, useState } from 'react';

import { isInstallModeActionable } from './installMode';
import { usePwaInstall } from './PwaInstallContext';

/**
 * Shared trigger for install surfaces: opens the native prompt when available,
 * otherwise the iOS instructions dialog. Components stay presentational.
 */
export function useInstallAction() {
  const { mode, canInstall, promptInstall } = usePwaInstall();
  const [dialogOpen, setDialogOpen] = useState(false);

  const trigger = useCallback(async (): Promise<'prompt' | 'instructions' | 'none'> => {
    if (canInstall) {
      await promptInstall();
      return 'prompt';
    }
    if (isInstallModeActionable(mode)) {
      setDialogOpen(true);
      return 'instructions';
    }
    return 'none';
  }, [canInstall, mode, promptInstall]);

  return {
    mode,
    actionable: isInstallModeActionable(mode),
    trigger,
    dialogOpen,
    closeDialog: useCallback(() => setDialogOpen(false), []),
  };
}
