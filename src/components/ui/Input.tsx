import React from 'react';
import { cn } from '../../utils/cn';

/** Text input primitive (SMART master handoff Part 5 §4). */
export const Input: React.FC<React.ComponentProps<'input'>> = ({ className, type, ...props }) => (
  <input
    type={type}
    data-slot="input"
    className={cn(
      'h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm',
      className,
    )}
    {...props}
  />
);
