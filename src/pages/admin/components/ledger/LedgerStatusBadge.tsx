import React from 'react';
import { ledgerStatusClass } from './ledgerFormatters';

export const LedgerStatusBadge: React.FC<{ status: string }> = ({ status }) => (
  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${ledgerStatusClass(status)}`}>
    {status}
  </span>
);
