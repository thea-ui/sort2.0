/**
 * DEMO/OFFLINE ROSTER SEEDER (walk-in testing while EnrollPro is not online)
 *
 * Creates a small local student roster with `syncSource: LOCAL` so the MRF
 * Walk-in Station can be demoed and tested before EnrollPro is live. These
 * accounts cannot log in (SORT login is strictly delegated to EnrollPro) but
 * they can receive walk-in points, milestone claims, and appear in the MRF
 * search with a "Local (offline)" badge.
 *
 * The EnrollPro sync no longer deletes LOCAL accounts that own activity, so
 * points earned here survive a future sync. Use `link-offline-students.ts`
 * (Phase 7) to merge them into synced accounts later.
 *
 * Usage: npx tsx prisma/seed-offline-students.ts [count]
 */
import { PrismaClient, Role, SyncSource } from '@prisma/client';

const prisma = new PrismaClient();

const FIRST_NAMES = ['Juan', 'Maria', 'Jose', 'Andrea', 'Miguel', 'Sofia', 'Gabriel', 'Isabella', 'Rafael', 'Camila', 'Luis', 'Bianca'];
const LAST_NAMES = ['Dela Cruz', 'Santos', 'Reyes', 'Garcia', 'Mendoza', 'Torres', 'Flores', 'Ramos', 'Villanueva', 'Aquino', 'Navarro', 'Domingo'];
const GRADES = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
const SECTIONS = ['Sampaguita', 'Rizal', 'Bonifacio', 'Mabini', 'Lakandula', 'Aguinaldo'];

async function ensureActiveSchoolYear() {
  const existing = await prisma.schoolYear.findFirst({ where: { isActive: true, isArchived: false } });
  if (existing) return existing;

  const created = await prisma.schoolYear.create({
    data: {
      label: '2026-2027',
      startDate: new Date('2026-06-01'),
      endDate: new Date('2027-03-31'),
      isActive: true,
      isArchived: false,
    },
  });
  console.log(`[OfflineSeed] Created active school year ${created.label} (${created.id})`);
  return created;
}

async function main() {
  const count = Math.min(Math.max(Number(process.argv[2]) || 12, 1), 60);

  const schoolYear = await ensureActiveSchoolYear();
  console.log(`[OfflineSeed] Active school year: ${schoolYear.label}`);

  let created = 0;
  for (let i = 0; i < count; i++) {
    const employeeId = `LOCAL-${String(i + 1).padStart(4, '0')}`;
    const name = `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[i % LAST_NAMES.length]}`;
    const gradeLevel = GRADES[i % GRADES.length];
    const sectionName = SECTIONS[i % SECTIONS.length];

    const existing = await prisma.user.findUnique({ where: { employeeId }, select: { id: true } });
    if (existing) continue;

    await prisma.user.create({
      data: {
        name,
        email: `offline.${employeeId.toLowerCase()}@sort.local`,
        passwordHash: null,
        employeeId,
        role: Role.STUDENT,
        points: 0,
        syncSource: SyncSource.LOCAL,
        gradeLevel,
        sectionName,
        classroomSection: sectionName,
        enrollmentStatus: 'OFFLINE_DEMO',
        portalAccountActive: false,
      },
    });
    created++;
  }

  console.log(`[OfflineSeed] Done. Created ${created} offline student(s) (${count - created} already existed).`);
  console.log('[OfflineSeed] Note: these accounts cannot log in; use minted tokens for student-view demos.');
}

main()
  .catch((e) => {
    console.error('[OfflineSeed] Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
