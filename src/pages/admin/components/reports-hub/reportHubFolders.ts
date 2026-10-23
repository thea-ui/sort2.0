import type {
  HubFolderNode,
  HubRootFolder,
  LeaderboardRecord,
  LedgerRow,
  PointRecord,
  ReportHubRow,
  StockRecord,
  WalkInRow,
} from './reportHubTypes';
import type { AssetTaxonomy } from './reportHubRows';
import {
  MIXED_RECYCLABLE,
  OTHER_ITEM_KEY,
  RECYCLABLE_MATERIALS,
  SCRAP_MATERIALS,
  normalizeStream,
} from './reportHubRows';

function latestOf(items: { date: string }[]): string | null {
  let latest: number | null = null;
  let latestIso: string | null = null;
  for (const item of items) {
    const time = new Date(item.date).getTime();
    if (Number.isNaN(time)) continue;
    if (latest === null || time > latest) {
      latest = time;
      latestIso = item.date;
    }
  }
  return latestIso;
}

function sumCount(items: unknown[]): number {
  return items.length;
}

// ── Waste ──────────────────────────────────────────────────────────────

export function buildWasteFolder(wasteRows: ReportHubRow[]): HubRootFolder {
  const streamRows = (stream: string) =>
    wasteRows.filter((row) => normalizeStream(row.stream) === stream);

  const makeStreamLeaf = (
    id: string,
    name: string,
    stream: string,
    rows: ReportHubRow[],
  ): HubFolderNode => ({
    id,
    name,
    count: sumCount(rows),
    latestAt: latestOf(rows),
    print: { section: 'waste', stream },
  });

  const recyclableRows = streamRows('RECYCLABLE');
  const materialFolders: HubFolderNode[] = RECYCLABLE_MATERIALS.map((material) => {
    const rows = recyclableRows.filter((row) => row.materialCode === material.code);
    return {
      id: `waste:RECYCLABLE:${material.code}`,
      name: material.name,
      count: sumCount(rows),
      latestAt: latestOf(rows),
      print: { section: 'waste', stream: 'RECYCLABLE', material: material.code },
    };
  });

  const mixedRows = recyclableRows.filter((row) => row.materialCode === MIXED_RECYCLABLE.code);
  if (mixedRows.length > 0) {
    materialFolders.push({
      id: `waste:RECYCLABLE:${MIXED_RECYCLABLE.code}`,
      name: MIXED_RECYCLABLE.name,
      count: mixedRows.length,
      latestAt: latestOf(mixedRows),
      print: { section: 'waste', stream: 'RECYCLABLE', material: MIXED_RECYCLABLE.code },
    });
  }

  const children: HubFolderNode[] = [
    makeStreamLeaf('waste:BIODEGRADABLE', 'Biodegradable', 'BIODEGRADABLE', streamRows('BIODEGRADABLE')),
    makeStreamLeaf(
      'waste:NON_BIODEGRADABLE',
      'Non-Biodegradable',
      'NON_BIODEGRADABLE',
      streamRows('NON_BIODEGRADABLE'),
    ),
    {
      id: 'waste:RECYCLABLE',
      name: 'Recyclable',
      count: recyclableRows.length,
      latestAt: latestOf(recyclableRows),
      children: materialFolders,
    },
  ];

  return {
    id: 'waste',
    section: 'WASTE',
    name: 'Waste Reports',
    description: 'Biodegradable, Non-Biodegradable, Recyclable',
    count: wasteRows.length,
    latestAt: latestOf(wasteRows),
    children,
  };
}

// ── Asset ──────────────────────────────────────────────────────────────

export function buildAssetFolder(assetRows: ReportHubRow[], taxonomy: AssetTaxonomy): HubRootFolder {
  const normalize = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const groups = new Map<string, ReportHubRow[]>();

  for (const row of assetRows) {
    const key = normalize(row.assetCategoryCode ?? 'other');
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }

  const categoryFolders: HubFolderNode[] = [];
  const covered = new Set<string>();

  for (const category of taxonomy.categories) {
    const key = normalize(category.code);
    const rows = groups.get(key) ?? [];
    covered.add(key);

    const presetGroup = taxonomy.groups.find(
      (group) => group.categoryId === category.id || group.category === category.name,
    );
    const itemFolders: HubFolderNode[] = [];

    if (presetGroup && presetGroup.items.length > 0) {
      for (const item of presetGroup.items) {
        if (!item.enabled) continue;
        const itemRows = rows.filter((row) => row.assetItemName === item.name);
        itemFolders.push({
          id: `asset:${category.code}:${item.id}`,
          name: item.name,
          count: itemRows.length,
          latestAt: latestOf(itemRows),
          print: { section: 'asset', categoryCode: category.code, itemName: item.name },
        });
      }

      const otherRows = rows.filter((row) => !row.assetItemName);
      if (otherRows.length > 0) {
        itemFolders.push({
          id: `asset:${category.code}:other`,
          name: 'Other items',
          count: otherRows.length,
          latestAt: latestOf(otherRows),
          print: { section: 'asset', categoryCode: category.code, itemName: OTHER_ITEM_KEY },
        });
      }
    }

    categoryFolders.push({
      id: `asset:${category.code}`,
      name: category.name,
      subtitle: category.code,
      count: rows.length,
      latestAt: latestOf(rows),
      children: itemFolders.length > 0 ? itemFolders : undefined,
      print: itemFolders.length === 0 ? { section: 'asset', categoryCode: category.code } : undefined,
    });
  }

  // Categories seen in data but missing from settings (deleted/legacy).
  for (const [key, rows] of groups.entries()) {
    if (covered.has(key)) continue;
    const name = rows[0]?.assetCategoryName ?? 'Other';
    categoryFolders.push({
      id: `asset:${key.toLowerCase()}`,
      name,
      subtitle: key.toLowerCase(),
      count: rows.length,
      latestAt: latestOf(rows),
      print: { section: 'asset', categoryCode: rows[0]?.assetCategoryCode ?? key.toLowerCase() },
    });
  }

  return {
    id: 'asset',
    section: 'ASSET',
    name: 'Asset Reports',
    description: 'Furniture, Electronics, Fixtures, Equipment and more',
    count: assetRows.length,
    latestAt: latestOf(assetRows),
    children: categoryFolders,
  };
}

// ── Ledger (sold scraps + walk-in bottles) ─────────────────────────────

export function buildLedgerFolder(ledgerRows: LedgerRow[], walkInRows: WalkInRow[] = []): HubRootFolder {
  const marketRows = ledgerRows.filter((row) => row.kind === 'MARKET');
  const scrapRows = ledgerRows.filter((row) => row.kind === 'SCRAP');

  const materialChildren = (
    rows: LedgerRow[],
    canonical: { code: string; name: string }[],
    section: 'ledger-market' | 'ledger-scrap',
    prefix: string,
  ): HubFolderNode[] => {
    const folders: HubFolderNode[] = canonical.map((material) => {
      const matches = rows.filter((row) => row.materialCode === material.code);
      return {
        id: `${prefix}:${material.code}`,
        name: material.name,
        count: matches.length,
        latestAt: latestOf(matches),
        print: { section, material: material.code },
      };
    });

    const knownCodes = new Set(canonical.map((material) => material.code));
    const extras = new Map<string, LedgerRow[]>();
    for (const row of rows) {
      if (knownCodes.has(row.materialCode)) continue;
      const list = extras.get(row.materialCode) ?? [];
      list.push(row);
      extras.set(row.materialCode, list);
    }
    for (const [code, matches] of extras.entries()) {
      folders.push({
        id: `${prefix}:${code}`,
        name: matches[0]?.materialName ?? code,
        count: matches.length,
        latestAt: latestOf(matches),
        print: { section, material: code },
      });
    }
    return folders;
  };

  const soldRecyclables: HubFolderNode = {
    id: 'ledger:market',
    name: 'Recyclables Sold',
    subtitle: 'Market sales of recovered recyclables',
    count: marketRows.length,
    latestAt: latestOf(marketRows),
    children: materialChildren(marketRows, RECYCLABLE_MATERIALS, 'ledger-market', 'ledger:market'),
  };

  const soldScrap: HubFolderNode = {
    id: 'ledger:scrap',
    name: 'Asset Scrap Sold',
    subtitle: 'Unserviceable assets sold by material',
    count: scrapRows.length,
    latestAt: latestOf(scrapRows),
    children: materialChildren(scrapRows, SCRAP_MATERIALS, 'ledger-scrap', 'ledger:scrap'),
  };

  const walkIn: HubFolderNode = {
    id: 'ledger:walkin',
    name: 'Walk-in Bottles',
    subtitle: 'Bottle turnovers recorded at the MRF station',
    count: walkInRows.length,
    latestAt: latestOf(walkInRows),
    print: { section: 'walkin' },
  };

  const allRows = [...ledgerRows, ...walkInRows];

  return {
    id: 'ledger',
    section: 'LEDGER',
    name: 'Ledger (General)',
    description: 'Scraps sold and walk-in bottle turnovers',
    count: allRows.length,
    latestAt: latestOf(allRows),
    children: [soldRecyclables, soldScrap, walkIn],
  };
}

// ── Year records (points ledger, leaderboard, market stock) ────────────

export function buildRecordsFolder(
  points: PointRecord[],
  leaderboard: LeaderboardRecord[],
  stock: StockRecord[],
): HubRootFolder {
  const pointsLeaf: HubFolderNode = {
    id: 'records:points',
    name: 'Points Ledger',
    subtitle: 'Every point awarded or deducted',
    count: points.length,
    latestAt: latestOf(points),
    print: { section: 'points' },
  };

  const leaderboardLeaf: HubFolderNode = {
    id: 'records:leaderboard',
    name: 'Leaderboard (Closing Points)',
    subtitle: 'Final ranking snapshot saved at rollover',
    count: leaderboard.length,
    latestAt: null,
    print: { section: 'leaderboard' },
  };

  const stockLeaf: HubFolderNode = {
    id: 'records:stock',
    name: 'Market Stock Snapshots',
    subtitle: 'Opening and closing kilos per material',
    count: stock.length,
    latestAt: null,
    print: { section: 'stock' },
  };

  return {
    id: 'records',
    section: 'RECORDS',
    name: 'Year Records',
    description: 'Points ledger, leaderboard and market stock snapshots',
    count: points.length + leaderboard.length + stock.length,
    latestAt: latestOf(points),
    children: [pointsLeaf, leaderboardLeaf, stockLeaf],
  };
}
