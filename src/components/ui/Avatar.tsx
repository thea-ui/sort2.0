import React, { useState } from 'react';
import { cn } from '../../utils/cn';

/**
 * Avatar primitives (SMART master handoff Part 6 §6): circular, 32px default
 * (24px sm / 40px lg), 1px inner border ring, muted fallback.
 */

export type AvatarSize = 'default' | 'sm' | 'lg';

export const Avatar: React.FC<React.ComponentProps<'span'> & { size?: AvatarSize }> = ({
  className,
  size = 'default',
  ...props
}) => (
  <span
    data-slot="avatar"
    data-size={size}
    className={cn(
      'group/avatar relative flex size-8 shrink-0 rounded-full select-none after:absolute after:inset-0 after:rounded-full after:border after:border-border after:mix-blend-darken data-[size=lg]:size-10 data-[size=sm]:size-6',
      className,
    )}
    {...props}
  />
);

export const AvatarImage: React.FC<React.ComponentProps<'img'>> = ({ className, ...props }) => {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <img
      data-slot="avatar-image"
      onError={() => setFailed(true)}
      className={cn('absolute inset-0 aspect-square size-full rounded-full object-cover', className)}
      {...props}
    />
  );
};

export const AvatarFallback: React.FC<React.ComponentProps<'span'>> = ({ className, ...props }) => (
  <span
    data-slot="avatar-fallback"
    className={cn(
      'flex size-full items-center justify-center rounded-full bg-muted text-sm text-muted-foreground group-data-[size=sm]/avatar:text-xs',
      className,
    )}
    {...props}
  />
);

export const AvatarGroup: React.FC<React.ComponentProps<'div'>> = ({ className, ...props }) => (
  <div
    data-slot="avatar-group"
    className={cn(
      'group/avatar-group flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-card',
      className,
    )}
    {...props}
  />
);
