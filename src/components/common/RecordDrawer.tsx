import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { cn } from '../../utils/cn';
import { useBackgroundScrollLock } from '../ui/Dialog';

export interface VaultTab {
  key: string;
  label: string;
  icon: LucideIcon;
  count?: number;
}

interface RecordDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  meta: string;
  statusLabel?: string;
  tabs: VaultTab[];
  activeTab: string;
  onTabChange: (key: string) => void;
  loading?: boolean;
  children: React.ReactNode;
}

/**
 * Wide multi-tab "records vault" drawer (SMART master handoff Part 3 §6.2):
 * up to 1100px, portaled to body at `z-[60]`, fixed header with a 36px tab
 * strip (2px primary active underline), independently scrolling body, 200ms
 * slide-in-from-right-2 entrance.
 */
export const RecordDrawer: React.FC<RecordDrawerProps> = ({
  open,
  onClose,
  title,
  meta,
  statusLabel,
  tabs,
  activeTab,
  onTabChange,
  loading = false,
  children,
}) => {
  useBackgroundScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex justify-end print-hide"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />

      <div className="relative h-full w-full max-w-[1100px] bg-background shadow-2xl flex flex-col animate-vault-in">
        <header className="px-4 lg:px-6 pt-4 pb-0 border-b border-border">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-bold tracking-tight text-foreground truncate">{title}</h2>
              <p className="text-xs text-muted-foreground truncate">{meta}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {statusLabel && (
                <Badge variant="outline" className="text-[11px] font-medium">
                  {statusLabel}
                </Badge>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <nav className="flex items-center gap-1 mt-3 -mb-px overflow-x-auto" aria-label="Sections">
            {tabs.map(({ key, label, icon: Icon, count }) => {
              const isActive = activeTab === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onTabChange(key)}
                  aria-current={isActive ? 'true' : undefined}
                  className={cn(
                    'flex items-center gap-1.5 px-3 h-9 rounded-t-lg text-xs font-medium whitespace-nowrap border-b-2 transition-colors cursor-pointer',
                    isActive
                      ? 'border-primary text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                  {count !== undefined && (
                    <span className="px-1.5 py-0.5 text-[10px] rounded-full font-semibold bg-muted text-muted-foreground tabular-nums">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-24 text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading…
            </div>
          ) : (
            children
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};
