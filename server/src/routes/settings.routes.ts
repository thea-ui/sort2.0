import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getActiveSchoolYearId } from '../services/rollover.service.js';
import { rescheduleBinReset } from '../services/bin-reset.service.js';
import { rescheduleSync } from '../services/sync-scheduler.service.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// Sync scheduling is a closed set + bounded interval so a bad value can never
// break the mirror sync.
function normalizeSyncMode(value: unknown): string {
  return String(value ?? '').toUpperCase() === 'AUTO' ? 'AUTO' : 'MANUAL';
}

function clampSyncInterval(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 60;
  return Math.min(1440, Math.max(5, Math.round(n)));
}

// 1. Get System Settings
router.get('/', authenticate, async (_req, res) => {
  try {
    let settings = await prisma.systemSetting.findUnique({
      where: { id: 'default_setting' },
    });

    if (!settings) {
      settings = await prisma.systemSetting.create({
        data: {
          id: 'default_setting',
          pointsPerReport: 50,
          pointsPerKgRecyclable: 10,
          warningThreshold: 3,
          certificatePointThreshold: 500,
          quarterGateActive: false,
          smartSyncEnabled: true,
          blueprintPreset: 'DEFAULT',
          maxUnverifiedReports: 3,
          dismissPointPenalty: 10,
          falseReportPointPenalty: 50,
          warningAutoDeductAmount: 10,
          rewardsReservePercent: 20,
          defaultVendorName: 'GreenCycle Recycling Vendor',
        },
      });
    }

    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch settings' });
  }
});

// 2. Update System Settings
router.patch('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const {
      pointsPerReport,
      pointsPerKgRecyclable,
      warningThreshold,
      certificatePointThreshold,
      certificateGraceDays,
      certificateMilestoneName,
      certificateChampionName,
      certificateLeaderName,
      certificateAdvocateName,
      quarterGateActive,
      smartSyncEnabled,
      syncMode,
      syncIntervalMinutes,
      blueprintPreset,
      blueprintUrl,
      maxUnverifiedReports,
      dismissPointPenalty,
      falseReportPointPenalty,
      warningAutoDeductAmount,
      rewardsReservePercent,
      defaultVendorName,
      binResetEnabled,
      binResetTime,
    } = req.body;

    const updated = await prisma.systemSetting.upsert({
      where: { id: 'default_setting' },
      update: {
        ...(pointsPerReport !== undefined && { pointsPerReport: Number(pointsPerReport) }),
        ...(pointsPerKgRecyclable !== undefined && { pointsPerKgRecyclable: Number(pointsPerKgRecyclable) }),
        ...(warningThreshold !== undefined && { warningThreshold: Number(warningThreshold) }),
        ...(certificatePointThreshold !== undefined && { certificatePointThreshold: Number(certificatePointThreshold) }),
        ...(certificateGraceDays !== undefined && { certificateGraceDays: Number(certificateGraceDays) }),
        ...(certificateMilestoneName !== undefined && { certificateMilestoneName: String(certificateMilestoneName) }),
        ...(certificateChampionName !== undefined && { certificateChampionName: String(certificateChampionName) }),
        ...(certificateLeaderName !== undefined && { certificateLeaderName: String(certificateLeaderName) }),
        ...(certificateAdvocateName !== undefined && { certificateAdvocateName: String(certificateAdvocateName) }),
        ...(quarterGateActive !== undefined && { quarterGateActive: Boolean(quarterGateActive) }),
        ...(smartSyncEnabled !== undefined && { smartSyncEnabled: Boolean(smartSyncEnabled) }),
        ...(syncMode !== undefined && { syncMode: normalizeSyncMode(syncMode) }),
        ...(syncIntervalMinutes !== undefined && { syncIntervalMinutes: clampSyncInterval(syncIntervalMinutes) }),
        ...(blueprintPreset !== undefined && { blueprintPreset: String(blueprintPreset) }),
        ...(blueprintUrl !== undefined && { blueprintUrl: String(blueprintUrl) }),
        ...(maxUnverifiedReports !== undefined && { maxUnverifiedReports: Number(maxUnverifiedReports) }),
        ...(dismissPointPenalty !== undefined && { dismissPointPenalty: Number(dismissPointPenalty) }),
        ...(falseReportPointPenalty !== undefined && { falseReportPointPenalty: Number(falseReportPointPenalty) }),
        ...(warningAutoDeductAmount !== undefined && { warningAutoDeductAmount: Number(warningAutoDeductAmount) }),
        ...(rewardsReservePercent !== undefined && { rewardsReservePercent: Number(rewardsReservePercent) }),
        ...(defaultVendorName !== undefined && { defaultVendorName: String(defaultVendorName) }),
        ...(binResetEnabled !== undefined && { binResetEnabled: Boolean(binResetEnabled) }),
        ...(binResetTime !== undefined && { binResetTime: String(binResetTime) }),
      },
      create: {
        id: 'default_setting',
        pointsPerReport: Number(pointsPerReport || 50),
        pointsPerKgRecyclable: Number(pointsPerKgRecyclable || 10),
        warningThreshold: Number(warningThreshold || 3),
        certificatePointThreshold: Number(certificatePointThreshold || 500),
        certificateGraceDays: Number(certificateGraceDays ?? 3),
        certificateMilestoneName: String(certificateMilestoneName || 'Eco-Milestone Certificate'),
        certificateChampionName: String(certificateChampionName || 'Eco-Champion Certificate'),
        certificateLeaderName: String(certificateLeaderName || 'Eco-Leader Certificate'),
        certificateAdvocateName: String(certificateAdvocateName || 'Eco-Advocate Certificate'),
        quarterGateActive: Boolean(quarterGateActive || false),
        smartSyncEnabled: Boolean(smartSyncEnabled ?? true),
        syncMode: normalizeSyncMode(syncMode),
        syncIntervalMinutes: clampSyncInterval(syncIntervalMinutes),
        blueprintPreset: String(blueprintPreset || 'DEFAULT'),
        blueprintUrl: blueprintUrl ? String(blueprintUrl) : null,
        maxUnverifiedReports: Number(maxUnverifiedReports || 3),
        dismissPointPenalty: Number(dismissPointPenalty || 10),
        falseReportPointPenalty: Number(falseReportPointPenalty || 50),
        warningAutoDeductAmount: Number(warningAutoDeductAmount || 10),
        rewardsReservePercent: Number(rewardsReservePercent || 20),
        defaultVendorName: String(defaultVendorName || 'GreenCycle Recycling Vendor'),
        binResetEnabled: Boolean(binResetEnabled ?? true),
        binResetTime: String(binResetTime || '18:00'),
      },
    });

    // Re-schedule the daily reset if the time/flag changed
    rescheduleBinReset().catch((err: any) => {
      console.error('Failed to re-schedule bin reset:', err.message);
    });

    // Re-schedule the EnrollPro mirror sync if the mode/interval changed.
    // Without this the scheduler kept reading defaults and never ran automatically.
    rescheduleSync().catch((err: any) => {
      console.error('Failed to re-schedule EnrollPro sync:', err.message);
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update settings' });
  }
});

// 3. Get Asset Categories & Item Presets (Preset Groups)
router.get('/preset-groups', authenticate, async (_req, res) => {
  try {
    const categories = await prisma.assetCategory.findMany({
      include: {
        presets: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const presetGroups = categories.map((cat) => ({
      category: cat.name,
      categoryId: cat.id,
      code: cat.code,
      items: cat.presets.map((item) => ({
        id: item.id,
        name: item.name,
        enabled: item.enabled,
      })),
    }));

    res.json(presetGroups);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch preset groups' });
  }
});

// 4. Add Preset Item
router.post('/preset-groups/items', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { categoryName, name } = req.body;
    if (!categoryName || !name) {
      return res.status(400).json({ error: 'categoryName and name are required' });
    }

    let category = await prisma.assetCategory.findFirst({
      where: { name: categoryName },
    });

    if (!category) {
      category = await prisma.assetCategory.create({
        data: {
          name: categoryName,
          code: categoryName.toLowerCase().replace(/\s+/g, '-'),
        },
      });
    }

    const newItem = await prisma.itemPreset.create({
      data: {
        categoryId: category.id,
        name: name.trim(),
        enabled: true,
      },
    });

    res.json(newItem);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create preset item' });
  }
});

// 5. Toggle or Update Preset Item
router.patch('/preset-groups/items/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { enabled, name } = req.body;

    const updatedItem = await prisma.itemPreset.update({
      where: { id },
      data: {
        ...(enabled !== undefined && { enabled: Boolean(enabled) }),
        ...(name !== undefined && { name: String(name).trim() }),
      },
    });

    res.json(updatedItem);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update preset item' });
  }
});

// 6. Delete Preset Item
router.delete('/preset-groups/items/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    await prisma.itemPreset.delete({ where: { id } });
    res.json({ message: 'Preset item deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete preset item' });
  }
});

// 7. Get Campus Locations
router.get('/campus-locations', authenticate, async (_req, res) => {
  try {
    const locations = await prisma.campusLocation.findMany({
      orderBy: { code: 'asc' },
    });
    res.json(locations);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch campus locations' });
  }
});

// 8. Save Campus Locations
router.post('/campus-locations', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { locations } = req.body;
    if (!Array.isArray(locations)) {
      return res.status(400).json({ error: 'locations must be an array' });
    }

    // Upsert locations
    const results = await Promise.all(
      locations.map((loc: any) =>
        prisma.campusLocation.upsert({
          where: { code: loc.code || loc.id },
          update: {
            name: loc.name,
            status: loc.status || 'Available',
            x: Number(loc.x),
            y: Number(loc.y),
            streams: loc.streams || [],
          },
          create: {
            code: loc.code || loc.id,
            name: loc.name,
            status: loc.status || 'Available',
            x: Number(loc.x),
            y: Number(loc.y),
            streams: loc.streams || [],
          },
        })
      )
    );

    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to save campus locations' });
  }
});

// 9. Get Room Locations
router.get('/room-locations', authenticate, async (_req, res) => {
  try {
    const rooms = await prisma.roomLocation.findMany({
      where: { enabled: true },
      orderBy: { name: 'asc' },
    });
    res.json(rooms.map((r) => r.name));
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch room locations' });
  }
});

// Asset Categories CRUD
router.get('/asset-categories', authenticate, async (_req, res) => {
  try {
    const categories = await prisma.assetCategory.findMany({
      orderBy: { createdAt: 'asc' },
    });
    res.json(categories);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch asset categories' });
  }
});

router.post('/asset-categories', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, code } = req.body;
    const catCode = code || name.toLowerCase().replace(/\s+/g, '-');
    const category = await prisma.assetCategory.create({
      data: { name: name.trim(), code: catCode, enabled: true },
    });
    res.json(category);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create asset category' });
  }
});

router.patch('/asset-categories/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { name, code, enabled } = req.body;
    const updated = await prisma.assetCategory.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(code !== undefined && { code: code.trim() }),
        ...(enabled !== undefined && { enabled: Boolean(enabled) }),
      },
    });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update asset category' });
  }
});

router.delete('/asset-categories/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    await prisma.assetCategory.delete({ where: { id } });
    res.json({ message: 'Category deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete asset category' });
  }
});

// 10. Waste Types CRUD
router.get('/waste-types', authenticate, async (_req, res) => {
  try {
    const wasteTypes = await prisma.wasteType.findMany({
      orderBy: { createdAt: 'asc' },
    });
    res.json(wasteTypes);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch waste types' });
  }
});

router.post('/waste-types', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, code, description, hexColor } = req.body;
    const newType = await prisma.wasteType.create({
      data: {
        name: name.trim(),
        code: code ? code.trim().toUpperCase() : name.toUpperCase().replace(/\s+/g, '_'),
        description: description ? description.trim() : '',
        hexColor: hexColor || '#10B981',
        enabled: true,
      },
    });
    res.json(newType);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create waste type' });
  }
});

router.patch('/waste-types/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { name, description, hexColor, enabled } = req.body;
    const updated = await prisma.wasteType.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description.trim() }),
        ...(hexColor !== undefined && { hexColor: hexColor.trim() }),
        ...(enabled !== undefined && { enabled: Boolean(enabled) }),
      },
    });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update waste type' });
  }
});

router.delete('/waste-types/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    await prisma.wasteType.delete({ where: { id } });
    res.json({ message: 'Waste type deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete waste type' });
  }
});

// 11. Urgency Levels CRUD
router.get('/urgency-levels', authenticate, async (_req, res) => {
  try {
    const urgencies = await prisma.urgencyLevel.findMany({
      orderBy: { slaHours: 'desc' },
    });
    res.json(urgencies);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch urgency levels' });
  }
});

router.post('/urgency-levels', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { level, code, slaHours, description, badgeStyle } = req.body;
    const newUrgency = await prisma.urgencyLevel.create({
      data: {
        level: level.trim(),
        code: code ? code.trim().toUpperCase() : level.toUpperCase(),
        slaHours: Number(slaHours || 24),
        description: description ? description.trim() : '',
        badgeStyle: badgeStyle || 'bg-[#00A77C] text-white',
        enabled: true,
      },
    });
    res.json(newUrgency);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create urgency level' });
  }
});

router.patch('/urgency-levels/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { level, slaHours, description, badgeStyle, enabled } = req.body;
    const updated = await prisma.urgencyLevel.update({
      where: { id },
      data: {
        ...(level !== undefined && { level: level.trim() }),
        ...(slaHours !== undefined && { slaHours: Number(slaHours) }),
        ...(description !== undefined && { description: description.trim() }),
        ...(badgeStyle !== undefined && { badgeStyle: badgeStyle.trim() }),
        ...(enabled !== undefined && { enabled: Boolean(enabled) }),
      },
    });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update urgency level' });
  }
});

router.delete('/urgency-levels/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    await prisma.urgencyLevel.delete({ where: { id } });
    res.json({ message: 'Urgency level deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete urgency level' });
  }
});

// 12. Asset Conditions CRUD
router.get('/asset-conditions', authenticate, async (_req, res) => {
  try {
    const conditions = await prisma.assetCondition.findMany({
      orderBy: { createdAt: 'asc' },
    });
    res.json(conditions);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch asset conditions' });
  }
});

router.post('/asset-conditions', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, code, description, badgeStyle } = req.body;
    const newCondition = await prisma.assetCondition.create({
      data: {
        name: name.trim(),
        code: code ? code.trim().toUpperCase() : name.toUpperCase().replace(/\s+/g, '_'),
        description: description ? description.trim() : '',
        badgeStyle: badgeStyle || 'bg-amber-100 text-amber-800 border-amber-300',
        enabled: true,
      },
    });
    res.json(newCondition);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create asset condition' });
  }
});

router.patch('/asset-conditions/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { name, description, badgeStyle, enabled } = req.body;
    const updated = await prisma.assetCondition.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description.trim() }),
        ...(badgeStyle !== undefined && { badgeStyle: badgeStyle.trim() }),
        ...(enabled !== undefined && { enabled: Boolean(enabled) }),
      },
    });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update asset condition' });
  }
});

router.delete('/asset-conditions/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    await prisma.assetCondition.delete({ where: { id } });
    res.json({ message: 'Asset condition deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete asset condition' });
  }
});

// 13. Point Rules CRUD
router.get('/point-rules', authenticate, async (_req, res) => {
  try {
    const rules = await prisma.pointRule.findMany({
      orderBy: { rank: 'asc' },
    });
    res.json(rules);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch point rules' });
  }
});

router.patch('/point-rules/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { pointsAwarded, title, description } = req.body;
    const updated = await prisma.pointRule.update({
      where: { id },
      data: {
        ...(pointsAwarded !== undefined && { pointsAwarded: Number(pointsAwarded) }),
        ...(title !== undefined && { title: String(title).trim() }),
        ...(description !== undefined && { description: String(description).trim() }),
      },
    });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update point rule' });
  }
});

// 14. Academic Quarters CRUD
router.get('/academic-quarters', authenticate, async (_req, res) => {
  try {
    const quarters = await prisma.academicQuarter.findMany({
      orderBy: { quarterCode: 'asc' },
    });
    res.json(quarters);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch academic quarters' });
  }
});

router.patch('/academic-quarters/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { startDate, endDate, isActive } = req.body;

    if (isActive) {
      // Set all quarters to inactive first
      await prisma.academicQuarter.updateMany({ data: { isActive: false } });
    }

    const updated = await prisma.academicQuarter.update({
      where: { id },
      data: {
        ...(startDate !== undefined && { startDate: String(startDate) }),
        ...(endDate !== undefined && { endDate: String(endDate) }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      },
    });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update academic quarter' });
  }
});

// ─── Audit Logs ────────────────────────────────────────────────────────

// GET /api/settings/audit-logs
router.get('/audit-logs', authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const { schoolYearId } = req.query;
    const where: any = {};
    if (schoolYearId) {
      where.schoolYearId = schoolYearId as string;
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch audit logs' });
  }
});

// POST /api/settings/audit-logs
router.post('/audit-logs', requireAdmin, async (req: Request, res: Response): Promise<any> => {
  try {
    const { actorName, actorRole, actionType, details, ipAddress } = req.body;
    const log = await prisma.auditLog.create({
      data: {
        actorName: actorName || 'System',
        actorRole: actorRole || 'SYSTEM',
        actionType: actionType || 'SYSTEM',
        details: details || '',
        ipAddress: ipAddress || null,
        schoolYearId: await getActiveSchoolYearId(),
      },
    });
    res.json(log);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create audit log' });
  }
});

// ─── Campus News ───────────────────────────────────────────────────────

// GET /api/settings/campus-news
router.get('/campus-news', async (req: Request, res: Response): Promise<any> => {
  try {
    const news = await prisma.campusNews.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(news);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch campus news' });
  }
});

// POST /api/settings/campus-news
router.post('/campus-news', requireAdmin, async (req: Request, res: Response): Promise<any> => {
  try {
    const { title, body, tag, tagColor, iconColor } = req.body;
    const news = await prisma.campusNews.create({
      data: {
        title: title || '',
        body: body || '',
        tag: tag || 'UPDATE',
        tagColor: tagColor || 'bg-emerald-100 text-emerald-700 border-emerald-200',
        iconColor: iconColor || 'bg-emerald-500',
      },
    });
    res.json(news);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create campus news' });
  }
});

// PATCH /api/settings/campus-news/:id
router.patch('/campus-news/:id', requireAdmin, async (req: Request, res: Response): Promise<any> => {
  try {
    const id = String(req.params.id);
    const { title, body, tag, tagColor, iconColor, isPublished } = req.body;
    const news = await prisma.campusNews.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(body !== undefined && { body }),
        ...(tag !== undefined && { tag }),
        ...(tagColor !== undefined && { tagColor }),
        ...(iconColor !== undefined && { iconColor }),
        ...(isPublished !== undefined && { isPublished }),
      },
    });
    res.json(news);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update campus news' });
  }
});

// DELETE /api/settings/campus-news/:id
router.delete('/campus-news/:id', requireAdmin, async (req: Request, res: Response): Promise<any> => {
  try {
    const id = String(req.params.id);
    await prisma.campusNews.delete({ where: { id } });
    res.json({ message: 'Deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete campus news' });
  }
});

export default router;
