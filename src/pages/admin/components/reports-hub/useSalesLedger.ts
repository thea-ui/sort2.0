import { useEffect, useState } from 'react';
import { apiService } from '../../../../services/api';
import type { LedgerRow } from './reportHubTypes';

function toIso(value: unknown): string {
  if (typeof value !== 'string' || !value) return '';
  const normalized = value.includes(' ') && !value.includes('T') ? value.replace(' ', 'T') : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

/**
 * Sold-scrap records for the Reports hub ledger folders:
 * recyclable market sales plus asset-scrap sales, scoped by school year.
 */
export function useSalesLedger(yearId: string): { rows: LedgerRow[]; loading: boolean } {
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const param = yearId && yearId !== 'ALL' ? yearId : undefined;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      apiService.getMarketSales(param).catch(() => []),
      apiService.getAssetScrapSales(param).catch(() => []),
    ])
      .then(([market, scrap]) => {
        if (cancelled) return;
        const marketRows: LedgerRow[] = (market ?? []).map((sale: any) => ({
          id: sale.id,
          date: toIso(sale.soldAt),
          kind: 'MARKET' as const,
          materialCode: sale.categoryCode,
          materialName: sale.categoryName,
          weightKg: sale.weightKg ?? 0,
          pricePerKg: sale.marketPriceKg ?? 0,
          revenue: sale.totalRevenue ?? 0,
          buyerName: sale.buyerName ?? '',
        }));
        const scrapRows: LedgerRow[] = (scrap ?? []).map((sale: any) => ({
          id: sale.id,
          date: toIso(sale.soldAt),
          kind: 'SCRAP' as const,
          materialCode: sale.materialCode,
          materialName: sale.materialName,
          weightKg: sale.weightKg ?? 0,
          pricePerKg: sale.marketPriceKg ?? 0,
          revenue: sale.totalRevenue ?? 0,
          buyerName: sale.buyerName ?? '',
        }));
        setRows([...marketRows, ...scrapRows]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [param]);

  return { rows, loading };
}
