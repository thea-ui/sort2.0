import React from 'react';
import { StatCard } from '../../../../components/layout/StatCard';

export interface LedgerKpi {
  label: string;
  value: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  color: string;
}

interface LedgerKpiStripProps {
  kpis: LedgerKpi[];
}

export const LedgerKpiStrip: React.FC<LedgerKpiStripProps> = ({ kpis }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
    {kpis.map((kpi) => {
      const Icon = kpi.icon;
      return (
        <StatCard
          key={kpi.label}
          label={kpi.label}
          value={kpi.value}
          icon={<Icon size={16} className={kpi.color} />}
          iconClassName="bg-[color-mix(in_srgb,var(--primary)_5%,white)]"
        />
      );
    })}
  </div>
);
