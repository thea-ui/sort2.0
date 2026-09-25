import React, { createContext, useContext, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';
import { ModalPortal } from '../common/ModalPortal';

/**
 * Standard dialog primitive (SMART master handoff Part 3 §4).
 * Centered, portaled to body, Escape + backdrop close, focus trapped and
 * background scroll locked. Open motion is the reference 100ms fade +
 * zoom-from-95%; closing unmounts immediately (no exit animation).
 *
 * Overlay tone: `bg-black/10` for standard dialogs (default) — app modals pass
 * `bg-black/40` per Part 3 §1.1.
 */

interface DialogContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DialogContext = createContext<DialogContextValue | undefined>(undefined);

function useDialog(component: string): DialogContextValue {
  const context = useContext(DialogContext);
  if (!context) throw new Error(`${component} must be used within <Dialog>`);
  return context;
}

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, children }) => (
  <DialogContext.Provider value={{ open, onOpenChange }}>{children}</DialogContext.Provider>
);

const FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/** Background scroll lock shared by every open dialog (reference-counted). */
let scrollLocks = 0;

function lockBackgroundScroll(locked: boolean) {
  if (typeof document === 'undefined') return;
  scrollLocks = Math.max(0, scrollLocks + (locked ? 1 : -1));
  if (scrollLocks > 0) {
    document.documentElement.setAttribute('data-modal-open', '');
  } else {
    document.documentElement.removeAttribute('data-modal-open');
  }
}

export function useBackgroundScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    lockBackgroundScroll(true);
    return () => lockBackgroundScroll(false);
  }, [active]);
}

export interface DialogContentProps extends React.ComponentProps<'div'> {
  showCloseButton?: boolean;
  /** Overlay tint: standard dialogs are `bg-black/10`, app modals `bg-black/40`. */
  overlayClassName?: string;
}

export const DialogContent: React.FC<DialogContentProps> = ({
  className,
  overlayClassName,
  showCloseButton = true,
  children,
  ...props
}) => {
  const { open, onOpenChange } = useDialog('DialogContent');
  const panelRef = useRef<HTMLDivElement>(null);
  useBackgroundScrollLock(open);

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
        data-slot="dialog-overlay"
        aria-hidden="true"
        onClick={() => onOpenChange(false)}
        className={cn(
          'fixed inset-0 isolate z-50 bg-black/10 duration-100 animate-overlay-in supports-[backdrop-filter]:backdrop-blur-xs print-hide',
          overlayClassName,
        )}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        data-slot="dialog-content"
        className={cn(
          'fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-popover p-4 text-sm text-popover-foreground ring-1 ring-foreground/10 duration-100 outline-none sm:max-w-sm animate-dialog-in print-hide',
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            data-slot="dialog-close"
            className="absolute top-2 right-2 inline-flex size-7 items-center justify-center rounded-lg text-foreground/70 transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 cursor-pointer"
          >
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </button>
        )}
      </div>
    </ModalPortal>
  );
};

export const DialogHeader: React.FC<React.ComponentProps<'div'>> = ({ className, ...props }) => (
  <div data-slot="dialog-header" className={cn('flex flex-col gap-2', className)} {...props} />
);

export const DialogTitle: React.FC<React.ComponentProps<'h2'>> = ({ className, ...props }) => (
  <h2
    data-slot="dialog-title"
    className={cn('text-base leading-none font-medium', className)}
    {...props}
  />
);

export const DialogDescription: React.FC<React.ComponentProps<'p'>> = ({ className, ...props }) => (
  <p
    data-slot="dialog-description"
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
);

export const DialogFooter: React.FC<React.ComponentProps<'div'>> = ({ className, ...props }) => (
  <div
    data-slot="dialog-footer"
    className={cn(
      '-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-4 sm:flex-row sm:justify-end',
      className,
    )}
    {...props}
  />
);
