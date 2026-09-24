import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, LogOut, Menu } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ─── Contract ─────────────────────────────────────────────────────────────────
// Application shell for the Admin console and the MRF terminal: a 280px ↔ 70px
// collapsible left sidebar plus a 64px frosted top header. Geometry, radii,
// motion, and type scale follow the SMART sidebar/topbar handoff; navigation
// content is SORT's own (tab ids, not hrefs). The shell is presentational —
// data, auth, and branding are wired by DashboardLayout.

export interface ShellNavChild {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
}

export interface ShellNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
  disabled?: boolean;
  children?: ShellNavChild[];
}

export interface ShellNavGroup {
  title: string;
  items: ShellNavItem[];
}

export type ShellRoleTone = 'emerald' | 'blue' | 'primary';

export interface ShellUser {
  name: string;
  roleLabel: string;
  roleTone?: ShellRoleTone;
}

export interface ShellBrand {
  name: string;
  logoUrl?: string | null;
  fallbackIcon: LucideIcon;
}

export interface AppShellProps {
  brand: ShellBrand;
  navGroups: ShellNavGroup[];
  portalLabel: string;
  pageTitle: string;
  user: ShellUser;
  schoolYear?: string | null;
  activeTab: string;
  onNavigate: (id: string, options?: { keepOpen?: boolean }) => void;
  onLogout: () => void;
  headerActions?: React.ReactNode;
  persistKey?: string;
  children: React.ReactNode;
}

const ROLE_TONES: Record<Exclude<ShellRoleTone, 'primary'>, string> = {
  emerald: 'text-emerald-600 bg-emerald-50',
  blue: 'text-blue-600 bg-blue-50',
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

function initials(name: string) {
  const first = name.trim().charAt(0);
  return first ? first.toUpperCase() : '?';
}

// ─── Brand tile ───────────────────────────────────────────────────────────────

const BrandTile: React.FC<{ brand: ShellBrand; className?: string }> = ({ brand, className }) => {
  const [logoFailed, setLogoFailed] = useState(false);
  const Fallback = brand.fallbackIcon;

  return (
    <div
      className={cx(
        'rounded-lg bg-white border border-slate-100 shadow-sm flex items-center justify-center overflow-hidden p-1',
        className,
      )}
    >
      {brand.logoUrl && !logoFailed ? (
        <img
          src={brand.logoUrl}
          alt="Logo"
          className="w-full h-full object-contain"
          onError={() => setLogoFailed(true)}
        />
      ) : (
        <Fallback className="w-6 h-6 text-[var(--theme-primary)]" />
      )}
    </div>
  );
};

// ─── Nav list (shared by the desktop rail and the mobile sheet) ───────────────

interface ShellNavListProps {
  groups: ShellNavGroup[];
  activeTab: string;
  onNavigate: (id: string, options?: { keepOpen?: boolean }) => void;
  collapsed?: boolean;
}

export const ShellNavList: React.FC<ShellNavListProps> = ({
  groups,
  activeTab,
  onNavigate,
  collapsed = false,
}) => {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const labelClass = collapsed
    ? 'opacity-0 scale-90 -translate-x-4 pointer-events-none w-0 m-0'
    : 'opacity-100 scale-100 translate-x-0 ml-4';

  return (
    <>
      {groups.map((group) => (
        <div key={group.title} className="mb-5 first:mt-2">
          {!collapsed && (
            <span className="px-4 mb-1 text-[0.625rem] font-bold text-[#0F1729]/60 uppercase tracking-normal block whitespace-nowrap">
              {group.title}
            </span>
          )}
          <div className="space-y-1">
            {group.items.map((item) => {
              const ItemIcon = item.icon;

              if (item.children) {
                const hasActiveChild = item.children.some((child) => child.id === activeTab);
                const parentActive = activeTab === item.id || hasActiveChild;
                const isOpen = openGroups[item.id] ?? hasActiveChild;

                return (
                  <div key={item.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setOpenGroups((prev) => ({ ...prev, [item.id]: !isOpen }));
                        onNavigate(item.id, { keepOpen: true });
                      }}
                      disabled={item.disabled}
                      aria-expanded={!collapsed ? isOpen : undefined}
                      className={cx(
                        'w-full flex items-center rounded-full text-[14px] font-medium transition-all duration-200 group overflow-hidden py-1.5 cursor-pointer',
                        collapsed ? 'px-0 justify-center h-10 w-10 mx-auto' : 'px-4',
                        item.disabled
                          ? 'text-[#0F1729] opacity-40 cursor-not-allowed select-none'
                          : 'text-[#0F1729] hover:bg-white/80',
                      )}
                      style={{
                        backgroundColor:
                          parentActive && !collapsed && !item.disabled
                            ? 'rgba(var(--theme-primary-rgb), 0.1)'
                            : 'transparent',
                      }}
                      title={collapsed ? item.label : undefined}
                    >
                      <div
                        className={cx(
                          'flex items-center transition-all duration-200',
                          collapsed ? 'justify-center' : 'w-full',
                        )}
                      >
                        <div className="w-6 h-6 flex flex-shrink-0 items-center justify-center">
                          <ItemIcon
                            className={cx(
                              'w-5 h-5 transition-colors duration-200',
                              parentActive
                                ? 'text-[#0F1729]'
                                : 'text-[#0F1729]/70 group-hover:text-[#0F1729]',
                            )}
                            strokeWidth={2.2}
                          />
                        </div>
                        <div
                          className={cx(
                            'flex items-center justify-between flex-1 transition-[opacity,transform,margin] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] origin-left',
                            labelClass,
                          )}
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="truncate whitespace-nowrap">{item.label}</span>
                            {item.badge && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-700 whitespace-nowrap">
                                <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <ChevronDown
                            className={cx(
                              'w-4 h-4 transition-transform duration-200 opacity-60 shrink-0',
                              isOpen && 'transform rotate-180',
                            )}
                          />
                        </div>
                      </div>
                    </button>

                    {isOpen && !collapsed && (
                      <div className="mt-0.5 space-y-0.5 pl-4 animate-fade-in border-l border-slate-100 ml-7">
                        {item.children.map((child) => {
                          // Selecting the parent lands on its default (first)
                          // child page, so that child carries the active pill.
                          const childActive =
                            child.id === activeTab ||
                            (activeTab === item.id && child.id === item.children?.[0]?.id);
                          const ChildIcon = child.icon;

                          return (
                            <button
                              key={child.id}
                              type="button"
                              onClick={() => onNavigate(child.id)}
                              aria-current={childActive ? 'page' : undefined}
                              className="w-full flex items-center gap-3 rounded-full text-[13px] font-medium transition-all duration-200 px-4 py-1.5 cursor-pointer text-left"
                              style={{
                                backgroundColor: childActive ? 'var(--theme-primary)' : 'transparent',
                                color: childActive ? '#ffffff' : '#0F1729',
                              }}
                            >
                              <ChildIcon
                                className={cx(
                                  'w-4 h-4 flex-shrink-0',
                                  childActive ? 'text-white' : 'text-[#0F1729]/60',
                                )}
                                strokeWidth={2.2}
                              />
                              <span className="flex-1 min-w-0 truncate">{child.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              const itemActive = !item.disabled && activeTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  disabled={item.disabled}
                  aria-current={itemActive ? 'page' : undefined}
                  className={cx(
                    'w-full flex items-center rounded-full text-[14px] font-medium transition-all duration-200 group overflow-hidden py-1.5 cursor-pointer',
                    collapsed ? 'px-0 justify-center h-10 w-10 mx-auto' : 'px-4',
                    item.disabled && 'opacity-40 cursor-not-allowed select-none',
                    !item.disabled && itemActive && 'text-white shadow-sm',
                    !item.disabled && !itemActive && 'text-[#0F1729] hover:bg-white/80',
                  )}
                  style={{
                    backgroundColor: itemActive ? 'var(--theme-primary)' : 'transparent',
                  }}
                  title={
                    collapsed
                      ? item.label
                      : item.disabled
                        ? `${item.label} (Unavailable)`
                        : undefined
                  }
                >
                  <div
                    className={cx(
                      'flex items-center transition-all duration-200',
                      collapsed ? 'justify-center' : 'w-full',
                    )}
                  >
                    <div className="w-6 h-6 flex flex-shrink-0 items-center justify-center">
                      <ItemIcon
                        className={cx(
                          'w-5 h-5 transition-colors duration-200',
                          itemActive ? 'text-white' : 'text-[#0F1729]/70 group-hover:text-[#0F1729]',
                        )}
                        strokeWidth={2.2}
                      />
                    </div>
                    <div
                      className={cx(
                        'flex min-w-0 flex-1 items-center gap-2 transition-[opacity,transform,margin] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] origin-left',
                        labelClass,
                      )}
                    >
                      <span className="truncate whitespace-nowrap">{item.label}</span>
                      {item.badge && (
                        <span
                          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase whitespace-nowrap"
                          style={{
                            backgroundColor: itemActive
                              ? 'rgba(255,255,255,0.2)'
                              : 'rgb(254 243 199)',
                            color: itemActive ? 'rgba(255,255,255,0.9)' : 'rgb(180 83 9)',
                          }}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
                          {item.badge}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
};

// ─── Sidebar footer ───────────────────────────────────────────────────────────

interface ShellNavFooterProps {
  user: ShellUser;
  onLogout: () => void;
  collapsed?: boolean;
}

export const ShellNavFooter: React.FC<ShellNavFooterProps> = ({
  user,
  onLogout,
  collapsed = false,
}) => (
  <div
    className={cx(
      'border-t border-slate-100 transition-all duration-200 bg-white/20 overflow-hidden shrink-0',
      collapsed ? 'px-2 py-4' : 'p-4',
    )}
  >
    <div
      className={cx(
        'flex items-center transition-all duration-200 px-1 py-1',
        collapsed ? 'justify-center' : 'w-full',
      )}
    >
      <div className="w-9 h-9 flex flex-shrink-0 items-center justify-center">
        <div
          className="w-9 h-9 rounded-full border border-white shadow-sm transition-transform duration-200 flex items-center justify-center bg-slate-100 text-slate-700 font-bold text-xs uppercase"
          style={{ transform: collapsed ? 'scale(0.9)' : 'scale(1)' }}
        >
          {initials(user.name)}
        </div>
      </div>
      <div
        className={cx(
          'flex-1 min-w-0 flex items-center justify-between transition-[opacity,transform,margin] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] origin-left',
          collapsed
            ? 'opacity-0 scale-90 -translate-x-4 pointer-events-none w-0 m-0'
            : 'opacity-100 scale-100 translate-x-0 ml-3',
        )}
      >
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-[#0F1729] truncate leading-none mb-1">{user.name}</p>
          <p className="text-[10px] font-bold text-[#0F1729]/50 truncate uppercase tracking-tight">
            {user.roleLabel}
          </p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="p-1.5 rounded-lg hover:bg-white hover:text-red-600 text-slate-400 transition-colors duration-200 ml-1 cursor-pointer"
          title="Sign Out"
          aria-label="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
);

// ─── Shell ────────────────────────────────────────────────────────────────────

export const AppShell: React.FC<AppShellProps> = ({
  brand,
  navGroups,
  portalLabel,
  pageTitle,
  user,
  schoolYear,
  activeTab,
  onNavigate,
  onLogout,
  headerActions,
  persistKey = 'sortv2_sidebar_collapsed',
  children,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(persistKey) === 'true');
    } catch {
      // Private mode / quota errors must not break the shell.
    }
  }, [persistKey]);

  // The main column owns the scroll (viewport-height shell), so tab changes
  // must reset it explicitly.
  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTop = 0;
  }, [activeTab]);

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      try {
        localStorage.setItem(persistKey, String(!prev));
      } catch {
        // Best effort persistence only.
      }
      return !prev;
    });
  };

  const roleToneClass = user.roleTone && user.roleTone !== 'primary' ? ROLE_TONES[user.roleTone] : undefined;

  return (
    <div className="h-screen max-h-screen bg-[var(--background)] text-[var(--text-strong)] flex overflow-hidden font-sans">
      <aside
        className={cx(
          'hidden lg:flex flex-col shrink-0 bg-[#fafafa] border-r border-slate-200 shadow-sm transition-[width] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] will-change-[width] overflow-hidden',
          collapsed ? 'w-[70px]' : 'w-[280px]',
        )}
        style={{ fontFamily: "'DM Sans', 'Poppins', sans-serif" }}
      >
        <div
          className={cx(
            'h-24 flex items-center overflow-hidden transition-all duration-200 shrink-0',
            collapsed ? 'px-0 justify-center' : 'px-6',
          )}
        >
          {collapsed ? (
            <BrandTile
              brand={brand}
              className="w-12 h-12 transition-transform duration-200 ease-out scale-[0.85]"
            />
          ) : (
            <div className="flex items-center w-full min-w-[240px] transition-all duration-200">
              <div className="w-12 h-12 flex flex-shrink-0 items-center justify-center">
                <BrandTile brand={brand} className="w-12 h-12" />
              </div>
              <div className="ml-3 transition-all duration-200 origin-left flex-shrink-0">
                <span className="font-bold text-sm leading-tight tracking-tight uppercase block max-w-[160px] text-[var(--theme-primary)] line-clamp-2">
                  {brand.name}
                </span>
              </div>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-2 px-3 custom-scrollbar overflow-x-hidden">
          <ShellNavList
            groups={navGroups}
            activeTab={activeTab}
            onNavigate={onNavigate}
            collapsed={collapsed}
          />
        </nav>

        <ShellNavFooter user={user} onLogout={onLogout} collapsed={collapsed} />
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 shrink-0 z-30 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 lg:px-6">
          <div className="h-full flex items-center justify-between">
            <div className="flex items-center gap-4 min-w-0">
              <button
                type="button"
                className="hidden lg:inline-flex p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-all active:scale-95 cursor-pointer"
                onClick={toggleCollapse}
                aria-label="Toggle sidebar"
                title="Toggle sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="flex flex-col min-w-0">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  {portalLabel}
                </span>
                <span className="text-base font-bold text-slate-900 -mt-1 truncate">{pageTitle}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {headerActions}

              {schoolYear && (
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold tracking-wider px-2 py-1 rounded-lg bg-slate-100 text-slate-600 whitespace-nowrap">
                  S.Y. {schoolYear}
                </span>
              )}

              <div className="flex items-center gap-3 pl-3 border-l border-slate-100">
                <div className="hidden sm:flex flex-col items-end mr-1">
                  <span className="text-sm font-bold text-slate-900 leading-none">{user.name}</span>
                  <span
                    className={cx(
                      'text-[10px] font-medium px-1.5 py-0.5 rounded-md mt-1',
                      roleToneClass,
                    )}
                    style={
                      user.roleTone === 'primary'
                        ? {
                            color: 'var(--theme-primary)',
                            backgroundColor: 'rgba(var(--theme-primary-rgb), 0.06)',
                          }
                        : undefined
                    }
                  >
                    {user.roleLabel}
                  </span>
                </div>
                <div className="w-9 h-9 rounded-full ring-2 ring-slate-100 ring-offset-2 flex items-center justify-center bg-slate-200 text-slate-700 text-sm font-bold">
                  {initials(user.name)}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main
          ref={mainRef}
          className="flex-1 overflow-y-auto min-w-0 px-4 lg:px-8 py-4 lg:py-8 pb-28 lg:pb-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
};
