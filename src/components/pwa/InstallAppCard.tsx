import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

import { useInstallAction } from '../../pwa/useInstallAction';
import {
  INSTALL_CARD_DISMISSED_EVENT,
  readInstallCardDismissed,
  setInstallCardDismissed,
} from '../../pwa/installCardDismissal';
import { InstallInstructionsDialog } from './InstallInstructionsDialog';

interface InstallAppCardProps {
  userId: string;
}

/**
 * Phone-first discoverability for students and teachers. Once dismissed, the
 * permanent profile-menu row becomes the single install entry point.
 */
export const InstallAppCard: React.FC<InstallAppCardProps> = ({ userId }) => {
  const { actionable, mode, trigger, dialogOpen, closeDialog } = useInstallAction();
  const [dismissed, setDismissed] = useState(() => readInstallCardDismissed(userId));

  useEffect(() => {
    setDismissed(readInstallCardDismissed(userId));
    const onDismissed = (event: Event) => {
      const detail = (event as CustomEvent<{ userId?: string }>).detail;
      if (!detail?.userId || detail.userId === userId) setDismissed(true);
    };
    window.addEventListener(INSTALL_CARD_DISMISSED_EVENT, onDismissed);
    return () => window.removeEventListener(INSTALL_CARD_DISMISSED_EVENT, onDismissed);
  }, [userId]);

  if (!actionable || dismissed) return null;

  return (
    <>
      <div
        data-testid="install-app-card"
        className="mb-4 flex items-start gap-3 rounded-2xl border border-[var(--accent)]/20 bg-[var(--accent)]/5 p-4 lg:hidden"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]">
          <Download size={18} />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-[var(--text-strong)]">Install SORT</p>
          <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-strong)]/60">
            Add SORT to your home screen for faster reporting.
          </p>
          <button
            type="button"
            onClick={() => void trigger()}
            className="mt-2.5 rounded-xl bg-[var(--accent)] px-3.5 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[var(--accent-dark)] cursor-pointer"
          >
            Install app
          </button>
        </div>

        <button
          type="button"
          onClick={() => setInstallCardDismissed(userId)}
          aria-label="Dismiss install suggestion"
          className="rounded-lg p-1 text-[var(--text-strong)]/40 transition-colors hover:bg-white hover:text-[var(--text-strong)] cursor-pointer"
        >
          <X size={15} />
        </button>
      </div>

      <InstallInstructionsDialog open={dialogOpen} onOpenChange={closeDialog} mode={mode} />
    </>
  );
};
