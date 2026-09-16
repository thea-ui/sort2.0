import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireAdmin, AuthenticatedRequest } from '../middleware/auth.js';
import { generateCertificatePDF } from '../services/certificate-pdf.service.js';
import {
  claimMilestoneCertificate,
  getCertificateById,
  getTermStatus,
  issueTermCertificates,
  listCertificates,
  listRecentCertificates,
} from '../services/certificate.service.js';

const router = Router();
const prisma = new PrismaClient();

function formatDate(value: Date | string): string {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

// GET /api/certificates/term-status — current academic term + issuance state
router.get('/term-status', authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const quarterCode = (req.query.quarterCode as string) || undefined;
    const status = await getTermStatus(quarterCode);
    return res.json(status);
  } catch (error) {
    console.error('Term status error:', error);
    return res.status(500).json({ error: 'Failed to resolve term status' });
  }
});

// GET /api/certificates/history — recent issuance audit (admin only)
router.get('/history', requireAdmin, async (req: Request, res: Response): Promise<any> => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const certs = await listRecentCertificates(limit);
    return res.json(
      certs.map((c) => ({
        id: c.id,
        userId: c.userId,
        studentName: c.user.name,
        gradeLevel: c.user.gradeLevel,
        sectionName: c.user.sectionName,
        serial: c.serial,
        type: c.type,
        tier: c.tier,
        name: c.name,
        rankAtIssue: c.rankAtIssue,
        pointsAtIssue: c.pointsAtIssue,
        termCode: c.termCode,
        termName: c.termName,
        schoolYearLabel: c.schoolYearLabel,
        issuedAt: c.issuedAt,
        issuedBy: c.issuedBy,
      }))
    );
  } catch (error) {
    console.error('Certificate history error:', error);
    return res.status(500).json({ error: 'Failed to fetch certificate history' });
  }
});

// POST /api/certificates/claim-milestone — instant milestone certificate
router.post('/claim-milestone', authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const reqUser = req as AuthenticatedRequest;
    const targetId = (req.body?.userId as string) || reqUser.userId;

    if (reqUser.userId !== targetId && reqUser.userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Can only claim your own certificate', code: 'FORBIDDEN' });
    }

    const result = await claimMilestoneCertificate(targetId, reqUser.userId);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.json({
      message: result.alreadyClaimed ? 'Certificate already claimed' : 'Certificate claimed successfully',
      alreadyClaimed: !!result.alreadyClaimed,
      certificate: result.certificate,
    });
  } catch (error) {
    console.error('Claim milestone error:', error);
    return res.status(500).json({ error: 'Failed to claim milestone certificate' });
  }
});

// POST /api/certificates/issue-term — issue Top 3 ranked certificates (admin only)
router.post('/issue-term', requireAdmin, async (req: Request, res: Response): Promise<any> => {
  try {
    const reqUser = req as AuthenticatedRequest;
    const { quarterCode, force } = req.body || {};

    const result = await issueTermCertificates({
      quarterCode: quarterCode ? String(quarterCode) : undefined,
      force: !!force,
      issuedBy: reqUser.userId,
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error, code: 'ISSUE_FAILED' });
    }

    return res.json({
      message:
        result.awarded && result.awarded.length > 0
          ? `${result.awarded.length} ranked certificate(s) issued for ${result.quarterName}.`
          : `No new ranked certificates to issue for ${result.quarterName}.`,
      quarterCode: result.quarterCode,
      quarterName: result.quarterName,
      awarded: result.awarded ?? [],
      alreadyIssued: result.alreadyIssued ?? 0,
      standings: result.standings ?? [],
    });
  } catch (error) {
    console.error('Issue term certificates error:', error);
    return res.status(500).json({ error: 'Failed to issue term certificates' });
  }
});

// GET /api/certificates — list certificates (own, or any user for admin)
router.get('/', authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const reqUser = req as AuthenticatedRequest;
    const queryUserId = (req.query.userId as string) || reqUser.userId;

    if (reqUser.userId !== queryUserId && reqUser.userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Can only view your own certificates', code: 'FORBIDDEN' });
    }

    const certs = await listCertificates(queryUserId);
    return res.json(certs);
  } catch (error) {
    console.error('List certificates error:', error);
    return res.status(500).json({ error: 'Failed to fetch certificates' });
  }
});

async function renderCertificate(id: string): Promise<{ buffer: Buffer; fileName: string } | null> {
  const cert = await getCertificateById(id);
  if (!cert) return null;

  const isRanked = cert.type === 'RANK';
  const buffer = await generateCertificatePDF({
    studentName: cert.user.name,
    certificateName: cert.name,
    schoolYear: cert.schoolYearLabel || 'Current',
    points: cert.pointsAtIssue,
    rank: cert.rankAtIssue ?? 1,
    gradeLevel: cert.user.gradeLevel || undefined,
    sectionName: cert.user.sectionName || undefined,
    lrn: cert.user.enrollproLrn || undefined,
    dateAwarded: formatDate(cert.issuedAt),
    termName: cert.termName || undefined,
    serial: cert.serial,
    isRanked,
  });

  const safeCert = cert.name.replace(/[^a-zA-Z0-9]/g, '_');
  const safeName = cert.user.name.replace(/[^a-zA-Z0-9]/g, '_');
  return { buffer, fileName: `${safeCert}_${safeName}.pdf` };
}

// GET /api/certificates/:id/download
router.get('/:id/download', authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const reqUser = req as AuthenticatedRequest;
    const id = String(req.params.id);

    const cert = await prisma.certificate.findUnique({ where: { id }, select: { userId: true } });
    if (!cert) return res.status(404).json({ error: 'Certificate not found' });

    if (reqUser.userId !== cert.userId && reqUser.userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Can only download your own certificate', code: 'FORBIDDEN' });
    }

    const rendered = await renderCertificate(id);
    if (!rendered) return res.status(404).json({ error: 'Certificate not found' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${rendered.fileName}"`);
    res.setHeader('Content-Length', rendered.buffer.length.toString());
    return res.send(rendered.buffer);
  } catch (error) {
    console.error('Download certificate error:', error);
    return res.status(500).json({ error: 'Failed to generate certificate PDF' });
  }
});

// GET /api/certificates/:id/view
router.get('/:id/view', authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const reqUser = req as AuthenticatedRequest;
    const id = String(req.params.id);

    const cert = await prisma.certificate.findUnique({ where: { id }, select: { userId: true } });
    if (!cert) return res.status(404).json({ error: 'Certificate not found' });

    if (reqUser.userId !== cert.userId && reqUser.userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Can only view your own certificate', code: 'FORBIDDEN' });
    }

    const rendered = await renderCertificate(id);
    if (!rendered) return res.status(404).json({ error: 'Certificate not found' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${rendered.fileName}"`);
    res.setHeader('Content-Length', rendered.buffer.length.toString());
    return res.send(rendered.buffer);
  } catch (error) {
    console.error('View certificate error:', error);
    return res.status(500).json({ error: 'Failed to generate certificate PDF' });
  }
});

export default router;
