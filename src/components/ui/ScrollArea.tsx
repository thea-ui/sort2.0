import React from 'react';
import { cn } from '../../utils/cn';

/**
 * ScrollArea (SMART master handoff Part 6 §9): 10px track with a rounded
 * `border`-colored thumb. Implemented with the `.smart-scrollbar` utility
 * (native scrolling, no JS scrollbar emulation).
 */
export const ScrollArea: React.FC<React.ComponentProps<'div'>> = ({ className, ...props }) => (
  <div data-slot="scroll-area" className={cn('relative overflow-y-auto smart-scrollbar', className)} {...props} />
);
