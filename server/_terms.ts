import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

const ENROLLPRO_BASE = process.env.ENROLLPRO_BASE_URL || 'https://dev-jegs.buru-degree.ts.net/api';
const INTEGRATION_KEY = process.env.ENROLLPRO_SYNC_SECRET || '';

async function main() {
  // Delete old quarter data
  const deleted = await p.academicQuarter.deleteMany({});
  console.log(`Deleted ${deleted.count} old quarters`);

  // Fetch current school year from EnrollPro
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (INTEGRATION_KEY) {
    headers['X-Integration-Key'] = INTEGRATION_KEY;
  }

  const res = await fetch(`${ENROLLPRO_BASE}/integration/v1/school-year`, { headers });
  if (!res.ok) {
    console.error(`EnrollPro returned ${res.status}`);
    process.exit(1);
  }

  const json = await res.json() as { data?: any };
  const sy = json.data;
  if (!sy?.id) {
    console.error('No active school year in EnrollPro');
    process.exit(1);
  }

  console.log(`EnrollPro Active SY: ${sy.yearLabel} (ID: ${sy.id})`);

  const terms = [
    { start: sy.term1Start, end: sy.term1End, name: 'Term 1', code: 'T1' },
    { start: sy.term2Start, end: sy.term2End, name: 'Term 2', code: 'T2' },
    { start: sy.term3Start, end: sy.term3End, name: 'Term 3', code: 'T3' },
  ];

  const now = new Date();
  for (const t of terms) {
    if (!t.start || !t.end) continue;
    const isActive = now >= new Date(t.start) && now <= new Date(t.end);
    await p.academicQuarter.create({
      data: {
        quarterName: t.name,
        quarterCode: t.code,
        startDate: t.start.slice(0, 10),
        endDate: t.end.slice(0, 10),
        isActive,
      },
    });
  }
  console.log(`Created ${terms.filter(t => t.start && t.end).length} terms from EnrollPro`);

  // Verify
  const all = await p.academicQuarter.findMany({ orderBy: { startDate: 'asc' } });
  for (const q of all) {
    console.log(`  ${q.quarterName}: ${q.startDate} to ${q.endDate} | Active: ${q.isActive}`);
  }
}

main().finally(() => p.$disconnect());
