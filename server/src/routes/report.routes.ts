import { Router, Request, Response } from 'express';
import { PrismaClient, ReportStatus, WasteCategory, Urgency, ReportType, Role } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// DELETE /api/reports/purge - Wipe all test reports, point histories, offenses, and reset user points
router.delete('/purge', async (req: Request, res: Response): Promise<any> => {
  try {
    await prisma.pointHistory.deleteMany({});
    await prisma.report.deleteMany({});
    await prisma.offense.deleteMany({});
    await prisma.user.updateMany({
      where: { role: Role.STUDENT },
      data: { points: 0, warningsCount: 0, certificates: [] },
    });
    console.log('🧹 Purged all reports, point histories, and offenses from database.');
    return res.json({ message: 'Database purged successfully' });
  } catch (error) {
    console.error('Purge error:', error);
    return res.status(500).json({ error: 'Failed to purge database' });
  }
});

// GET /api/reports - Fetch all reports with optional filters
router.get('/', async (req: Request, res: Response): Promise<any> => {
  try {
    const { status, category, reporterId } = req.query;

    const where: any = {};
    if (status) where.status = status as ReportStatus;
    if (category) where.category = category as WasteCategory;
    if (reporterId) where.reporterId = reporterId as string;

    const reports = await prisma.report.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        reporter: {
          select: { id: true, name: true, role: true, email: true },
        },
        assignedMrf: {
          select: { id: true, name: true },
        },
      },
    });

    const formatted = reports.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      status: r.status,
      urgency: r.urgency,
      category: r.category,
      coordinates: { lat: r.lat, lng: r.lng },
      locationName: r.locationName,
      reporterId: r.reporterId,
      reporterName: r.reporter.name,
      reporterRole: r.reporter.role.toLowerCase(),
      pointsAwarded: r.pointsAwarded,
      timestamp: r.createdAt.toISOString(),
      imageUrl: r.imageUrl,
      weightCollected: r.weightCollected,
      isVerified: r.isVerified,
      assignedMrfId: r.assignedMrfId,
      assignedMrfName: r.assignedMrf?.name,
      reportType: r.reportType,
    }));

    return res.json(formatted);
  } catch (error) {
    console.error('Fetch reports error:', error);
    return res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// POST /api/reports - Submit a new waste report
router.post('/', async (req: Request, res: Response): Promise<any> => {
  try {
    const {
      title,
      description,
      urgency,
      category,
      coordinates,
      locationName,
      reporterId,
      imageUrl,
      reportType,
    } = req.body;

    if (!title || !reporterId || !coordinates) {
      return res.status(400).json({ error: 'Title, reporterId, and coordinates are required' });
    }

    const locName = locationName || 'Campus Location';
    const cat = (category as WasteCategory) || WasteCategory.GENERAL;

    // Duplicate Check: 1 active report per user per trash bin
    const existingActive = await prisma.report.findFirst({
      where: {
        reporterId,
        locationName: locName,
        category: cat,
        status: { in: [ReportStatus.PENDING, ReportStatus.DISPATCHED] },
      },
    });

    if (existingActive) {
      return res.status(400).json({ error: 'You have already submitted an active report for this trash bin. You cannot submit multiple reports for the same bin.' });
    }

    const report = await prisma.report.create({
      data: {
        title,
        description: description || '',
        urgency: (urgency as Urgency) || Urgency.MEDIUM,
        category: cat,
        lat: coordinates.lat || 14.5995,
        lng: coordinates.lng || 120.9842,
        locationName: locName,
        reporterId,
        imageUrl: imageUrl || null,
        reportType: (reportType as ReportType) || ReportType.WASTE,
        pointsAwarded: 0,
      },
      include: {
        reporter: {
          select: { id: true, name: true, role: true },
        },
      },
    });

    return res.status(201).json({
      id: report.id,
      title: report.title,
      description: report.description,
      status: report.status,
      urgency: report.urgency,
      category: report.category,
      coordinates: { lat: report.lat, lng: report.lng },
      locationName: report.locationName,
      reporterId: report.reporterId,
      reporterName: report.reporter.name,
      pointsAwarded: 0,
      timestamp: report.createdAt.toISOString(),
      reportType: report.reportType,
    });
  } catch (error) {
    console.error('Submit report error:', error);
    return res.status(500).json({ error: 'Failed to submit report' });
  }
});

// PATCH /api/reports/:id/status - Update report status or assign MRF staff
router.patch('/:id/status', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const targetId = Array.isArray(id) ? id[0] : id;
    const { status, assignedMrfId, weightCollected, isVerified } = req.body;

    const data: any = {};
    if (status) data.status = status as ReportStatus;
    if (assignedMrfId !== undefined) data.assignedMrfId = assignedMrfId;
    if (weightCollected !== undefined) data.weightCollected = weightCollected;
    if (isVerified !== undefined) data.isVerified = isVerified;

    const targetReport = await prisma.report.findUnique({ where: { id: targetId } });
    if (!targetReport) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // When status changes to RESOLVED or COLLECTED (MRF Final Done):
    if (status === 'COLLECTED' || status === 'RESOLVED') {
      // Find all active/pending reports for this bin/location ordered by submission time
      const clusterReports = await prisma.report.findMany({
        where: {
          locationName: targetReport.locationName,
          category: targetReport.category,
          status: { in: [ReportStatus.PENDING, ReportStatus.DISPATCHED, ReportStatus.COLLECTED, ReportStatus.RESOLVED] },
        },
        orderBy: { createdAt: 'asc' },
      });

      // Calculate points for each report based on rank (1st = 15, 2nd = 10, 3rd = 5, 4th+ = 0)
      const rankPointsMap = [15, 10, 5];
      for (let idx = 0; idx < clusterReports.length; idx++) {
        const rep = clusterReports[idx];
        const rank = idx + 1;
        const pts = rank <= 3 ? rankPointsMap[idx] : 0;

        // If report has not been awarded points yet
        if (rep.pointsAwarded === 0 && pts > 0) {
          await prisma.report.update({
            where: { id: rep.id },
            data: { pointsAwarded: pts, status: status as ReportStatus },
          });

          await prisma.user.update({
            where: { id: rep.reporterId },
            data: { points: { increment: pts } },
          });

          await prisma.pointHistory.create({
            data: {
              userId: rep.reporterId,
              amount: pts,
              reason: `MRF Resolution: ${rank === 1 ? '1st' : rank === 2 ? '2nd' : '3rd'} Reporter Bonus (+${pts} pts) for ${rep.locationName}`,
            },
          });
        }
      }
    }

    const updated = await prisma.report.update({
      where: { id: targetId },
      data,
    });

    return res.json(updated);
  } catch (error) {
    console.error('Update report status error:', error);
    return res.status(500).json({ error: 'Failed to update report status' });
  }
});

export default router;
