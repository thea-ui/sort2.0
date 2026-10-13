import { describe, expect, it } from 'vitest';
import {
  normalizePillarCode,
  prettifyPillarTag,
  resolveCategoryItems,
  selectVisibleCategoryCodes,
  type SetupCategory,
  type SetupPresetGroup,
} from '../reportSetupMerge';

const FALLBACK_CODES = ['furniture', 'electronics', 'fixtures', 'equipment', 'other'];

function category(code: string, name: string, enabled = true): SetupCategory {
  return { code, name, enabled };
}

describe('normalizePillarCode', () => {
  it('trims and lowercases codes', () => {
    expect(normalizePillarCode('  Furniture ')).toBe('furniture');
  });
});

describe('selectVisibleCategoryCodes', () => {
  it('falls back to the legacy codes until the server list has loaded', () => {
    expect(selectVisibleCategoryCodes([], false, FALLBACK_CODES)).toEqual(FALLBACK_CODES);
  });

  it('hides categories that were deleted from the server list', () => {
    const categories = [category('electronics', 'Electronics'), category('other', 'Other')];
    expect(selectVisibleCategoryCodes(categories, true, FALLBACK_CODES)).toEqual(['electronics', 'other']);
  });

  it('hides disabled categories and never includes waste', () => {
    const categories = [
      category('furniture', 'Furniture', false),
      category('electronics', 'Electronics', true),
      category('waste', 'Waste', true),
    ];
    expect(selectVisibleCategoryCodes(categories, true, FALLBACK_CODES)).toEqual(['electronics']);
  });

  it('returns an empty list when the admin deleted every category', () => {
    expect(selectVisibleCategoryCodes([], true, FALLBACK_CODES)).toEqual([]);
  });

  it('includes newly added categories', () => {
    const categories = [category('appliances', 'Appliances')];
    expect(selectVisibleCategoryCodes(categories, true, FALLBACK_CODES)).toEqual(['appliances']);
  });
});

describe('resolveCategoryItems', () => {
  const fallbackItems = [
    { id: 'f-1', name: 'Office Chair', enabled: true },
    { id: 'f-2', name: 'Student Desk', enabled: true },
  ];

  it('returns only the enabled server items for the category', () => {
    const groups: SetupPresetGroup[] = [
      {
        category: 'Furniture',
        code: 'furniture',
        items: [
          { id: 'p-1', name: 'Arm Chair', enabled: true },
          { id: 'p-2', name: 'Bookshelf', enabled: false },
        ],
      },
    ];
    const items = resolveCategoryItems(category('furniture', 'Furniture'), groups, true, fallbackItems);
    expect(items.map((item) => item.name)).toEqual(['Arm Chair']);
  });

  it('never resurrects hardcoded items once the groups have loaded', () => {
    const items = resolveCategoryItems(category('furniture', 'Furniture'), [], true, fallbackItems);
    expect(items).toEqual([]);
  });

  it('keeps hardcoded items as an offline fallback before groups load', () => {
    const items = resolveCategoryItems(category('furniture', 'Furniture'), [], false, fallbackItems);
    expect(items).toEqual(fallbackItems);
  });

  it('matches renamed categories by code', () => {
    const groups: SetupPresetGroup[] = [
      { category: 'Classroom Furniture', code: 'furniture', items: [{ id: 'p-1', name: 'Table', enabled: true }] },
    ];
    const renamed = category('furniture', 'Classroom Furniture');
    expect(resolveCategoryItems(renamed, groups, true, fallbackItems).map((item) => item.name)).toEqual(['Table']);
  });
});

describe('prettifyPillarTag', () => {
  it('maps waste to the shared label', () => {
    expect(prettifyPillarTag('WASTE')).toBe('Waste/Bin');
  });

  it('title-cases custom category tags', () => {
    expect(prettifyPillarTag('APPLIANCES')).toBe('Appliances');
    expect(prettifyPillarTag('lab-tool')).toBe('Lab Tool');
  });
});
