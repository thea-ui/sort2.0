import React from 'react';
import { cn } from '../../utils/cn';

/**
 * Card family (SMART master handoff Part 6 §3): 16.8px-class radius, 1px
 * border, layered soft shadow, zero vertical padding; headers sit on a muted/50
 * band with a 1px bottom border.
 */

export const CARD_SHADOW =
  'shadow-[0_2px_8px_-3px_rgba(0,0,0,0.06),0_10px_22px_-6px_rgba(0,0,0,0.04)]';

export const Card: React.FC<React.ComponentProps<'div'> & { size?: 'default' | 'sm' }> = ({
  className,
  size = 'default',
  ...props
}) => (
  <div
    data-slot="card"
    data-size={size}
    className={cn(
      'group/card flex flex-col overflow-hidden rounded-xl bg-card text-sm text-card-foreground border border-border py-0 gap-0 transition-shadow duration-200',
      CARD_SHADOW,
      'has-data-[slot=card-footer]:pb-0',
      'data-[size=sm]:gap-0 data-[size=sm]:py-0',
      className,
    )}
    {...props}
  />
);

export const CardHeader: React.FC<React.ComponentProps<'div'>> = ({ className, ...props }) => (
  <div
    data-slot="card-header"
    className={cn(
      'group/card-header grid auto-rows-min items-start gap-1 rounded-t-xl px-6 py-4 bg-muted/50 border-b border-border',
      'has-data-[slot=card-action]:grid-cols-[1fr_auto]',
      'group-data-[size=sm]/card:px-4 group-data-[size=sm]/card:py-3',
      className,
    )}
    {...props}
  />
);

export const CardTitle: React.FC<React.ComponentProps<'div'>> = ({ className, ...props }) => (
  <div
    data-slot="card-title"
    className={cn(
      'text-base leading-snug font-semibold tracking-tight text-foreground',
      'group-data-[size=sm]/card:text-sm',
      className,
    )}
    {...props}
  />
);

export const CardDescription: React.FC<React.ComponentProps<'div'>> = ({ className, ...props }) => (
  <div
    data-slot="card-description"
    className={cn('text-xs tracking-wide font-medium text-muted-foreground uppercase', className)}
    {...props}
  />
);

export const CardAction: React.FC<React.ComponentProps<'div'>> = ({ className, ...props }) => (
  <div
    data-slot="card-action"
    className={cn('col-start-2 row-span-2 row-start-1 self-start justify-self-end', className)}
    {...props}
  />
);

export const CardContent: React.FC<React.ComponentProps<'div'>> = ({ className, ...props }) => (
  <div
    data-slot="card-content"
    className={cn(
      'px-6 py-5',
      'group-data-[size=sm]/card:px-4 group-data-[size=sm]/card:py-3',
      className,
    )}
    {...props}
  />
);

export const CardFooter: React.FC<React.ComponentProps<'div'>> = ({ className, ...props }) => (
  <div
    data-slot="card-footer"
    className={cn(
      'flex items-center rounded-b-xl border-t border-border bg-muted/50 p-4',
      'group-data-[size=sm]/card:p-3',
      className,
    )}
    {...props}
  />
);
