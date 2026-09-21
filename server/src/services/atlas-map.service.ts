import crypto from 'crypto';
import { PrismaClient, SyncStatus } from '@prisma/client';
import {
  SyncCampusImageOptions,
  syncCampusImage,
} from './atlas-map-image.service.js';

const prisma = new PrismaClient();

type FetchLike = typeof fetch;

// ─── Config ────────────────────────────────────────────────────────────

export interface AtlasConfig {
  baseUrl: string;
  schoolId: number;
}

export function getAtlasConfig(overrides: Partial<AtlasConfig> = {}): AtlasConfig {
  const rawBase = overrides.baseUrl ?? process.env.ATLAS_BASE_URL ?? 'http://100.88.55.125:5001/api/v1';
  const rawSchool = overrides.schoolId ?? Number(process.env.ATLAS_SCHOOL_ID ?? 1);
  return {
    baseUrl: String(rawBase).replace(/\/+$/, ''),
    schoolId: Number.isFinite(rawSchool) && rawSchool > 0 ? Math.trunc(rawSchool as number) : 1,
  };
}

// ─── Raw ATLAS payload types (only the fields we mirror) ──────────────

export interface AtlasRawRoom {
  id: number;
  buildingId?: number;
  name: string;
  floor?: number;
  type?: string;
  capacity?: number | null;
  isTeachingSpace?: boolean;
  isSharedFacility?: boolean;
  floorPosition?: number | null;
  features?: unknown;
  updatedAt?: string;
}

export interface AtlasRawBuilding {
  id: number;
  schoolId?: number;
  name: string;
  shortCode?: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string | null;
  rotation?: number;
  floorCount?: number;
  isTeachingBuilding?: boolean;
  gradeScope?: unknown;
  updatedAt?: string;
  rooms?: AtlasRawRoom[];
}

export interface AtlasRawPayload {
  buildings: AtlasRawBuilding[];
}

// ─── Normalized shapes (mirror fields only, deterministic order) ──────

export interface NormalizedRoom {
  atlasId: number;
  name: string;
  floor: number;
  type: string;
  capacity: number | null;
  isTeachingSpace: boolean;
  isSharedFacility: boolean;
  floorPosition: number | null;
  features: unknown[];
  atlasUpdatedAt: string | null;
}

export interface NormalizedBuilding {
  atlasId: number;
  name: string;
  shortCode: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string | null;
  rotation: number;
  floorCount: number;
  isTeachingBuilding: boolean;
  gradeScope: unknown[];
  atlasUpdatedAt: string | null;
  rooms: NormalizedRoom[];
}

export interface NormalizedAtlasMap {
  buildings: NormalizedBuilding[];
}

export class AtlasFetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AtlasFetchError';
  }
}

// ─── Pure helpers (unit-tested) ────────────────────────────────────────

function finiteNumber(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function nonNegative(value: unknown): number {
  const n = finiteNumber(value, 0);
  return n > 0 ? n : 0;
}

function intOr(value: unknown, fallback: number): number {
  const n = finiteNumber(value, fallback);
  return Math.trunc(n);
}

function intOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function isoOrNull(value: unknown): string | null {
  if (typeof value !== 'string' || !value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
}

function normalizeRoom(raw: AtlasRawRoom): NormalizedRoom | null {
  const atlasId = intOr(raw?.id, NaN);
  if (!Number.isFinite(atlasId)) return null;
  return {
    atlasId,
    name: asString(raw.name, `Room ${atlasId}`),
    floor: intOr(raw.floor, 1),
    type: asString(raw.type, 'UNKNOWN').toUpperCase(),
    capacity: intOrNull(raw.capacity),
    isTeachingSpace: raw.isTeachingSpace === true,
    isSharedFacility: raw.isSharedFacility === true,
    floorPosition: intOrNull(raw.floorPosition),
    features: asArray(raw.features),
    atlasUpdatedAt: isoOrNull(raw.updatedAt),
  };
}

function normalizeBuilding(raw: AtlasRawBuilding): NormalizedBuilding | null {
  const atlasId = intOr(raw?.id, NaN);
  if (!Number.isFinite(atlasId)) return null;

  // Duplicate atlasIds inside one payload: last one wins (deterministic).
  const roomsById = new Map<number, NormalizedRoom>();
  for (const rawRoom of asArray(raw.rooms) as AtlasRawRoom[]) {
    const room = normalizeRoom(rawRoom);
    if (room) roomsById.set(room.atlasId, room);
  }

  return {
    atlasId,
    name: asString(raw.name, `Building ${atlasId}`),
    shortCode: typeof raw.shortCode === 'string' && raw.shortCode.trim() ? raw.shortCode : null,
    x: finiteNumber(raw.x, 0),
    y: finiteNumber(raw.y, 0),
    width: nonNegative(raw.width),
    height: nonNegative(raw.height),
    color: typeof raw.color === 'string' ? raw.color : null,
    rotation: finiteNumber(raw.rotation, 0),
    floorCount: Math.max(1, intOr(raw.floorCount, 1)),
    isTeachingBuilding: raw.isTeachingBuilding !== false,
    gradeScope: asArray(raw.gradeScope),
    atlasUpdatedAt: isoOrNull(raw.updatedAt),
    rooms: Array.from(roomsById.values()).sort((a, b) => a.atlasId - b.atlasId),
  };
}

/** Sort + sanitize so the content hash is stable across payload reordering. */
export function normalizeAtlasPayload(raw: AtlasRawPayload): NormalizedAtlasMap {
  const buildingsById = new Map<number, NormalizedBuilding>();
  const buildings = Array.isArray(raw?.buildings) ? raw.buildings : [];
  for (const rawBuilding of buildings) {
    const building = normalizeBuilding(rawBuilding);
    if (building) buildingsById.set(building.atlasId, building);
  }
  return {
    buildings: Array.from(buildingsById.values()).sort((a, b) => a.atlasId - b.atlasId),
  };
}

export function hashNormalizedMap(map: NormalizedAtlasMap): string {
  return crypto.createHash('sha256').update(JSON.stringify(map)).digest('hex');
}

export interface DiffCounts {
  toInsert: number;
  toUpdate: number;
  toDeactivate: number;
  reactivated: number;
}

/**
 * Pure change classification used for counting/logging and unit tests.
 * Deactivation is soft-only: rows are never deleted.
 */
export function diffAtlasCounts(
  existing: { atlasId: number; isActive: boolean }[],
  incomingIds: number[]
): DiffCounts {
  const existingById = new Map(existing.map((row) => [row.atlasId, row]));
  const incoming = new Set(incomingIds);

  let toInsert = 0;
  let toUpdate = 0;
  let reactivated = 0;

  for (const id of incoming) {
    const current = existingById.get(id);
    if (!current) {
      toInsert++;
    } else {
      toUpdate++;
      if (!current.isActive) reactivated++;
    }
  }

  let toDeactivate = 0;
  for (const row of existing) {
    if (!incoming.has(row.atlasId) && row.isActive) toDeactivate++;
  }

  return { toInsert, toUpdate, toDeactivate, reactivated };
}

// ─── Fetch (conditional GET) ───────────────────────────────────────────

export interface AtlasFetchResult {
  notModified: boolean;
  etag?: string;
  payload?: AtlasRawPayload;
}

export interface FetchAtlasOptions {
  baseUrl: string;
  schoolId: number;
  etag?: string | null;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
}

export async function fetchAtlasBuildings(options: FetchAtlasOptions): Promise<AtlasFetchResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const url = `${options.baseUrl}/map/schools/${options.schoolId}/buildings`;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.etag) headers['If-None-Match'] = options.etag;

  let res: Response;
  try {
    res = await fetchImpl(url, {
      headers,
      signal: AbortSignal.timeout(options.timeoutMs ?? 15000),
    });
  } catch (error: any) {
    throw new AtlasFetchError(`ATLAS unreachable: ${error?.message || 'network error'}`);
  }

  if (res.status === 304) {
    return { notModified: true, etag: options.etag ?? undefined };
  }
  if (!res.ok) {
    throw new AtlasFetchError(`ATLAS buildings returned ${res.status}`);
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new AtlasFetchError('ATLAS buildings payload is not valid JSON');
  }

  if (!json || typeof json !== 'object' || !Array.isArray((json as AtlasRawPayload).buildings)) {
    throw new AtlasFetchError('ATLAS buildings payload is malformed (missing buildings[])');
  }

  return {
    notModified: false,
    etag: res.headers.get('etag') ?? undefined,
    payload: json as AtlasRawPayload,
  };
}

// ─── Sync ──────────────────────────────────────────────────────────────

export interface AtlasSyncSummary {
  status: SyncStatus;
  unchanged: boolean;
  schoolId: number;
  buildingsSeen: number;
  roomsSeen: number;
  inserted: number;
  updated: number;
  deactivated: number;
  imageChanged: boolean;
  durationMs: number;
  error?: string;
}

export interface AtlasSyncOptions {
  baseUrl?: string;
  schoolId?: number;
  fetchImpl?: FetchLike;
  prismaClient?: PrismaClient;
}

let inFlightSync: Promise<AtlasSyncSummary> | null = null;

async function writeSyncLog(db: PrismaClient, data: {
  schoolId: number;
  status: SyncStatus;
  unchanged: boolean;
  buildingsSeen: number;
  roomsSeen: number;
  inserted: number;
  updated: number;
  deactivated: number;
  imageChanged: boolean;
  errorMessage: string | null;
  durationMs: number;
}): Promise<void> {
  try {
    await db.atlasSyncLog.create({ data });
  } catch (logError: any) {
    console.warn('[Atlas] Failed to write sync log:', logError?.message);
  }
}

async function applyMapTransaction(
  db: PrismaClient,
  schoolId: number,
  map: NormalizedAtlasMap
): Promise<{ inserted: number; updated: number; deactivated: number }> {
  const existingBuildings = await db.atlasBuilding.findMany({
    where: { schoolId },
    select: { atlasId: true, isActive: true },
  });
  const existingRooms = await db.atlasRoom.findMany({
    select: { atlasId: true, isActive: true },
  });

  const buildingIds = map.buildings.map((b) => b.atlasId);
  const roomIds = map.buildings.flatMap((b) => b.rooms.map((r) => r.atlasId));

  const buildingCounts = diffAtlasCounts(existingBuildings, buildingIds);
  const roomCounts = diffAtlasCounts(existingRooms, roomIds);

  const seenBuildingIds = new Set(buildingIds);
  const staleBuildingIds = existingBuildings
    .filter((b) => b.isActive && !seenBuildingIds.has(b.atlasId))
    .map((b) => b.atlasId);
  const seenRoomIds = new Set(roomIds);
  const staleRoomIds = existingRooms
    .filter((r) => r.isActive && !seenRoomIds.has(r.atlasId))
    .map((r) => r.atlasId);

  await db.$transaction(
    async (tx) => {
      for (const building of map.buildings) {
        const data = {
          schoolId,
          name: building.name,
          shortCode: building.shortCode,
          x: building.x,
          y: building.y,
          width: building.width,
          height: building.height,
          color: building.color,
          rotation: building.rotation,
          floorCount: building.floorCount,
          isTeachingBuilding: building.isTeachingBuilding,
          gradeScope: building.gradeScope as any,
          isActive: true,
          atlasUpdatedAt: building.atlasUpdatedAt ? new Date(building.atlasUpdatedAt) : null,
        };

        const record = await tx.atlasBuilding.upsert({
          where: { atlasId: building.atlasId },
          create: { atlasId: building.atlasId, ...data },
          update: data,
          select: { id: true },
        });

        for (const room of building.rooms) {
          const roomData = {
            atlasBuildingId: record.id,
            name: room.name,
            floor: room.floor,
            type: room.type,
            capacity: room.capacity,
            isTeachingSpace: room.isTeachingSpace,
            isSharedFacility: room.isSharedFacility,
            floorPosition: room.floorPosition,
            features: room.features as any,
            isActive: true,
            atlasUpdatedAt: room.atlasUpdatedAt ? new Date(room.atlasUpdatedAt) : null,
          };
          await tx.atlasRoom.upsert({
            where: { atlasId: room.atlasId },
            create: { atlasId: room.atlasId, ...roomData },
            update: roomData,
          });
        }
      }

      if (staleRoomIds.length > 0) {
        await tx.atlasRoom.updateMany({
          where: { atlasId: { in: staleRoomIds } },
          data: { isActive: false },
        });
      }
      if (staleBuildingIds.length > 0) {
        await tx.atlasBuilding.updateMany({
          where: { schoolId, atlasId: { in: staleBuildingIds } },
          data: { isActive: false },
        });
      }
    },
    { timeout: 30000 }
  );

  return {
    inserted: buildingCounts.toInsert + roomCounts.toInsert,
    updated: buildingCounts.toUpdate + roomCounts.toUpdate,
    deactivated: buildingCounts.toDeactivate + roomCounts.toDeactivate,
  };
}

/** Clean shutdown hook for CLI usage (avoids libuv assertion on Windows). */
export async function disconnectAtlasMapService(): Promise<void> {
  try {
    if (!(globalThis as any).__atlasSyncDisconnected) {
      await prisma.$disconnect();
      (globalThis as any).__atlasSyncDisconnected = true;
    }
  } catch {
    /* best-effort */
  }
}

export async function syncAtlasMap(options: AtlasSyncOptions = {}): Promise<AtlasSyncSummary> {
  // Coalesce concurrent triggers: the second caller awaits the first result.
  if (inFlightSync) return inFlightSync;

  inFlightSync = (async (): Promise<AtlasSyncSummary> => {
    const started = Date.now();
    const config = getAtlasConfig({
      baseUrl: options.baseUrl,
      schoolId: options.schoolId,
    });
    const db = options.prismaClient ?? prisma;
    const fetchImpl = options.fetchImpl ?? fetch;

    let buildingsSeen = 0;
    let roomsSeen = 0;
    let inserted = 0;
    let updated = 0;
    let deactivated = 0;
    let imageChanged = false;
    let status: SyncStatus = SyncStatus.SUCCESS;
    let errorMessage: string | null = null;

    try {
      const snapshot = await db.atlasMapSnapshot.findUnique({ where: { schoolId: config.schoolId } });

      const fetched = await fetchAtlasBuildings({
        baseUrl: config.baseUrl,
        schoolId: config.schoolId,
        etag: snapshot?.etag ?? undefined,
        fetchImpl,
      });

      const finishUnchanged = async (etag?: string | null): Promise<AtlasSyncSummary> => {
        buildingsSeen = snapshot?.buildingCount ?? 0;
        roomsSeen = snapshot?.roomCount ?? 0;
        if (snapshot) {
          await db.atlasMapSnapshot.update({
            where: { schoolId: config.schoolId },
            data: {
              fetchedAt: new Date(),
              ...(etag !== undefined ? { etag: etag ?? null } : {}),
            },
          });
        }
        const durationMs = Date.now() - started;
        await writeSyncLog(db, {
          schoolId: config.schoolId,
          status: SyncStatus.SUCCESS,
          unchanged: true,
          buildingsSeen,
          roomsSeen,
          inserted: 0,
          updated: 0,
          deactivated: 0,
          imageChanged: false,
          errorMessage: null,
          durationMs,
        });
        return {
          status: SyncStatus.SUCCESS,
          unchanged: true,
          schoolId: config.schoolId,
          buildingsSeen,
          roomsSeen,
          inserted: 0,
          updated: 0,
          deactivated: 0,
          imageChanged: false,
          durationMs,
        };
      };

      if (fetched.notModified) {
        return await finishUnchanged();
      }

      const normalized = normalizeAtlasPayload(fetched.payload as AtlasRawPayload);
      const contentHash = hashNormalizedMap(normalized);
      buildingsSeen = normalized.buildings.length;
      roomsSeen = normalized.buildings.reduce((acc, b) => acc + b.rooms.length, 0);

      if (snapshot && snapshot.contentHash === contentHash) {
        return await finishUnchanged(fetched.etag);
      }

      const counts = await applyMapTransaction(db, config.schoolId, normalized);
      inserted = counts.inserted;
      updated = counts.updated;
      deactivated = counts.deactivated;

      // Campus image is best-effort: a failure downgrades the run to PARTIAL
      // but must never discard the successfully mirrored map data.
      let imageResult: {
        changed: boolean;
        campusImageUrl: string | null;
        campusImagePath: string | null;
        campusImageHash: string | null;
      };
      try {
        const imagePayload = await fetchCampusImageDescriptor(config, fetchImpl);
        imageResult = await syncCampusImage({
          schoolId: config.schoolId,
          rawUrl: imagePayload,
          previousPath: snapshot?.campusImagePath ?? null,
          previousHash: snapshot?.campusImageHash ?? null,
          baseUrl: config.baseUrl,
          fetchImpl,
          assetsDir: (options as SyncCampusImageOptions).assetsDir,
        });
        imageChanged = imageResult.changed;
      } catch (imageError: any) {
        status = SyncStatus.PARTIAL;
        errorMessage = `campus image: ${imageError?.message || 'unknown error'}`;
        imageResult = {
          changed: false,
          campusImageUrl: snapshot?.campusImageUrl ?? null,
          campusImagePath: snapshot?.campusImagePath ?? null,
          campusImageHash: snapshot?.campusImageHash ?? null,
        };
      }

      const snapshotData = {
        etag: fetched.etag ?? null,
        contentHash,
        buildingCount: buildingsSeen,
        roomCount: roomsSeen,
        campusImageUrl: imageResult.campusImageUrl,
        campusImagePath: imageResult.campusImagePath,
        campusImageHash: imageResult.campusImageHash,
        fetchedAt: new Date(),
        changedAt: new Date(),
      };

      await db.atlasMapSnapshot.upsert({
        where: { schoolId: config.schoolId },
        create: { schoolId: config.schoolId, ...snapshotData },
        update: snapshotData,
      });

      const durationMs = Date.now() - started;
      await writeSyncLog(db, {
        schoolId: config.schoolId,
        status,
        unchanged: false,
        buildingsSeen,
        roomsSeen,
        inserted,
        updated,
        deactivated,
        imageChanged,
        errorMessage,
        durationMs,
      });

      return {
        status,
        unchanged: false,
        schoolId: config.schoolId,
        buildingsSeen,
        roomsSeen,
        inserted,
        updated,
        deactivated,
        imageChanged,
        durationMs,
        ...(errorMessage ? { error: errorMessage } : {}),
      };
    } catch (error: any) {
      const durationMs = Date.now() - started;
      await writeSyncLog(db, {
        schoolId: config.schoolId,
        status: SyncStatus.FAILED,
        unchanged: false,
        buildingsSeen,
        roomsSeen,
        inserted: 0,
        updated: 0,
        deactivated: 0,
        imageChanged: false,
        errorMessage: String(error?.message || error).slice(0, 1000),
        durationMs,
      });
      throw error;
    }
  })().finally(() => {
    inFlightSync = null;
  });

  return inFlightSync;
}

async function fetchCampusImageDescriptor(
  config: AtlasConfig,
  fetchImpl: FetchLike
): Promise<string | null> {
  const url = `${config.baseUrl}/map/schools/${config.schoolId}/campus-image`;
  try {
    const res = await fetchImpl(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { campusImageUrl?: unknown };
    return typeof json?.campusImageUrl === 'string' ? json.campusImageUrl : null;
  } catch {
    return null;
  }
}
