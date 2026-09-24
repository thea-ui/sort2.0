import React from 'react';
import { StatCard } from '../../../../components/layout/StatCard';
import type { CollectionKpi } from './useCollectionsMetrics';

interface CollectionsKpiGridProps {
  kpis: CollectionKpi[];
}

export const CollectionsKpiGrid: React.FC<CollectionsKpiGridProps> = ({ kpis }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    {kpis.map((kpi) => {
      const Icon = kpi.icon;
      const BadgeIcon = kpi.badgeIcon;
      return (
        <StatCard
          key={kpi.key}
          label={kpi.label}
          value={
            <>
              {kpi.value}
              {kpi.unit && (
                <span className="text-base font-bold text-[var(--text-strong)]/40 ml-1.5">
                  {kpi.unit}
                </span>
              )}
            </>
          }
          icon={<Icon size={20} />}
          iconClassName={kpi.iconCls}
          badge={
            <>
              {BadgeIcon && <BadgeIcon size={11} />}
              {kpi.badge}
            </>
          }
          badgeClassName={kpi.badgeCls}
          footer={kpi.footer}
        />
      );
    })}
  </div>
);
