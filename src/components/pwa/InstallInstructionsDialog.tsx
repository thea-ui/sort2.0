import React from 'react';
import { Share, Smartphone } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '../ui/Dialog';
import type { InstallMode } from '../../pwa/installMode';

interface InstallInstructionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: InstallMode;
}

/**
 * iOS has no install prompt API: Add to Home Screen only exists in Safari's
 * Share sheet. Third-party iOS browsers cannot install at all.
 */
export const InstallInstructionsDialog: React.FC<InstallInstructionsDialogProps> = ({
  open,
  onOpenChange,
  mode,
}) => {
  const otherBrowser = mode === 'ios-other-browser';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="install-instructions" className="max-w-md gap-5 p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent)]/10 text-[var(--accent)]">
          <Smartphone size={22} />
        </div>

        <div className="space-y-2">
          <DialogTitle className="text-lg font-bold text-[var(--text-strong)]">
            Add SORT to your Home Screen
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-[var(--text-strong)]/70">
            {otherBrowser
              ? 'iOS only allows Home Screen installs from Safari. Open this page in Safari, then follow the steps below.'
              : 'SORT installs like a native app — no app store required.'}
          </DialogDescription>
        </div>

        <ol className="space-y-3">
          <li className="flex gap-3 text-sm text-[var(--text-strong)]">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/10 text-[11px] font-bold text-[var(--accent)]">
              1
            </span>
            <span className="flex items-center gap-1.5">
              Tap the Share button
              <Share size={15} className="text-[var(--accent)]" aria-hidden="true" />
              in Safari&apos;s toolbar.
            </span>
          </li>
          <li className="flex gap-3 text-sm text-[var(--text-strong)]">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/10 text-[11px] font-bold text-[var(--accent)]">
              2
            </span>
            <span>Scroll down and tap &quot;Add to Home Screen&quot;.</span>
          </li>
          <li className="flex gap-3 text-sm text-[var(--text-strong)]">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/10 text-[11px] font-bold text-[var(--accent)]">
              3
            </span>
            <span>Tap &quot;Add&quot; — SORT appears with your school&apos;s icon.</span>
          </li>
        </ol>

        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="w-full rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[var(--accent-dark)] cursor-pointer"
        >
          Got it
        </button>
      </DialogContent>
    </Dialog>
  );
};
