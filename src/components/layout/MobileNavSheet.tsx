import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface MobileNavSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/**
 * Mobile "More" navigation as a native-style bottom sheet: slides up from the
 * bottom edge, scrolls internally, dismissed via the backdrop or the close
 * button (gesture navigation stays out of the way).
 */
export const MobileNavSheet: React.FC<MobileNavSheetProps> = ({ open, onClose, title, children, footer }) => {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="md:hidden fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-xs" onClick={onClose} />

      <div
        data-testid="mobile-nav-sheet"
        className="absolute inset-x-0 bottom-0 max-h-[85vh] bg-white rounded-t-3xl shadow-2xl flex flex-col animate-sheet-up"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 shrink-0">
          <span className="h-1.5 w-10 rounded-full bg-gray-300" aria-hidden="true" />
        </div>

        <div className="flex items-center justify-between px-5 pt-3 pb-3 border-b border-gray-100 shrink-0">
          <span className="text-[10px] font-black text-[var(--text-strong)]/40 tracking-widest uppercase">{title}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="p-1.5 rounded-lg text-gray-400 hover:text-[var(--text-strong)] hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-4">{children}</nav>

        {footer && (
          <div className="px-3 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-2 border-t border-gray-100 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
