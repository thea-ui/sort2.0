export interface SetupCategory {
  name: string;
  code: string;
  enabled: boolean;
}

export interface SetupPresetItem {
  id: string;
  name: string;
  enabled: boolean;
}

export interface SetupPresetGroup {
  category: string;
  categoryId?: string;
  code?: string;
  items: SetupPresetItem[];
}

export function normalizePillarCode(value: string): string {
  return (value || '').trim().toLowerCase();
}

/**
 * Category codes shown on the teacher report page. When the server list has
 * loaded it is authoritative: deleted categories disappear and disabled ones
 * are hidden. Until the first successful fetch the legacy hardcoded set keeps
 * the offline form usable.
 */
export function selectVisibleCategoryCodes(
  categories: SetupCategory[],
  categoriesLoaded: boolean,
  fallbackCodes: string[]
): string[] {
  if (!categoriesLoaded) return fallbackCodes;

  const seen = new Set<string>();
  const codes: string[] = [];
  for (const cat of categories) {
    if (!cat.enabled) continue;
    const code = normalizePillarCode(cat.code || cat.name);
    if (!code || code === 'waste' || seen.has(code)) continue;
    seen.add(code);
    codes.push(code);
  }
  return codes;
}

/**
 * Item presets for one visible category. The server group always wins: a
 * deleted preset item never comes back from the hardcoded fallback once the
 * groups have loaded. The fallback is only for the offline/pre-load state.
 */
export function resolveCategoryItems(
  category: SetupCategory,
  presetGroups: SetupPresetGroup[],
  presetGroupsLoaded: boolean,
  fallbackItems: SetupPresetItem[]
): SetupPresetItem[] {
  const code = normalizePillarCode(category.code || category.name);
  const group = presetGroups.find(
    (g) => normalizePillarCode(g.code || g.category) === code
  );
  if (group) return group.items.filter((item) => item.enabled);
  return presetGroupsLoaded ? [] : fallbackItems;
}

export function prettifyPillarTag(rawTag: string): string {
  const trimmed = (rawTag || '').trim();
  if (!trimmed) return 'Waste/Bin';
  if (trimmed.toLowerCase() === 'waste') return 'Waste/Bin';
  return trimmed
    .replace(/[-_]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
