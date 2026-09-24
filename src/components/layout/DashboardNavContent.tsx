import React from 'react';
import { ChevronDown, ChevronRight, ChevronUp, LogOut } from 'lucide-react';
import { User } from '../../types';
import { ROLE_LABELS, getInitials } from '../../utils/userDisplay';
import { ADMIN_SECTIONS, MRF_NAV_ITEMS, SETTINGS_SUBITEMS } from './dashboardNav';

interface DashboardNavContentProps {
  isMRF: boolean;
  activeTab: string;
  onSelect: (id: string, options?: { keepOpen?: boolean }) => void;
  /**
   * Mobile sheet: tapping "Settings" expands the sub-menu in place instead of
   * navigating away and closing the sheet.
   */
  expandableSettings?: boolean;
}

/**
 * Grouped dashboard navigation shared by the desktop sidebar and the mobile
 * "More" sheet, so the two can never drift apart.
 */
export const DashboardNavContent: React.FC<DashboardNavContentProps> = ({
  isMRF,
  activeTab,
  onSelect,
  expandableSettings = false,
}) => {
  const [settingsExpanded, setSettingsExpanded] = React.useState(false);

  if (isMRF) {
    return (
      <div className="flex flex-col gap-0.5">
        {MRF_NAV_ITEMS.map(item => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all group cursor-pointer
                ${isActive
                  ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
                  : 'text-[var(--text-strong)]/55 hover:bg-[var(--primary)]/5 hover:text-[var(--text-strong)]'}
              `}
            >
              <Icon
                size={15}
                className={`transition-colors shrink-0 ${isActive ? 'text-[var(--accent)]' : 'text-[var(--text-strong)]/30 group-hover:text-[var(--text-strong)]'}`}
              />
              <span className="flex-1 text-left">{item.label}</span>
              {isActive && <ChevronRight size={11} className="text-[var(--accent)] shrink-0" />}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <>
      {ADMIN_SECTIONS.map(section => (
        <div key={section.group} className="space-y-1">
          <span className="px-3 text-[10px] font-black text-[var(--text-strong)]/40 uppercase tracking-wider block">
            {section.group}
          </span>
          <div className="flex flex-col gap-0.5">
            {section.items.map(item => {
              const isSettings = item.id === 'admin-settings';
              const isSettingsActive = isSettings && (activeTab === 'admin-settings' || SETTINGS_SUBITEMS.some(sub => sub.id === activeTab));
              const isActive = activeTab === item.id || isSettingsActive;
              const showSettingsMenu = isSettings && (expandableSettings ? settingsExpanded || isSettingsActive : isSettingsActive);
              const Icon = item.icon;

              return (
                <React.Fragment key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (isSettings && expandableSettings) {
                        onSelect(item.id, { keepOpen: true });
                        setSettingsExpanded(prev => !prev);
                        return;
                      }
                      onSelect(item.id);
                    }}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all group cursor-pointer
                      ${isActive
                        ? 'bg-[var(--primary)] text-white shadow-sm'
                        : 'text-[var(--text-strong)]/70 hover:bg-[var(--primary)]/5 hover:text-[var(--text-strong)]'}
                    `}
                  >
                    <Icon
                      size={15}
                      className={`transition-colors shrink-0 ${isActive ? 'text-[var(--accent)]' : 'text-[var(--text-strong)]/40 group-hover:text-[var(--text-strong)]'}`}
                    />
                    <span className="flex-1 text-left">{item.label}</span>
                    {isSettings && (
                      <ChevronDown size={12} className={`transition-transform shrink-0 ${showSettingsMenu ? 'rotate-180 text-white' : 'text-[var(--text-strong)]/30'}`} />
                    )}
                    {isActive && !isSettings && <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0" />}
                  </button>

                  {isSettings && showSettingsMenu && (
                    <div className="pl-7 pr-1 py-1 space-y-0.5">
                      {SETTINGS_SUBITEMS.map(sub => {
                        const isSubActive = activeTab === sub.id || (activeTab === 'admin-settings' && sub.id === 'academic-calendar');
                        return (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => onSelect(sub.id)}
                            className={`
                              w-full text-left px-3 py-2 rounded-lg text-[11px] font-medium transition-all block cursor-pointer
                              ${isSubActive
                                ? 'bg-[var(--accent)]/15 text-[var(--accent)] font-bold'
                                : 'text-[var(--text-strong)]/60 hover:text-[var(--text-strong)] hover:bg-[var(--primary)]/5'}
                            `}
                          >
                            {sub.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
};

interface DashboardNavFooterProps {
  user: User;
  onLogout: () => void;
  /**
   * Admin consoles show a clickable profile card whose menu only offers
   * sign out; the MRF terminal only shows the version stamp.
   */
  showProfileCard?: boolean;
}

export const DashboardNavFooter: React.FC<DashboardNavFooterProps> = ({
  user,
  onLogout,
  showProfileCard = false,
}) => {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const cardRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!menuOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [menuOpen]);

  return (
    <div className="flex flex-col gap-2 pt-4 border-t border-[var(--primary)]/8 shrink-0">
      {showProfileCard && (
        <div ref={cardRef} className="relative">
          {menuOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-2 z-50 bg-white border border-[var(--primary)]/10 rounded-2xl shadow-xl overflow-hidden p-1.5">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onLogout();
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-50 cursor-pointer"
              >
                <LogOut size={15} />
                Sign Out
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={() => setMenuOpen(open => !open)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[var(--primary)]/5 hover:bg-[var(--primary)]/10 transition-colors cursor-pointer"
          >
            <div className="h-8 w-8 shrink-0 rounded-xl bg-[var(--accent)] text-white font-black flex items-center justify-center text-[10px]">
              {getInitials(user.name)}
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-[11px] font-black leading-tight text-[var(--text-strong)] truncate">{user.name}</p>
              <p className="text-[9px] font-semibold leading-tight text-[var(--text-strong)]/50 truncate">{ROLE_LABELS[user.role]}</p>
            </div>
            <ChevronUp
              size={13}
              className={`shrink-0 text-[var(--text-strong)]/40 transition-transform ${menuOpen ? '' : 'rotate-180'}`}
            />
          </button>
        </div>
      )}
      <p className="text-[9px] text-gray-400 px-3">S.O.R.T Campus Gate v2.0</p>
    </div>
  );
};
