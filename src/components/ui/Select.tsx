import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * Select primitive (SMART master handoff Part 5 §5) — single source of truth
 * for table filters and the rows-per-page control. Hand-rolled listbox with the
 * reference trigger/popup/item class recipes (no base-ui in this stack):
 * 40px default / 32px small trigger, 8px-offset popup, check indicator on the
 * selected row, automatic search when there are more than 6 options.
 */

export interface SelectOption {
  label: string;
  value: string;
}

export interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  size?: 'default' | 'sm';
  className?: string;
  placeholder?: string;
  id?: string;
  'aria-label'?: string;
}

const TRIGGER =
  'flex w-full items-center justify-between gap-2 rounded-md border border-border bg-card py-2 px-3 text-sm font-medium whitespace-nowrap shadow-sm transition-all outline-none select-none hover:border-ring/60 focus:ring-1 focus:ring-ring focus:border-ring disabled:cursor-not-allowed disabled:opacity-50 data-placeholder:text-muted-foreground cursor-pointer';

const POPUP =
  'absolute left-0 top-full z-50 mt-2 w-full min-w-full max-h-60 overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-md ring-1 ring-foreground/10 outline-none animate-menu-in';

const ITEM =
  'relative flex w-full cursor-default items-center gap-1.5 rounded-md py-1.5 pr-8 pl-2.5 text-left text-sm outline-none select-none hover:bg-muted focus:bg-muted focus:text-foreground';

export const Select: React.FC<SelectProps> = ({
  value,
  onValueChange,
  options,
  size = 'default',
  className,
  placeholder = 'Select…',
  id,
  'aria-label': ariaLabel,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = options.find((option) => option.value === value);
  const searchable = options.length > 6;

  const visible = useMemo(() => {
    if (!searchable || search.trim() === '') return options;
    const query = search.trim().toLowerCase();
    return options.filter((option) => option.label.toLowerCase().includes(query));
  }, [options, search, searchable]);

  const close = () => {
    setOpen(false);
    setSearch('');
  };

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) close();
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setActiveIndex(Math.max(0, visible.findIndex((option) => option.value === value)));
    if (searchable) searchRef.current?.focus();
    // Reset the highlight only when the popup opens or the query changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, search]);

  useEffect(() => {
    const node = listRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    node?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const commit = (next: string) => {
    onValueChange(next);
    close();
  };

  const onListKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (visible.length === 0) return;
      const delta = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((prev) => (prev + delta + visible.length) % visible.length);
      return;
    }
    if (event.key === 'Home') {
      event.preventDefault();
      setActiveIndex(0);
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      setActiveIndex(visible.length - 1);
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const option = visible[activeIndex];
      if (option) commit(option.value);
    }
  };

  return (
    <div ref={rootRef} className={cn('relative', className)} onKeyDown={onListKeyDown}>
      <button
        type="button"
        id={id}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        data-placeholder={selected ? undefined : ''}
        onClick={() => (open ? close() : setOpen(true))}
        className={cn(TRIGGER, size === 'sm' ? 'h-8' : 'h-10')}
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground pointer-events-none" />
      </button>

      {open && (
        <div
          ref={listRef}
          role="listbox"
          aria-label={ariaLabel}
          className={POPUP}
          tabIndex={-1}
        >
          {searchable && (
            <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-popover px-2 py-1.5">
              <Search className="size-3 shrink-0 text-muted-foreground" />
              <input
                ref={searchRef}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search…"
                className="h-6 w-full border-0 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
              />
            </div>
          )}

          {visible.length === 0 && (
            <p className="px-2.5 py-2 text-xs text-muted-foreground">No matches</p>
          )}

          {visible.map((option, index) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                data-active={index === activeIndex}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => commit(option.value)}
                className={cn(ITEM, index === activeIndex && 'bg-muted')}
              >
                {option.label}
                {isSelected && <Check className="absolute right-2 size-4" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
