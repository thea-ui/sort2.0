import type { Page } from '@playwright/test';

const ONE_PX_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

export const FULL_MAP_FIXTURE = {
  schoolId: 1,
  syncedAt: new Date().toISOString(),
  stale: false,
  campusImageUrl: null as string | null,
  buildings: [
    {
      atlasId: 1,
      name: 'Grade 7 Academic Wing',
      shortCode: 'G7AW',
      x: 20,
      y: 20,
      width: 180,
      height: 280,
      color: '#f59e0b',
      rotation: 0,
      floorCount: 4,
      isTeachingBuilding: true,
      rooms: [
        { atlasId: 11, name: 'G7 Room 101', floor: 1, type: 'CLASSROOM', capacity: 45, isTeachingSpace: true, isSharedFacility: false, floorPosition: 0, features: ['Aircon'] },
        { atlasId: 12, name: 'G7 Room 102', floor: 1, type: 'CLASSROOM', capacity: 45, isTeachingSpace: true, isSharedFacility: false, floorPosition: 1, features: [] },
        { atlasId: 13, name: 'G7 Science Lab', floor: 2, type: 'LABORATORY', capacity: 40, isTeachingSpace: true, isSharedFacility: false, floorPosition: 0, features: [] },
      ],
    },
    {
      atlasId: 2,
      name: 'Admin and Learning Commons',
      shortCode: 'ALC',
      x: 400,
      y: 40,
      width: 200,
      height: 160,
      color: '#7c3aed',
      rotation: 0,
      floorCount: 2,
      isTeachingBuilding: false,
      rooms: [
        { atlasId: 21, name: 'Learning Commons', floor: 1, type: 'LIBRARY', capacity: 80, isTeachingSpace: false, isSharedFacility: true, floorPosition: 0, features: [] },
        { atlasId: 22, name: 'Faculty Room', floor: 2, type: 'FACULTY_ROOM', capacity: 20, isTeachingSpace: false, isSharedFacility: false, floorPosition: 1, features: [] },
      ],
    },
    {
      atlasId: 60,
      name: 'Speech Lab',
      shortCode: 'SL',
      x: 680,
      y: 60,
      width: 66,
      height: 74,
      color: '#10B981',
      rotation: 0,
      floorCount: 1,
      isTeachingBuilding: true,
      rooms: [],
    },
  ],
};

export const EMPTY_MAP_FIXTURE = {
  schoolId: 1,
  syncedAt: null,
  stale: true,
  campusImageUrl: null,
  buildings: [],
};

export const STALE_MAP_FIXTURE = {
  ...FULL_MAP_FIXTURE,
  syncedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  stale: true,
};

export async function mockAtlasMap(page: Page, fixture: unknown = FULL_MAP_FIXTURE): Promise<void> {
  await page.route('**/api/atlas/map', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(fixture),
    })
  );
}

/** Fulfils the map request after `delayMs`, exposing the loading window. */
export async function mockAtlasMapDelayed(
  page: Page,
  delayMs: number,
  fixture: unknown = FULL_MAP_FIXTURE
): Promise<void> {
  await page.route('**/api/atlas/map', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(fixture),
    });
  });
}

export async function mockAtlasImage(page: Page, present: boolean): Promise<void> {
  await page.route('**/api/atlas/campus-image', (route) => {
    if (!present) {
      return route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'No campus image available' }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: 'image/png',
      body: Buffer.from(ONE_PX_PNG_BASE64, 'base64'),
    });
  });
}

/**
 * Fails every /api/atlas/map call until `enableSuccess()` is invoked.
 * Deterministic even when the hook revalidates on focus/visibility.
 */
export async function mockAtlasMapFailUntil(
  page: Page,
  fixture: unknown = FULL_MAP_FIXTURE
): Promise<{ enableSuccess: () => void }> {
  let allowSuccess = false;
  await page.route('**/api/atlas/map', (route) => {
    if (!allowSuccess) {
      return route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'boom' }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(fixture),
    });
  });
  return {
    enableSuccess: () => {
      allowSuccess = true;
    },
  };
}
