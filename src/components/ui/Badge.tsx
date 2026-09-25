import React from 'react';
import { cn } from '../../utils/cn';

/**
 * Badge primitive (SMART master handoff Part 6 §5): 20px pill, 12px medium,
 * 12px icons. `secondary` uses the neutral muted fill because SORT's
 * `--secondary` token is the brand green (the reference theme's secondary is a
 * neutral) — same computed look, different token name.
 */

export type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'outline'
  | 'ghost'
  | 'link';

const VARIANT: Record<BadgeVariant, string> = {
  default: 'bg-primary text-primary-foreground',
  secondary: 'bg-muted text-muted-foreground',
  destructive: 'bg-destructive/10 text-destructive',
  outline: 'border-border text-foreground',
  ghost: 'hover:bg-muted hover:text-muted-foreground',
  link: 'text-primary underline-offset-4 hover:underline',
};

const BASE =
  "inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 [&>svg]:pointer-events-none [&>svg]:size-3";

export interface BadgeProps extends React.ComponentProps<'span'> {
  variant?: BadgeVariant;
}

export const Badge: React.FC<BadgeProps> = ({ className, variant = 'default', ...props }) => (
  <span data-slot="badge" data-variant={variant} className={cn(BASE, VARIANT[variant], className)} {...props} />
);

/**
 * Table status tone recipe (Part 2 §4) — `Badge variant="outline"` plus one of
 * these tinted tone classes. Only the tones listed in the handoff are allowed.
 */
export const STATUS_TONE = {
  active: 'bg-primary/10 text-primary border-primary/20',
  draft: 'bg-muted text-muted-foreground',
  completed: 'bg-blue-50 text-blue-700 border-blue-200',
  archived: 'bg-amber-50 text-amber-700 border-amber-200',
} as const;

export const StatusBadge: React.FC<
  React.ComponentProps<'span'> & { tone: keyof typeof STATUS_TONE }
> = ({ className, tone, ...props }) => (
  <Badge
    variant="outline"
    className={cn('text-[11px] font-medium px-2 py-0.5 rounded-full', STATUS_TONE[tone], className)}
    {...props}
  />
);
