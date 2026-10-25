import React from 'react';
import { KpiCard } from '../../../../components/layout/KpiCard';
import type { CollectionKpi } from './useCollectionsMetrics';

interface CollectionsKpiGridProps {
  kpis: CollectionKpi[];
}

export const CollectionsKpiGrid: React.FC<CollectionsKpiGridProps> = ({ kpis }) => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
    {kpis.map((kpi) => {
      const Icon = kpi.icon;
      return (
        <KpiCard
          key={kpi.key}
          label={kpi.label}
          value={
            <>
              {kpi.value}
              {kpi.unit && (
                <span className="ml-1.5 text-sm font-medium text-[var(--text-strong)]/35">
                  {kpi.unit}
                </span>
              )}
            </>
          }
          icon={<Icon size={18} strokeWidth={2} />}
          iconClassName={kpi.iconCls}
          footer={
            <>
              <span className="min-w-0 truncate" title={kpi.footerLeft}>
                {kpi.footerLeft}
              </span>
              <span className={`shrink-0 font-semibold ${kpi.footerRightCls}`}>
                {kpi.footerRight}
              </span>
            </>
          }
        />
      );
    })}
  </div>
);
