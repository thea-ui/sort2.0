import React from 'react';
import { cn } from '../../utils/cn';

/** Multi-line text primitive (SMART master handoff Part 5 §4). */
export const Textarea: React.FC<React.ComponentProps<'textarea'>> = ({ className, ...props }) => (
  <textarea
    data-slot="textarea"
    className={cn(
      'flex min-h-16 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm',
      className,
    )}
    {...props}
  />
);
