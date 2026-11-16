import React from 'react';
import { Download } from 'lucide-react';

import { useInstallAction } from '../../pwa/useInstallAction';
import { InstallInstructionsDialog } from './InstallInstructionsDialog';

interface InstallAppButtonProps {
  collapsed?: boolean;
  className?: string;
}

/**
 * Sidebar install control for every role shell. The full variant shows a
 * label; the collapsed rail variant is a labelled icon button.
 */
export const InstallAppButton: React.FC<InstallAppButtonProps> = ({ collapsed = false, className = '' }) => {
  const { actionable, mode, trigger, dialogOpen, closeDialog } = useInstallAction();

  if (!actionable) return null;

  return (
    <>
      {collapsed ? (
        <button
          type="button"
          onClick={() => void trigger()}
          aria-label="Install SORT app"
          title="Install SORT app"
          data-testid="install-app-sidebar"
          className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full text-[var(--text-strong)]/70 transition-colors hover:bg-[var(--accent)]/10 hover:text-[var(--accent)] cursor-pointer ${className}`}
        >
          <Download size={18} />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => void trigger()}
          aria-label="Install SORT app"
          data-testid="install-app-sidebar"
          className={`flex w-full items-center gap-2.5 rounded-xl border border-[#00271D]/10 bg-white/70 px-3 py-2 text-xs font-bold text-[var(--text-strong)] transition-colors hover:border-[var(--accent)]/40 hover:bg-[var(--accent)]/5 cursor-pointer ${className}`}
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)]/10 text-[var(--accent)]">
            <Download size={14} />
          </span>
          <span className="truncate">Install app</span>
        </button>
      )}

      <InstallInstructionsDialog open={dialogOpen} onOpenChange={closeDialog} mode={mode} />
    </>
  );
};
