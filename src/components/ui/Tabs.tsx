import React, { createContext, useContext } from 'react';
import { cn } from '../../utils/cn';

/**
 * Tabs primitives (SMART master handoff Part 6 §7).
 * `default` = 32px muted track with a raised active tab; `line` = transparent
 * track with a 2px underline that fades in on the active tab.
 */

type TabsVariant = 'default' | 'line';

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
  variant: TabsVariant;
}

const TabsContext = createContext<TabsContextValue | undefined>(undefined);

function useTabs(component: string): TabsContextValue {
  const context = useContext(TabsContext);
  if (!context) throw new Error(`${component} must be used within <Tabs>`);
  return context;
}

export interface TabsProps extends React.ComponentProps<'div'> {
  value: string;
  onValueChange: (value: string) => void;
  variant?: TabsVariant;
}

export const Tabs: React.FC<TabsProps> = ({
  className,
  value,
  onValueChange,
  variant = 'default',
  ...props
}) => (
  <TabsContext.Provider value={{ value, onValueChange, variant }}>
    <div
      data-slot="tabs"
      data-variant={variant}
      className={cn('group/tabs flex flex-col gap-2', className)}
      {...props}
    />
  </TabsContext.Provider>
);

export const TabsList: React.FC<React.ComponentProps<'div'>> = ({ className, ...props }) => {
  const { variant } = useTabs('TabsList');
  return (
    <div
      data-slot="tabs-list"
      data-variant={variant}
      role="tablist"
      className={cn(
        'group/tabs-list inline-flex w-fit items-center justify-center rounded-lg p-[3px] text-muted-foreground h-8',
        variant === 'default' ? 'bg-muted' : 'gap-1 bg-transparent rounded-none',
        className,
      )}
      {...props}
    />
  );
};

export interface TabsTriggerProps extends React.ComponentProps<'button'> {
  value: string;
}

export const TabsTrigger: React.FC<TabsTriggerProps> = ({ className, value, ...props }) => {
  const { value: active, onValueChange, variant } = useTabs('TabsTrigger');
  const isActive = active === value;
  return (
    <button
      type="button"
      data-slot="tabs-trigger"
      role="tab"
      aria-selected={isActive}
      data-active={isActive}
      onClick={() => onValueChange(value)}
      className={cn(
        'relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-1.5 py-0.5 text-sm font-medium whitespace-nowrap text-foreground/60 transition-all outline-none select-none hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
        variant === 'line' && 'flex-none',
        isActive && 'bg-background text-foreground shadow-sm',
        variant === 'line' && [
          'after:absolute after:bg-foreground after:opacity-0 after:transition-opacity after:inset-x-0 after:bottom-[-5px] after:h-0.5',
          isActive && 'after:opacity-100',
        ],
        className,
      )}
      {...props}
    />
  );
};

export interface TabsContentProps extends React.ComponentProps<'div'> {
  value: string;
}

export const TabsContent: React.FC<TabsContentProps> = ({ className, value, ...props }) => {
  const { value: active } = useTabs('TabsContent');
  if (active !== value) return null;
  return (
    <div
      data-slot="tabs-content"
      role="tabpanel"
      className={cn('flex-1 text-sm outline-none', className)}
      {...props}
    />
  );
};
