import React from 'react';
import { Menu } from 'lucide-react';

export interface MobileNavItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
}

interface MobileBottomNavProps {
  items: MobileNavItem[];
  activeTab: string;
  onSelect: (id: string) => void;
  onMore: () => void;
}

/**
 * Mobile-only bottom tab bar (mirrors StudentLayout). Four role-aware primary
 * destinations plus a "More" tab that opens the grouped navigation sheet.
 */
export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ items, activeTab, onSelect, onMore }) => {
  const primaryIds = items.map((item) => item.id);
  const moreActive = !primaryIds.includes(activeTab);

  return (
    <div data-testid="mobile-bottom-nav" className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)]">
      <nav className="flex items-center justify-around px-1 py-2">
        {items.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              className="relative flex flex-col items-center justify-center w-full py-1 gap-1 cursor-pointer"
            >
              <div className={`flex items-center justify-center p-1.5 rounded-lg transition-colors ${
                isActive ? 'bg-[var(--accent)]/15 text-[var(--accent)]' : 'text-gray-400'
              }`}>
                <Icon size={19} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={`text-[10px] font-semibold transition-colors ${
                isActive ? 'text-[var(--accent)]' : 'text-gray-400'
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={onMore}
          aria-label="More navigation"
          aria-current={moreActive ? 'page' : undefined}
          className="relative flex flex-col items-center justify-center w-full py-1 gap-1 cursor-pointer"
        >
          <div className={`flex items-center justify-center p-1.5 rounded-lg transition-colors ${
            moreActive ? 'bg-[var(--accent)]/15 text-[var(--accent)]' : 'text-gray-400'
          }`}>
            <Menu size={19} strokeWidth={moreActive ? 2.5 : 2} />
          </div>
          <span className={`text-[10px] font-semibold transition-colors ${
            moreActive ? 'text-[var(--accent)]' : 'text-gray-400'
          }`}>
            More
          </span>
        </button>
      </nav>
    </div>
  );
};
