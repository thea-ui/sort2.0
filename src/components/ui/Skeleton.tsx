import React from 'react';
import { cn } from '../../utils/cn';

/** Skeleton placeholder (SMART master handoff Part 2 §5 / Part 6). */
export const Skeleton: React.FC<React.ComponentProps<'div'>> = ({ className, ...props }) => (
  <div data-slot="skeleton" className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />
);
