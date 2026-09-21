import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { requireAdmin, requireRole } from '../middleware/auth.js';
import { getAtlasConfig, syncAtlasMap } from '../services/atlas-map.service.js';
import { ATLAS_ASSETS_DIR } from '../services/atlas-map-image.service.js';
import {
  getAtlasSyncSettings,
  rescheduleAtlasSync,
} from '../services/atlas-sync-scheduler.service.js';

const router = Router();
const prisma = new PrismaClient();

const ALL_VIEWER_ROLES = ['STUDENT', 'TEACHER', 'MRF', 'ADMIN'] as const;

const CONTENT_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

const atlasSyncLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 8, // admin-only manual trigger; protects ATLAS from hammering while keeping smoke+audit runs green

  standardHeaders: false,
  legacyHeaders: false,
  handler: (_req, res) =>
    res.status(429).json({
      error: 'Too many sync requests. Try again in a minute.',
      code: 'RATE_LIMITED',
    }),
});

// GET /api/atlas/map — any authenticated role, read-only mirror.
router.get(
  '/map',
  requireRole(...ALL_VIEWER_ROLES),
  async (_req: Request, res: Response): Promise<any> => {
    try {
      const { schoolId } = getAtlasConfig();
      const snapshot = await prisma.atlasMapSnapshot.findUnique({ where: { schoolId } });

      if (!snapshot) {
        return res.json({
          schoolId,
          syncedAt: null,
          stale: true,
          buildings: [],
          campusImageUrl: null,
        });
      }

      const buildings = await prisma.atlasBuilding.findMany({
        where: { schoolId, isActive: true },
        orderBy: { atlasId: 'asc' },
        include: {
          rooms: {
            where: { isActive: true },
            orderBy: [{ floor: 'asc' }, { floorPosition: 'asc' }, { atlasId: 'asc' }],
          },
        },
      });

      // A snapshot is stale after two missed auto-sync cycles.
      const { atlasSyncIntervalMinutes } = await getAtlasSyncSettings();
      const staleAfterMs = Math.max(1, atlasSyncIntervalMinutes) * 2 * 60 * 1000;
      const ageMs = Date.now() - snapshot.fetchedAt.getTime();
      const stale = ageMs > staleAfterMs;

      return res.json({
        schoolId,
        syncedAt: snapshot.fetchedAt.toISOString(),
        stale,
        campusImageUrl: snapshot.campusImagePath ? '/api/atlas/campus-image' : null,
        buildings: buildings.map((building) => ({
          atlasId: building.atlasId,
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
          rooms: building.rooms.map((room) => ({
            atlasId: room.atlasId,
            name: room.name,
            floor: room.floor,
            type: room.type,
            capacity: room.capacity,
            isTeachingSpace: room.isTeachingSpace,
            isSharedFacility: room.isSharedFacility,
            floorPosition: room.floorPosition,
            features: room.features,
          })),
        })),
      });
    } catch (error: any) {
      console.error('[Atlas] Fetch map error:', error?.message);
      return res.status(500).json({ error: 'Failed to load campus map' });
    }
  }
);

// GET /api/atlas/campus-image — any authenticated role, local mirror of the ATLAS image.
router.get(
  '/campus-image',
  requireRole(...ALL_VIEWER_ROLES),
  async (_req: Request, res: Response): Promise<any> => {
    try {
      const { schoolId } = getAtlasConfig();
      const snapshot = await prisma.atlasMapSnapshot.findUnique({ where: { schoolId } });
      const fileName = snapshot?.campusImagePath ? path.basename(snapshot.campusImagePath) : null;

      if (!fileName) {
        return res.status(404).json({ error: 'No campus image available', code: 'NOT_FOUND' });
      }

      const absolute = path.resolve(ATLAS_ASSETS_DIR, fileName);
      if (!absolute.startsWith(path.resolve(ATLAS_ASSETS_DIR)) || !fs.existsSync(absolute)) {
        return res.status(404).json({ error: 'No campus image available', code: 'NOT_FOUND' });
      }

      const ext = path.extname(absolute).toLowerCase();
      const contentType = CONTENT_TYPES[ext];
      if (!contentType) {
        return res.status(404).json({ error: 'No campus image available', code: 'NOT_FOUND' });
      }

      const etag = snapshot?.campusImageHash ? `"${snapshot.campusImageHash}"` : undefined;
      if (etag && _req.headers['if-none-match'] === etag) {
        return res.status(304).end();
      }

      const body = fs.readFileSync(absolute);
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'private, max-age=300');
      if (etag) res.setHeader('ETag', etag);
      return res.send(body);
    } catch (error: any) {
      console.error('[Atlas] Fetch campus image error:', error?.message);
      return res.status(500).json({ error: 'Failed to load campus image' });
    }
  }
);

// POST /api/atlas/sync — admin only, manual refresh.
router.post(
  '/sync',
  requireAdmin,
  atlasSyncLimiter,
  async (_req: Request, res: Response): Promise<any> => {
    try {
      const result = await syncAtlasMap();
      return res.json(result);
    } catch (error: any) {
      console.warn('[Atlas] Manual sync failed:', error?.message);
      return res.status(503).json({
        error: `ATLAS sync failed: ${error?.message || 'unknown error'}`,
        code: 'ATLAS_UNAVAILABLE',
      });
    }
  }
);

// PATCH /api/atlas/settings — admin only, auto-sync cadence.
router.patch('/settings', requireAdmin, async (req: Request, res: Response): Promise<any> => {
  try {
    const { syncMode, syncIntervalMinutes } = req.body ?? {};

    if (syncMode !== undefined && !['AUTO', 'MANUAL'].includes(syncMode)) {
      return res.status(400).json({ error: 'syncMode must be AUTO or MANUAL', code: 'INVALID_BODY' });
    }
    if (
      syncIntervalMinutes !== undefined &&
      (!Number.isInteger(syncIntervalMinutes) || syncIntervalMinutes < 5 || syncIntervalMinutes > 1440)
    ) {
      return res.status(400).json({
        error: 'syncIntervalMinutes must be an integer between 5 and 1440',
        code: 'INVALID_BODY',
      });
    }

    const data: { atlasSyncMode?: string; atlasSyncIntervalMinutes?: number } = {};
    if (syncMode !== undefined) data.atlasSyncMode = syncMode;
    if (syncIntervalMinutes !== undefined) data.atlasSyncIntervalMinutes = syncIntervalMinutes;

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'No settings provided', code: 'MISSING_FIELDS' });
    }

    await prisma.systemSetting.upsert({
      where: { id: 'default_setting' },
      create: { id: 'default_setting', ...data },
      update: data,
    });

    await rescheduleAtlasSync();
    const settings = await getAtlasSyncSettings();
    return res.json(settings);
  } catch (error: any) {
    console.error('[Atlas] Settings update error:', error?.message);
    return res.status(500).json({ error: 'Failed to update ATLAS settings' });
  }
});

// GET /api/atlas/status — admin only, sync history.
router.get('/status', requireAdmin, async (req: Request, res: Response): Promise<any> => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const { schoolId } = getAtlasConfig();

    const logs = await prisma.atlasSyncLog.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const last = logs[0] || null;
    const settings = await getAtlasSyncSettings();
    return res.json({
      schoolId,
      settings,
      lastSync: last
        ? {
            id: last.id,
            status: last.status,
            unchanged: last.unchanged,
            buildingsSeen: last.buildingsSeen,
            roomsSeen: last.roomsSeen,
            inserted: last.inserted,
            updated: last.updated,
            deactivated: last.deactivated,
            imageChanged: last.imageChanged,
            durationMs: last.durationMs,
            error: last.errorMessage,
            createdAt: last.createdAt,
          }
        : null,
      history: logs.map((log) => ({
        id: log.id,
        status: log.status,
        unchanged: log.unchanged,
        buildingsSeen: log.buildingsSeen,
        roomsSeen: log.roomsSeen,
        inserted: log.inserted,
        updated: log.updated,
        deactivated: log.deactivated,
        imageChanged: log.imageChanged,
        durationMs: log.durationMs,
        error: log.errorMessage,
        createdAt: log.createdAt,
      })),
    });
  } catch (error: any) {
    console.error('[Atlas] Status error:', error?.message);
    return res.status(500).json({ error: 'Failed to load sync status' });
  }
});

export default router;
