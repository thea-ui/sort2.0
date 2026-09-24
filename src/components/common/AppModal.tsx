import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { ModalPortal } from './ModalPortal';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

const SIZE_CLASS: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
};

interface AppModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  icon?: React.ReactNode;
  title: string;
  description?: string;
  size?: ModalSize;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  confirmDisabled?: boolean;
  destructive?: boolean;
  loading?: boolean;
  hideFooter?: boolean;
  children?: React.ReactNode;
}

const FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Canonical modal shell (SMART `AppModal` language, SORT tokens): portaled,
 * ESC + backdrop close, basic focus trap, sizes sm–xl, destructive variant.
 */
export const AppModal: React.FC<AppModalProps> = ({
  open,
  onOpenChange,
  icon,
  title,
  description,
  size = 'md',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  confirmDisabled = false,
  destructive = false,
  loading = false,
  hideFooter = false,
  children,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onOpenChange(false);
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusables = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div
          className="absolute inset-0 bg-[var(--primary)]/40 backdrop-blur-sm"
          onClick={() => onOpenChange(false)}
          aria-hidden="true"
        />
        <div
          ref={panelRef}
          tabIndex={-1}
          className={`relative w-full ${SIZE_CLASS[size]} max-h-[90vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-white/80 overflow-hidden animate-scale-up outline-none`}
        >
          <div className="flex items-start gap-3 px-6 pt-5 pb-4 border-b border-[var(--primary)]/5">
            {icon && (
              <div
                className={`p-2.5 rounded-xl shrink-0 ${
                  destructive
                    ? 'bg-rose-50 text-rose-600'
                    : 'bg-[var(--accent)]/10 text-[var(--accent)]'
                }`}
              >
                {icon}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-[var(--text-strong)]">{title}</h3>
              {description && (
                <p className="text-xs text-[var(--text-strong)]/50 mt-0.5">{description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label="Close"
              className="p-2 -m-1 rounded-xl text-[var(--text-strong)]/40 hover:text-[var(--text-strong)] hover:bg-[var(--primary)]/5 cursor-pointer transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="px-6 py-5 overflow-y-auto">{children}</div>

          {!hideFooter && (
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[var(--primary)]/5 bg-[var(--primary)]/5">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="px-4 py-2 rounded-xl bg-white border border-[var(--primary)]/10 hover:bg-[var(--primary)]/5 text-xs font-bold text-[var(--text-strong)] cursor-pointer transition-colors"
              >
                {cancelLabel}
              </button>
              {onConfirm && (
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={confirmDisabled || loading}
                  className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors flex items-center gap-1.5 ${
                    destructive
                      ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-200'
                      : 'bg-[var(--accent)] hover:bg-[var(--accent-dark)] shadow-[var(--accent)]/20'
                  }`}
                >
                  {loading && (
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  )}
                  {confirmLabel}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </ModalPortal>
  );
};
