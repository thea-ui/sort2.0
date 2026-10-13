import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { useToastItems, type ToastKind } from '../../hooks/useToast';
import { cn } from '../../utils/cn';

/**
 * Global toast stack (SMART master handoff Part 4 §5): mounted once at the app
 * root, top-right, rich-colored per kind. All feedback routes through the
 * `toast` wrapper — components never call this viewport directly.
 */

const KIND_ICON: Record<ToastKind, typeof Info> = {
  success: CheckCircle2,
  error: AlertTriangle,
  warning: AlertTriangle,
  info: Info,
};

const KIND_STYLE: Record<ToastKind, string> = {
  success: 'bg-white border-primary/30 text-primary',
  error: 'bg-white border-destructive/30 text-destructive',
  warning: 'bg-amber-50 border-amber-300 text-amber-800',
  info: 'bg-blue-50 border-blue-300 text-blue-800',
};

export const ToastViewport: React.FC = () => {
  const items = useToastItems();

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      aria-live="polite"
      aria-atomic="false"
      className="fixed top-20 right-4 z-[200] flex flex-col gap-2 pointer-events-none print-hide"
    >
      {items.map((item) => {
        const Icon = KIND_ICON[item.kind];
        return (
          <div
            key={item.id}
            role="status"
            className={cn(
              'pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border shadow-xl max-w-sm animate-fade-in',
              KIND_STYLE[item.kind],
            )}
          >
            <Icon size={18} className="shrink-0 mt-0.5" />
            <span className="text-sm font-medium leading-snug">{item.message}</span>
          </div>
        );
      })}
    </div>,
    document.body,
  );
};
