import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../utils/cn';

/**
 * DropdownMenu primitives (SMART master handoff Part 6 §8).
 * Portaled popover: 4px padding, 12px radius, 1px 10% ring, shadow-md, 8px
 * slide + 100ms fade/zoom, `accent`-equivalent (muted) focus highlight.
 */

interface DropdownContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLElement | null>;
}

const DropdownContext = createContext<DropdownContextValue | undefined>(undefined);

function useDropdown(component: string): DropdownContextValue {
  const context = useContext(DropdownContext);
  if (!context) throw new Error(`${component} must be used within <DropdownMenu>`);
  return context;
}

export interface DropdownMenuProps {
  children: React.ReactNode;
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLElement | null>(null);
  return (
    <DropdownContext.Provider value={{ open, setOpen, triggerRef }}>
      {children}
    </DropdownContext.Provider>
  );
};

export interface DropdownMenuTriggerProps {
  children: React.ReactElement<{
    onClick?: (event: React.MouseEvent) => void;
    ref?: React.Ref<HTMLElement>;
    'aria-expanded'?: boolean;
    'aria-haspopup'?: string;
  }>;
}

export const DropdownMenuTrigger: React.FC<DropdownMenuTriggerProps> = ({ children }) => {
  const { open, setOpen, triggerRef } = useDropdown('DropdownMenuTrigger');
  const child = React.Children.only(children);

  return React.cloneElement(child, {
    ref: (node: HTMLElement | null) => {
      triggerRef.current = node;
      const original = child.props.ref;
      if (typeof original === 'function') original(node);
    },
    onClick: (event: React.MouseEvent) => {
      child.props.onClick?.(event);
      setOpen(!open);
    },
    'aria-expanded': open,
    'aria-haspopup': 'menu',
  });
};

export interface DropdownMenuContentProps extends React.ComponentProps<'div'> {
  align?: 'start' | 'end';
  sideOffset?: number;
}

export const DropdownMenuContent: React.FC<DropdownMenuContentProps> = ({
  className,
  align = 'end',
  sideOffset = 8,
  children,
  ...props
}) => {
  const { open, setOpen, triggerRef } = useDropdown('DropdownMenuContent');
  const contentRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left?: number; right?: number } | null>(null);

  const measure = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    setPosition({
      top: rect.bottom + sideOffset,
      ...(align === 'end'
        ? { right: Math.max(8, window.innerWidth - rect.right) }
        : { left: rect.left }),
    });
  }, [align, sideOffset, triggerRef]);

  useEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    measure();
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (contentRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, measure, setOpen, triggerRef]);

  if (!open || !position) return null;

  return createPortal(
    <div
      ref={contentRef}
      data-slot="dropdown-menu-content"
      role="menu"
      style={{ top: position.top, left: position.left, right: position.right }}
      className={cn(
        'fixed z-50 min-w-32 rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 outline-none animate-menu-in',
        className,
      )}
      {...props}
    >
      {children}
    </div>,
    document.body,
  );
};

export const DropdownMenuLabel: React.FC<React.ComponentProps<'div'>> = ({ className, ...props }) => (
  <div
    data-slot="dropdown-menu-label"
    className={cn('px-1.5 py-1 text-xs font-medium text-muted-foreground', className)}
    {...props}
  />
);

export const DropdownMenuItem: React.FC<
  React.ComponentProps<'button'> & { destructive?: boolean }
> = ({ className, destructive = false, onClick, ...props }) => {
  const { setOpen } = useDropdown('DropdownMenuItem');
  return (
    <button
      type="button"
      role="menuitem"
      data-slot="dropdown-menu-item"
      onClick={(event) => {
        onClick?.(event);
        setOpen(false);
      }}
      className={cn(
        'relative flex w-full cursor-default items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-sm outline-none select-none hover:bg-muted focus:bg-muted focus:text-foreground disabled:pointer-events-none disabled:opacity-50',
        destructive && 'text-destructive hover:bg-destructive/10 hover:text-destructive focus:bg-destructive/10 focus:text-destructive',
        className,
      )}
      {...props}
    />
  );
};

export const DropdownMenuSeparator: React.FC<React.ComponentProps<'div'>> = ({ className, ...props }) => (
  <div data-slot="dropdown-menu-separator" role="separator" className={cn('-mx-1 my-1 h-px bg-border', className)} {...props} />
);
