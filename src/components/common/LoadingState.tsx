import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  label?: string;
  className?: string;
}

/**
 * Inline section loader (SMART master handoff Part 4 §7): 16px `Loader2`
 * beside the message, centered with 96px vertical padding. Table loading uses
 * skeleton rows instead, and the auth/session gate uses the full-page ring.
 */
export const LoadingState: React.FC<LoadingStateProps> = ({
  label = 'Loading…',
  className = '',
}) => (
  <div
    className={`flex items-center justify-center gap-2 py-24 text-muted-foreground text-sm ${className}`}
    role="status"
    aria-live="polite"
  >
    <Loader2 className="w-4 h-4 animate-spin" />
    <span>{label}</span>
  </div>
);
