import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const prisma = new PrismaClient();
const dryRun = process.argv.includes('--dry-run');

// Mirror of the guard in school-year.routes.ts: a manually created year must sit
// inside a plausible window. Anything outside it is legacy test noise.
const MAX_FUTURE_YEARS = 2;
const MAX_PAST_YEARS = 30;

function canonicalLabelFromDates(start: Date, end: Date): string | null {
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
  const startYear = start.getUTCFullYear();
  return `${startYear}-${startYear + 1}`;
}

function includesNow(y: { startDate: Date; endDate: Date }, now: Date): boolean {
  return y.startDate <= now && y.endDate >= now;
}

async function recordCount(id: string): Promise<number> {
  const counts = await Promise.all([
    prisma.report.count({ where: { schoolYearId: id } }),
    prisma.pointHistory.count({ where: { schoolYearId: id } }),
    prisma.offense.count({ where: { schoolYearId: id } }),
    prisma.recycleSaleTransaction.count({ where: { schoolYearId: id } }),
    prisma.assetScrapSaleTransaction.count({ where: { schoolYearId: id } }),
    prisma.assetScrapStockSnapshot.count({ where: { schoolYearId: id } }),
    prisma.auditLog.count({ where: { schoolYearId: id } }),
    prisma.marketStockSnapshot.count({ where: { schoolYearId: id } }),
    prisma.userPointSnapshot.count({ where: { schoolYearId: id } }),
    prisma.mrfAssetRecord.count({ where: { schoolYearId: id } }),
  ]);
  return counts.reduce((sum, n) => sum + n, 0);
}

async function main() {
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const years = await prisma.schoolYear.findMany({ orderBy: { startDate: 'asc' } });

  const counts = new Map<string, number>();
  for (const y of years) counts.set(y.id, await recordCount(y.id));

  console.log(`Repairing ${years.length} school year(s)${dryRun ? ' [DRY RUN]' : ''}\n`);

  // ── 1. Reconcile label with the actual term dates ─────────────────────────
  const relabels = years
    .map((y) => ({ id: y.id, from: y.label, to: canonicalLabelFromDates(y.startDate, y.endDate) }))
    .filter((r): r is { id: string; from: string; to: string } => !!r.to && r.to !== r.from);

  for (const r of relabels) {
    console.log(`  relabel  ${r.from} -> ${r.to}`);
    if (!dryRun) {
      await prisma.schoolYear.update({ where: { id: r.id }, data: { label: r.to } });
    }
  }
  const labelOf = new Map<string, string>();
  for (const y of years) labelOf.set(y.id, y.label);
  for (const r of relabels) labelOf.set(r.id, r.to);

  // ── 2. Archive duplicate years sharing a canonical label ──────────────────
  const byLabel = new Map<string, typeof years>();
  for (const y of years) {
    if (y.isArchived) continue;
    const label = labelOf.get(y.id)!;
    const list = byLabel.get(label) || [];
    list.push(y);
    byLabel.set(label, list);
  }

  const archive = new Map<string, string>();
  for (const [label, list] of byLabel) {
    if (list.length < 2) continue;
    const ranked = [...list].sort((a, b) => {
      const ai = includesNow(a, now) ? 1 : 0;
      const bi = includesNow(b, now) ? 1 : 0;
      if (ai !== bi) return bi - ai;
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      const ca = counts.get(a.id) || 0;
      const cb = counts.get(b.id) || 0;
      if (ca !== cb) return cb - ca;
      return b.startDate.getTime() - a.startDate.getTime();
    });
    const keep = ranked[0];
    for (const dup of ranked.slice(1)) {
      archive.set(dup.id, `duplicate of ${keep.label}`);
      console.log(`  archive  ${label} (epId=${dup.enrollproId ?? 'manual'}) — duplicate of the kept row`);
    }
  }

  // ── 3. Archive unused, implausible manually-created years ─────────────────
  for (const y of years) {
    if (y.isArchived || archive.has(y.id)) continue;
    if (y.enrollproId !== null || y.isActive) continue;
    if ((counts.get(y.id) || 0) > 0) continue;
    const startYear = y.startDate.getUTCFullYear();
    const implausible = startYear > currentYear + MAX_FUTURE_YEARS || startYear < currentYear - MAX_PAST_YEARS;
    if (implausible) {
      archive.set(y.id, 'unused implausible manual year');
      console.log(`  archive  ${y.label} (manual) — unused and outside the plausible window`);
    }
  }

  if (!dryRun) {
    for (const id of archive.keys()) {
      await prisma.schoolYear.update({
        where: { id },
        data: { isActive: false, isArchived: true, archivedAt: now },
      });
    }
  }

  // ── 4. Guarantee exactly one active year ──────────────────────────────────
  const previousActive = years.filter((y) => y.isActive).map((y) => y.label).join(', ') || '(none)';
  let activeLabel = '(none)';

  const survivors = years.filter((y) => !y.isArchived && !archive.has(y.id));
  if (survivors.length > 0) {
    const pick = [...survivors].sort((a, b) => {
      const ai = includesNow(a, now) ? 1 : 0;
      const bi = includesNow(b, now) ? 1 : 0;
      if (ai !== bi) return bi - ai;
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      return b.startDate.getTime() - a.startDate.getTime();
    })[0];
    activeLabel = labelOf.get(pick.id)!;

    for (const y of survivors) {
      const shouldBeActive = y.id === pick.id;
      if (y.isActive !== shouldBeActive) {
        console.log(`  ${shouldBeActive ? 'activate ' : 'deactivate'} ${labelOf.get(y.id)}`);
        if (!dryRun) {
          await prisma.schoolYear.update({
            where: { id: y.id },
            data: { isActive: shouldBeActive, ...(shouldBeActive ? { isArchived: false, archivedAt: null } : {}) },
          });
        }
      }
    }
    console.log(`\nActive school year: ${activeLabel}`);
  }

  // ── 5. Audit the repair ───────────────────────────────────────────────────
  const summary =
    `School-year repair: ${relabels.length} label(s) reconciled, ${archive.size} year(s) archived; ` +
    `active year changed from ${previousActive} to ${activeLabel}.`;

  if (!dryRun && (relabels.length > 0 || archive.size > 0)) {
    await prisma.auditLog.create({
      data: { actorName: 'System', actorRole: 'SYSTEM', actionType: 'SCHOOL_YEAR_REPAIR', details: summary },
    });
  }

  console.log(`\n${dryRun ? '[DRY RUN] ' : ''}${summary}`);
}

main()
  .catch((err) => {
    console.error('School-year repair failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
