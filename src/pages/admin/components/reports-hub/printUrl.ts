import type { HubSort, PrintTarget, ReportHubFilters } from './reportHubTypes';
import { DEFAULT_HUB_FILTERS } from './reportHubTypes';

export const PRINT_ROUTE_PATH = '/reports/print';

const SORT_VALUES: HubSort[] = ['newest', 'oldest', 'title', 'weight'];

function appendCommon(params: URLSearchParams, filters: ReportHubFilters): void {
  params.set('year', filters.yearId || 'ALL');
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (filters.statuses.length > 0) params.set('statuses', filters.statuses.join(','));
  if (filters.gradeLevels.length > 0) params.set('grades', filters.gradeLevels.join(','));
  if (filters.query.trim()) params.set('q', filters.query.trim());
  params.set('sort', filters.sort);
}

/** `/reports/print?...` URL that recreates the exact filtered leaf folder. */
export function buildPrintUrl(target: PrintTarget, filters: ReportHubFilters): string {
  const params = new URLSearchParams();
  params.set('section', target.section);
  if (target.stream) params.set('stream', target.stream);
  if (target.material) params.set('material', target.material);
  if (target.categoryCode) params.set('cat', target.categoryCode);
  if (target.itemName) params.set('item', target.itemName);
  appendCommon(params, filters);
  return `${PRINT_ROUTE_PATH}?${params.toString()}`;
}

export interface ParsedPrintParams {
  target: PrintTarget;
  filters: ReportHubFilters;
}

export function parsePrintParams(search: string): ParsedPrintParams {
  const params = new URLSearchParams(search);

  const sectionParam = params.get('section') ?? '';
  const section: PrintTarget['section'] =
    sectionParam === 'asset' || sectionParam === 'ledger-market' || sectionParam === 'ledger-scrap' || sectionParam === 'walkin'
      ? sectionParam
      : 'waste';

  const sortParam = params.get('sort') ?? '';
  const sort = (SORT_VALUES as string[]).includes(sortParam)
    ? (sortParam as HubSort)
    : DEFAULT_HUB_FILTERS.sort;

  const statuses = (params.get('statuses') ?? '')
    .split(',')
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean);

  const gradeLevels = (params.get('grades') ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  return {
    target: {
      section,
      stream: params.get('stream') ?? undefined,
      material: params.get('material') ?? undefined,
      categoryCode: params.get('cat') ?? undefined,
      itemName: params.get('item') ?? undefined,
    },
    filters: {
      yearId: params.get('year') || 'ALL',
      from: params.get('from') || '',
      to: params.get('to') || '',
      statuses,
      gradeLevels,
      query: params.get('q') || '',
      sort,
    },
  };
}
