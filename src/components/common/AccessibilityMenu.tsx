import React, { useLayoutEffect } from 'react';
import { Accessibility, Minus, Plus, RotateCcw } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/DropdownMenu';
import { useTextScale } from '../../hooks/useTextScale';

interface AccessibilityMenuProps {
  /** Signed-in user id — the text-size preference is stored per user. */
  userId: string | null;
}

/**
 * AccessibilityMenu (SMART accessibility handoff): header accessibility
 * controls shared by all portals. Exposes the signed-in user's Text Size
 * preference (90–150%, default 100%) and stays open while the user steps
 * through values.
 */
export const AccessibilityMenu: React.FC<AccessibilityMenuProps> = ({ userId }) => {
  const { percent, canDecrease, canIncrease, decrease, increase, reset, bindUser } =
    useTextScale();

  // Bind before paint so the user's stored scale applies on the first frame.
  // Unbinding (logout / unmount) resets the page to 100%.
  useLayoutEffect(() => {
    bindUser(userId);
    return () => bindUser(null);
  }, [userId, bindUser]);

  const triggerLabel =
    percent === 100 ? 'Accessibility settings' : `Accessibility settings, text size ${percent}%`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <button
          type="button"
          aria-label={triggerLabel}
          className="relative p-2 rounded-xl hover:bg-muted text-muted-foreground transition-all active:scale-95 cursor-pointer"
        >
          <Accessibility className="w-5 h-5" />
          {percent !== 100 && (
            <span
              className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary"
              aria-hidden="true"
            />
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64 p-3">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <Accessibility className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Accessibility</span>
        </div>

        <div className="flex items-center justify-between pt-3 pb-2">
          <span className="text-sm text-foreground">Text Size</span>
          <span className="text-sm font-semibold text-muted-foreground" role="status">
            {percent}%
          </span>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenuItem
            closeOnClick={false}
            disabled={!canDecrease}
            onClick={decrease}
            aria-label="Decrease text size"
            className="flex-1 h-9 justify-center border border-border bg-background px-0"
          >
            <Minus className="w-4 h-4" />
          </DropdownMenuItem>
          <DropdownMenuItem
            closeOnClick={false}
            disabled={!canIncrease}
            onClick={increase}
            aria-label="Increase text size"
            className="flex-1 h-9 justify-center border border-border bg-background px-0"
          >
            <Plus className="w-4 h-4" />
          </DropdownMenuItem>
        </div>

        {percent !== 100 && (
          <DropdownMenuItem
            closeOnClick={false}
            onClick={reset}
            className="mt-2 justify-center gap-1.5 text-xs text-muted-foreground"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset to 100%
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
