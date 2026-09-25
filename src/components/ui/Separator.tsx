import React from 'react';
import { cn } from '../../utils/cn';

/** Separator (SMART master handoff Part 6 §9): exactly 1px in `border`. */
export const Separator: React.FC<React.ComponentProps<'div'> & { orientation?: 'horizontal' | 'vertical' }> = ({
  className,
  orientation = 'horizontal',
  ...props
}) => (
  <div
    data-slot="separator"
    role="separator"
    aria-orientation={orientation}
    className={cn(
      'shrink-0 bg-border',
      orientation === 'horizontal' ? 'h-px w-full' : 'w-px self-stretch',
      className,
    )}
    {...props}
  />
);
