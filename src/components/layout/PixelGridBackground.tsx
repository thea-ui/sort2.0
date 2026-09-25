import React, { useId } from 'react';

interface PixelGridBackgroundProps {
  /**
   * `fixed` = viewport backdrop used by the authenticated shell.
   * `absolute` = grid scoped to a positioned container (e.g. a login panel).
   */
  position?: 'fixed' | 'absolute';
  /** Slate→primary wash behind the grid. Off renders the grid alone. */
  wash?: boolean;
  className?: string;
}

/**
 * Slate→primary wash that sits under the pixel grid (master handoff Part 1 §5.2).
 * Exported so full-screen pages (e.g. the staff login) can lay the same wash
 * across the whole viewport and still scope the grid to one panel.
 */
export const PIXEL_GRID_WASH =
  'linear-gradient(to bottom right, #f8fafc 0%, rgba(var(--theme-primary-rgb), 0.08) 50%, rgba(var(--theme-primary-rgb), 0.06) 100%)';

/**
 * Portal pixel-grid backdrop (SMART master handoff Part 1 §5.2).
 * 80×80 SVG tile, 36px rounded squares (rx 2) with a 1.5px primary stroke at
 * 8% opacity over a slate-to-primary gradient. Also used by the staff login
 * screens, which scope it to their form panel with `position="absolute"`.
 */
export const PixelGridBackground: React.FC<PixelGridBackgroundProps> = ({
  position = 'fixed',
  wash = true,
  className = '',
}) => {
  const rawId = useId();
  const patternId = `app-pixel-grid-${rawId.replace(/:/g, '')}`;

  return (
    <div
      className={`pointer-events-none ${position === 'fixed' ? 'fixed inset-0 -z-10' : 'absolute inset-0'} ${className}`}
      style={wash ? { backgroundImage: PIXEL_GRID_WASH } : undefined}
      aria-hidden="true"
    >
      <svg className="absolute inset-0 h-full w-full opacity-[0.08]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id={patternId} x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
            <rect x="2" y="2" width="36" height="36" rx="2" fill="none" stroke="var(--theme-primary)" strokeWidth="1.5" />
            <rect x="42" y="2" width="36" height="36" rx="2" fill="none" stroke="var(--theme-primary)" strokeWidth="1.5" />
            <rect x="2" y="42" width="36" height="36" rx="2" fill="none" stroke="var(--theme-primary)" strokeWidth="1.5" />
            <rect x="42" y="42" width="36" height="36" rx="2" fill="none" stroke="var(--theme-primary)" strokeWidth="1.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>
    </div>
  );
};
