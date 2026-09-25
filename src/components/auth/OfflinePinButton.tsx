import React, { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { OfflinePinModal } from './OfflinePinModal';

/** Icon button that opens the offline PIN setup modal. Self-contained. */
export const OfflinePinButton: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className || 'p-1.5 rounded-lg hover:bg-white text-slate-400 hover:text-slate-700 transition-colors duration-200 cursor-pointer'}
        title="Offline PIN"
        aria-label="Offline PIN"
      >
        <KeyRound className="w-4 h-4" />
      </button>
      <OfflinePinModal open={open} onOpenChange={setOpen} />
    </>
  );
};
