import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

import { useInstallAction } from '../../pwa/useInstallAction';
import {
  INSTALL_CARD_DISMISSED_EVENT,
  readInstallCardDismissed,
} from '../../pwa/installCardDismissal';
import { InstallInstructionsDialog } from './InstallInstructionsDialog';

interface InstallAppMenuItemProps {
  onAfterClick?: () => void;
  /**
   * Student/teacher shells: the mobile card is the primary entry until it is
   * dismissed; afterwards this menu row becomes the single entry point.
   */
  cardUserId?: string;
  /** Hide on desktop where the sidebar already owns the entry point. */
  hideOnDesktop?: boolean;
}

/**
 * Menu-row install entry used by the student profile menu and the Admin/MRF
 * "More" sheet. The bottom navigation is intentionally untouched.
 */
export const InstallAppMenuItem: React.FC<InstallAppMenuItemProps> = ({
  onAfterClick,
  cardUserId,
  hideOnDesktop = false,
}) => {
  const { actionable, mode, trigger, dialogOpen, closeDialog } = useInstallAction();
  const [cardDismissed, setCardDismissed] = useState(() =>
    cardUserId ? readInstallCardDismissed(cardUserId) : true
  );

  useEffect(() => {
    if (!cardUserId) return;
    setCardDismissed(readInstallCardDismissed(cardUserId));
    const onDismissed = (event: Event) => {
      const detail = (event as CustomEvent<{ userId?: string }>).detail;
      if (!detail?.userId || detail.userId === cardUserId) setCardDismissed(true);
    };
    window.addEventListener(INSTALL_CARD_DISMISSED_EVENT, onDismissed);
    return () => window.removeEventListener(INSTALL_CARD_DISMISSED_EVENT, onDismissed);
  }, [cardUserId]);

  if (!actionable) return null;
  if (cardUserId && !cardDismissed) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          void trigger().then((result) => {
            // Keep the parent menu mounted when the instructions dialog opens
            // from inside it; closing would unmount the dialog immediately.
            if (result !== 'instructions') onAfterClick?.();
          });
        }}
        aria-label="Install SORT app"
        data-testid="install-app-menu-item"
        className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-bold text-[var(--text-strong)] transition-colors hover:bg-[var(--accent)]/5 cursor-pointer ${hideOnDesktop ? 'lg:hidden' : ''}`}
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--accent)]/10 text-[var(--accent)]">
          <Download size={14} />
        </span>
        Install app
      </button>

      <InstallInstructionsDialog open={dialogOpen} onOpenChange={closeDialog} mode={mode} />
    </>
  );
};
