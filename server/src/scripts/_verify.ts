import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
dotenv.config();
const prisma = new PrismaClient();

async function main() {
  const years = await prisma.schoolYear.findMany({ orderBy: { startDate: 'desc' } });
  const byId = new Map(years.map((y) => [y.id, y]));

  const reports = await prisma.report.findMany({ select: { id: true, createdAt: true, schoolYearId: true, status: true }, orderBy: { createdAt: 'asc' } });
  const groups = new Map<string, { count: number; min: Date; max: Date }>();
  for (const r of reports) {
    const key = r.schoolYearId || 'null';
    const g = groups.get(key) || { count: 0, min: r.createdAt, max: r.createdAt };
    g.count++; if (r.createdAt < g.min) g.min = r.createdAt; if (r.createdAt > g.max) g.max = r.createdAt;
    groups.set(key, g);
  }
  console.log('REPORTS BY SCHOOL YEAR:');
  for (const [id, g] of groups) {
    const label = id === 'null' ? 'null' : byId.get(id)?.label || id;
    console.log(`  ${label}: ${g.count} reports  (${g.min.toISOString().slice(0,10)} .. ${g.max.toISOString().slice(0,10)})`);
  }

  const ph = await prisma.pointHistory.findMany({ select: { createdAt: true, amount: true, schoolYearId: true } });
  const phGroups = new Map<string, { count: number; min: Date; max: Date }>();
  for (const r of ph) {
    const key = r.schoolYearId || 'null';
    const g = phGroups.get(key) || { count: 0, min: r.createdAt, max: r.createdAt };
    g.count++; if (r.createdAt < g.min) g.min = r.createdAt; if (r.createdAt > g.max) g.max = r.createdAt;
    phGroups.set(key, g);
  }
  console.log('\nPOINT HISTORY BY SCHOOL YEAR:');
  for (const [id, g] of phGroups) {
    const label = id === 'null' ? 'null' : byId.get(id)?.label || id;
    console.log(`  ${label}: ${g.count} rows  (${g.min.toISOString().slice(0,10)} .. ${g.max.toISOString().slice(0,10)})`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
