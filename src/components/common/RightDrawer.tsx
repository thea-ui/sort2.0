import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../utils/cn';
import { useBackgroundScrollLock } from '../ui/Dialog';

interface RightDrawerProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

/**
 * Standard right-side sheet (SMART master handoff Part 3 §6.1): 440px max
 * width, left border, shadow-2xl, 200ms slide + 200ms overlay fade. Always
 * mounted so both directions animate; `pointer-events-none` + `aria-hidden`
 * while closed.
 *
 * Portaled to <body> at `z-[60]`: the page content area sits inside an
 * `animate-fade-in` transform stacking context, so an in-place overlay would
 * paint below the sticky shell header (see ModalPortal).
 */
export const RightDrawer: React.FC<RightDrawerProps> = ({ open, onClose, children, className }) => {
  useBackgroundScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  return createPortal(
    <div
      className={cn('fixed inset-0 z-[60] print-hide', !open && 'pointer-events-none')}
      aria-hidden={!open}
    >
      <div
        className={cn(
          'absolute inset-0 bg-black/40 transition-opacity duration-200',
          open ? 'opacity-100' : 'opacity-0',
        )}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal={open || undefined}
        className={cn(
          'absolute inset-y-0 right-0 w-full sm:max-w-[440px] bg-background border-l border-border shadow-2xl flex flex-col transition-transform duration-200',
          open ? 'translate-x-0' : 'translate-x-full',
          className,
        )}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
};
