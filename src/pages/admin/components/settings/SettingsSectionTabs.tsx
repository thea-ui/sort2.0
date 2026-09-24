import React from 'react';

export interface SettingsSection {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
}

interface SettingsSectionTabsProps {
  sections: SettingsSection[];
  active: string;
  onChange: (id: string) => void;
}

/** Pill tab bar used by the merged Settings pages. */
export const SettingsSectionTabs: React.FC<SettingsSectionTabsProps> = ({
  sections,
  active,
  onChange,
}) => (
  <div className="flex flex-wrap items-center gap-2" role="tablist">
    {sections.map(({ id, label, icon: Icon }) => {
      const isActive = id === active;
      return (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={isActive}
          onClick={() => onChange(id)}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
            isActive
              ? 'bg-[var(--primary)] text-white shadow-sm'
              : 'bg-white border border-[var(--primary)]/10 text-[var(--text-strong)]/60 hover:bg-[var(--primary)]/5'
          }`}
        >
          <Icon size={13} className={isActive ? 'text-[var(--accent)]' : ''} />
          {label}
        </button>
      );
    })}
  </div>
);
