import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { useToastItems, type ToastKind } from '../../hooks/useToast';

const KIND_ICON: Record<ToastKind, React.ReactNode> = {
  success: <CheckCircle2 size={18} className="text-[var(--accent)] shrink-0" />,
  error: <AlertTriangle size={18} className="text-rose-400 shrink-0" />,
  info: <Info size={18} className="text-sky-400 shrink-0" />,
};

/** Renders the global toast stack; mount once near the app root. */
export const ToastViewport: React.FC = () => {
  const items = useToastItems();

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      aria-live="polite"
      aria-atomic="false"
      className="fixed top-20 right-6 z-[100] flex flex-col gap-2 pointer-events-none"
    >
      {items.map((item) => (
        <div
          key={item.id}
          role="status"
          className="pointer-events-auto flex items-center gap-3 bg-[var(--primary)] text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-[var(--accent)]/40 animate-fade-in max-w-sm"
        >
          {KIND_ICON[item.kind]}
          <span className="text-xs font-bold leading-snug">{item.message}</span>
        </div>
      ))}
    </div>,
    document.body,
  );
};
