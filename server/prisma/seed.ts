import { PrismaClient, Role, ReportStatus, WasteCategory, Urgency, ReportType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting PostgreSQL database seed for SORTv2...');

  // Hash passwords for test accounts
  const studentPassword = await bcrypt.hash('student123', 10);
  const teacherPassword = await bcrypt.hash('teacher123', 10);
  const adminPassword   = await bcrypt.hash('admin123', 10);
  const mrfPassword     = await bcrypt.hash('mrf123', 10);

  // 1. Create 3 Students (Points & Stats zeroed for clean testing)
  const student1 = await prisma.user.upsert({
    where: { email: 'student1@sort.edu' },
    update: { points: 0, warningsCount: 0, certificates: [] },
    create: {
      email: 'student1@sort.edu',
      name: 'Alex Rivera',
      passwordHash: studentPassword,
      employeeId: 'STU-2026-001',
      role: Role.STUDENT,
      points: 0,
      warningsCount: 0,
      classroomSection: 'BSIT-3A',
      certificates: [],
    },
  });

  const student2 = await prisma.user.upsert({
    where: { email: 'student2@sort.edu' },
    update: { points: 0, warningsCount: 0, certificates: [] },
    create: {
      email: 'student2@sort.edu',
      name: 'Beatriz Santos',
      passwordHash: studentPassword,
      employeeId: 'STU-2026-002',
      role: Role.STUDENT,
      points: 0,
      warningsCount: 0,
      classroomSection: 'BSIT-3B',
      certificates: [],
    },
  });

  const student3 = await prisma.user.upsert({
    where: { email: 'student3@sort.edu' },
    update: { points: 0, warningsCount: 0, certificates: [] },
    create: {
      email: 'student3@sort.edu',
      name: 'Carlos Mendoza',
      passwordHash: studentPassword,
      employeeId: 'STU-2026-003',
      role: Role.STUDENT,
      points: 0,
      warningsCount: 0,
      classroomSection: 'BSIT-3A',
      certificates: [],
    },
  });

  // 2. Create 1 Teacher
  const teacher1 = await prisma.user.upsert({
    where: { email: 'teacher1@sort.edu' },
    update: {},
    create: {
      email: 'teacher1@sort.edu',
      name: 'Prof. Eleanor Vance',
      passwordHash: teacherPassword,
      employeeId: 'TCH-2026-001',
      role: Role.TEACHER,
      points: 500,
      warningsCount: 0,
      classroomSection: 'BSIT-3A',
      certificates: ['Green Educator Award', 'Sustainability Advisor'],
    },
  });

  // 3. Create 1 Admin
  const admin1 = await prisma.user.upsert({
    where: { email: 'admin@sort.edu' },
    update: {},
    create: {
      email: 'admin@sort.edu',
      name: 'System Administrator',
      passwordHash: adminPassword,
      employeeId: 'ADM-2026-001',
      role: Role.ADMIN,
      points: 1000,
      warningsCount: 0,
      certificates: ['System Master Admin'],
    },
  });

  // 4. Create 2 MRF Staffs
  const mrf1 = await prisma.user.upsert({
    where: { email: 'mrf1@sort.edu' },
    update: {},
    create: {
      email: 'mrf1@sort.edu',
      name: 'Marcus Vance',
      passwordHash: mrfPassword,
      employeeId: 'MRF-2026-001',
      role: Role.MRF,
      points: 450,
      warningsCount: 0,
      certificates: ['MRF Logistics Specialist'],
    },
  });

  const mrf2 = await prisma.user.upsert({
    where: { email: 'mrf2@sort.edu' },
    update: {},
    create: {
      email: 'mrf2@sort.edu',
      name: 'Sarah Connor',
      passwordHash: mrfPassword,
      employeeId: 'MRF-2026-002',
      role: Role.MRF,
      points: 420,
      warningsCount: 0,
      certificates: ['MRF Dispatch Operator'],
    },
  });

  console.log('✅ 7 Test Accounts Created Successfully:');
  console.log('   - 3 Students: student1@sort.edu, student2@sort.edu, student3@sort.edu (Pass: student123)');
  console.log('   - 1 Teacher:  teacher1@sort.edu (Pass: teacher123)');
  console.log('   - 1 Admin:    admin@sort.edu (Pass: admin123)');
  console.log('   - 2 MRF Staff: mrf1@sort.edu, mrf2@sort.edu (Pass: mrf123)');

  // 5. Seed System Settings
  await prisma.systemSetting.upsert({
    where: { id: 'default_setting' },
    update: {},
    create: {
      id: 'default_setting',
      pointsPerReport: 50,
      pointsPerKgRecyclable: 10,
      warningThreshold: 3,
      certificatePointThreshold: 500,
      quarterGateActive: false,
    },
  });

  // 6. Seed Waste Bins
  const binCount = await prisma.wasteBin.count();
  if (binCount === 0) {
    await prisma.wasteBin.createMany({
      data: [
        {
          name: 'Main Library Recyclables',
          locationName: 'Library Ground Floor - North Wing',
          fillLevel: 78,
          type: WasteCategory.RECYCLABLE,
          lat: 14.5995,
          lng: 120.9842,
          activeDispatch: true,
        },
        {
          name: 'Cafeteria Compost Station',
          locationName: 'Main Cafeteria - East Entrance',
          fillLevel: 92,
          type: WasteCategory.ORGANIC,
          lat: 14.6001,
          lng: 120.985,
          activeDispatch: true,
        },
        {
          name: 'IT Bldg E-Waste Collector',
          locationName: 'IT Building Lobby',
          fillLevel: 35,
          type: WasteCategory.HAZARDOUS,
          lat: 14.5988,
          lng: 120.9835,
          activeDispatch: false,
        },
        {
          name: 'Gymnasium General Waste',
          locationName: 'Sports Complex Main Entrance',
          fillLevel: 45,
          type: WasteCategory.GENERAL,
          lat: 14.601,
          lng: 120.986,
          activeDispatch: false,
        },
      ],
    });
    console.log('✅ Waste Bins Seeded');
  }

  // Clean up all existing reports, point histories, and offenses for a completely fresh start
  await prisma.pointHistory.deleteMany({});
  await prisma.report.deleteMany({});
  await prisma.offense.deleteMany({});

  // Reset student points to 0
  await prisma.user.updateMany({
    where: { role: Role.STUDENT },
    data: { points: 0, warningsCount: 0, certificates: [] },
  });

  // 8. Seed Challenges
  const challengeCount = await prisma.challenge.count();
  if (challengeCount === 0) {
    await prisma.challenge.createMany({
      data: [
        {
          title: 'Weekly Recycling Pioneer',
          description: 'Submit 5 verified recyclable waste reports this week.',
          pointsAwarded: 150,
          target: 5,
          progress: 3,
          completed: false,
          iconName: 'Recycle',
        },
        {
          title: 'Zero Single-Use Plastics',
          description: 'Participate in campus-wide plastic segregation audit.',
          pointsAwarded: 200,
          target: 1,
          progress: 1,
          completed: true,
          iconName: 'Award',
        },
      ],
    });
    console.log('✅ Challenges Seeded');
  }

  console.log('🌱 PostgreSQL Database Seed Completed Successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error Seeding PostgreSQL Database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
