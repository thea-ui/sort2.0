import { PrismaClient, Role, WasteCategory, Urgency } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting PostgreSQL database seed for SORTv2...');

  // All user accounts are sourced from EnrollPro sync (syncSource='ENROLLPRO').
  // No local/test user accounts are seeded here.

  // School Year is managed dynamically by EnrollPro sync.
  // The sync calls ensureSchoolYear() which creates/updates the active SY from EnrollPro API.
  // No hardcoded school year is seeded here.

  // Get active school year for tagging records (may not exist until first sync)
  const activeSY = await prisma.schoolYear.findFirst({ where: { isActive: true } });

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
      maxUnverifiedReports: 3,
      dismissPointPenalty: 10,
      falseReportPointPenalty: 50,
      warningAutoDeductAmount: 10,
      rewardsReservePercent: 20,
      defaultVendorName: 'GreenCycle Recycling Vendor',
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
          type: WasteCategory.BIODEGRADABLE,
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
          type: WasteCategory.NON_BIODEGRADABLE,
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

  // Purge any leftover LOCAL-synced accounts — only EnrollPro-synced accounts are valid
  const localPurge = await prisma.user.deleteMany({
    where: { syncSource: 'LOCAL' as any },
  });
  if (localPurge.count > 0) {
    console.log(`🧹 Purged ${localPurge.count} orphaned LOCAL accounts`);
  }

  // Reset all student points, warnings, and certificates to zero
  await prisma.user.updateMany({
    where: { role: Role.STUDENT },
    data: { points: 0, warningsCount: 0, certificates: [] },
  });

  // All user reports must originate from real EnrollPro student submissions.
  // No fake/local reports are seeded here.

  // 8. Seed Challenges (upsert by stable code per D12)
  await prisma.challenge.upsert({
    where: { code: 'WEEKLY_RECYCLING_PIONEER' },
    update: {},
    create: {
      code: 'WEEKLY_RECYCLING_PIONEER',
      title: 'Weekly Recycling Pioneer',
      description: 'Submit 5 verified recyclable waste reports this week.',
      challengeType: 'REPORT_COUNT',
      pointsAwarded: 150,
      target: 5,
      iconName: 'Recycle',
      isActive: true,
    },
  });
  await prisma.challenge.upsert({
    where: { code: 'ZERO_SINGLE_USE_PLASTICS' },
    update: {},
    create: {
      code: 'ZERO_SINGLE_USE_PLASTICS',
      title: 'Zero Single-Use Plastics',
      description: 'Participate in campus-wide plastic segregation audit.',
      challengeType: 'REPORT_COUNT',
      pointsAwarded: 200,
      target: 1,
      iconName: 'Award',
      isActive: true,
    },
  });
  console.log('✅ Challenges Seeded');

  // 9. Seed Asset Categories & Item Presets
  const categoryCount = await prisma.assetCategory.count();
  if (categoryCount === 0) {
    const furnitureCat = await prisma.assetCategory.create({
      data: {
        name: 'Furniture',
        code: 'furniture',
        presets: {
          create: [
            { name: 'Arm Chair (Plastic)' },
            { name: 'Arm Chair (Wooden)' },
            { name: 'Office Chair' },
            { name: 'Student Desk' },
            { name: "Teacher's Table" },
            { name: 'Wooden Table' },
            { name: 'Filing Cabinet' },
            { name: 'Bookshelf' },
            { name: 'Whiteboard Stand' },
            { name: 'Lecture Podium' },
          ],
        },
      },
    });

    const electronicsCat = await prisma.assetCategory.create({
      data: {
        name: 'Electronics',
        code: 'electronics',
        presets: {
          create: [
            { name: 'Desktop Computer' },
            { name: 'Laptop' },
            { name: 'LCD Projector' },
            { name: 'LED TV/Monitor' },
            { name: 'Speaker / PA Sound System' },
            { name: 'Printer / Scanner' },
            { name: 'Wireless Router / Access Point' },
            { name: 'Document Camera' },
          ],
        },
      },
    });

    const fixturesCat = await prisma.assetCategory.create({
      data: {
        name: 'Fixtures',
        code: 'fixtures',
        presets: {
          create: [
            { name: 'Ceiling Fan' },
            { name: 'Air Conditioner Unit (Split/Window)' },
            { name: 'LED Tube Light / Panel Light' },
            { name: 'Wall Light Switch' },
            { name: 'Electrical Power Outlet' },
            { name: 'Door Lock / Handle Assembly' },
            { name: 'Window Blinds / Curtain Rod' },
            { name: 'Plumbing Faucet / Sink Assembly' },
          ],
        },
      },
    });

    const equipmentCat = await prisma.assetCategory.create({
      data: {
        name: 'Equipment',
        code: 'equipment',
        presets: {
          create: [
            { name: 'Science Microscope' },
            { name: 'Bunsen Burner / Gas Hose' },
            { name: 'Laboratory Centrifuge' },
            { name: 'Fire Extinguisher (CO2/Dry Chemical)' },
            { name: 'First Aid Kit Box' },
            { name: 'Oscilloscope / Multimeter' },
            { name: 'Paper Shredder Machine' },
          ],
        },
      },
    });

    const otherCat = await prisma.assetCategory.create({
      data: {
        name: 'Other',
        code: 'other',
        presets: {
          create: [
            { name: 'Trash Can / Litter Bin (General)' },
            { name: 'Whiteboard / Cork Board' },
            { name: 'Cleaning Broom / Mop Stand' },
            { name: 'Extension Cord Wheel' },
            { name: 'Wall Clock (Analog/Digital)' },
          ],
        },
      },
    });
    console.log('✅ Asset Categories & Item Presets Seeded');
  }

  // 10. Seed Campus Locations
  const locationCount = await prisma.campusLocation.count();
  if (locationCount === 0) {
    await prisma.campusLocation.createMany({
      data: [
        {
          code: 'LOC-01',
          name: 'Main Courtyard (Quad)',
          status: 'Available',
          x: 70,
          y: 45,
          streams: [
            { type: 'BIODEGRADABLE', status: 'Available' },
            { type: 'NON_BIODEGRADABLE', status: 'Available' },
            { type: 'RECYCLABLE', status: 'Available' },
          ],
        },
        {
          code: 'LOC-02',
          name: 'Main Library Lobby Entrance',
          status: 'Unavailable',
          x: 53,
          y: 55,
          streams: [
            { type: 'BIODEGRADABLE', status: 'Available' },
            { type: 'NON_BIODEGRADABLE', status: 'Unavailable' },
            { type: 'RECYCLABLE', status: 'Available' },
          ],
        },
        {
          code: 'LOC-03',
          name: 'Science Hall Cafeteria Side',
          status: 'Available',
          x: 49,
          y: 35,
          streams: [
            { type: 'BIODEGRADABLE', status: 'Available' },
            { type: 'NON_BIODEGRADABLE', status: 'Available' },
            { type: 'RECYCLABLE', status: 'Available' },
          ],
        },
        {
          code: 'LOC-04',
          name: 'Chemistry Building Entrance',
          status: 'Available',
          x: 35,
          y: 42,
          streams: [
            { type: 'BIODEGRADABLE', status: 'Available' },
            { type: 'NON_BIODEGRADABLE', status: 'Available' },
            { type: 'RECYCLABLE', status: 'Available' },
          ],
        },
        {
          code: 'LOC-05',
          name: 'Sports Complex Entrance B',
          status: 'Unavailable',
          x: 46,
          y: 65,
          streams: [
            { type: 'BIODEGRADABLE', status: 'Available' },
            { type: 'NON_BIODEGRADABLE', status: 'Unavailable' },
            { type: 'RECYCLABLE', status: 'Available' },
          ],
        },
      ],
    });
    console.log('✅ Campus Locations Seeded');
  }

  // 11. Seed Room Locations
  const roomCount = await prisma.roomLocation.count();
  if (roomCount === 0) {
    const rooms = [
      'Room 101 – Science Hall',
      'Room 102 – Science Hall',
      'Room 103 – Science Hall',
      'Room 201 – Science Hall',
      'Room 202 – Science Hall',
      'Room 204 – Arts Building',
      'Room 301 – Engineering Building',
      'Room 305 – Engineering Building',
      'Physics Lab 1 – Science Hall',
      'Chemistry Lab 2 – Science Hall',
      'Biology Lab – Science Hall',
      'Computer Lab 1 – IT Building',
      'Computer Lab 2 – IT Building',
      'Computer Lab 3 – IT Building',
      'Faculty Office – Admin Building',
      'Conference Room – Admin Building',
      "Dean's Office – Admin Building",
      'Library Lobby – 2nd Floor',
      'Library Study Hall – 3rd Floor',
      'Audio Visual Room (AVR 1) – Main Bldg',
      'Lecture Hall A – Main Bldg',
      'Sports Complex Office – Gym',
      'Main Courtyard (Quad)',
      'Sports Complex Entrance B',
    ];
    await prisma.roomLocation.createMany({
      data: rooms.map((r) => ({ name: r, building: r.includes('–') ? r.split('–')[1].trim() : 'Campus Main' })),
    });
    console.log('✅ Room Locations Seeded');
  }

  // 12. Seed Waste Types
  const wasteTypeCount = await prisma.wasteType.count();
  if (wasteTypeCount === 0) {
    await prisma.wasteType.createMany({
      data: [
        {
          name: 'Biodegradable',
          code: 'BIODEGRADABLE',
          description: 'Food scraps, organic matter, garden waste',
          hexColor: '#10B981',
        },
        {
          name: 'Non-Biodegradable',
          code: 'NON_BIODEGRADABLE',
          description: 'Wrappers, plastic films, sanitary residual',
          hexColor: '#FF5722',
        },
        {
          name: 'Recyclable',
          code: 'RECYCLABLE',
          description: 'PET bottles, aluminum cans, glass & cardboard',
          hexColor: '#0091EA',
        },
      ],
    });
    console.log('✅ Waste Types Seeded');
  }

  // 13. Seed Urgency Levels
  const urgencyCount = await prisma.urgencyLevel.count();
  if (urgencyCount === 0) {
    await prisma.urgencyLevel.createMany({
      data: [
        {
          level: 'Low',
          code: 'LOW',
          slaHours: 48,
          description: 'Minor issue, no immediate impact',
          badgeStyle: 'bg-slate-100 text-slate-700 border-slate-300',
        },
        {
          level: 'Normal',
          code: 'MEDIUM',
          slaHours: 24,
          description: 'Needs repair or attention soon',
          badgeStyle: 'bg-amber-100 text-amber-800 border-amber-300',
        },
        {
          level: 'Urgent',
          code: 'HIGH',
          slaHours: 4,
          description: 'Dangerous condition (e.g. broken glass, unstable)',
          badgeStyle: 'bg-rose-100 text-rose-800 border-rose-300',
        },
      ],
    });
    console.log('✅ Urgency Levels Seeded');
  }

  // 14. Seed Asset Conditions
  const conditionCount = await prisma.assetCondition.count();
  if (conditionCount === 0) {
    await prisma.assetCondition.createMany({
      data: [
        {
          name: 'Damaged',
          code: 'DAMAGED',
          description: 'Broken but may be repairable',
          badgeStyle: 'bg-blue-100 text-blue-800 border-blue-300',
        },
        {
          name: 'Malfunctioning',
          code: 'MALFUNCTIONING',
          description: 'Not working properly',
          badgeStyle: 'bg-amber-100 text-amber-800 border-amber-300',
        },
        {
          name: 'Worn Out',
          code: 'WORN_OUT',
          description: 'Heavy wear, needs replacement',
          badgeStyle: 'bg-orange-100 text-orange-800 border-orange-300',
        },
        {
          name: 'Missing Parts',
          code: 'MISSING_PARTS',
          description: 'Incomplete, parts missing',
          badgeStyle: 'bg-purple-100 text-purple-800 border-purple-300',
        },
      ],
    });
    console.log('✅ Asset Conditions Seeded');
  }

  // 15. Seed Point Rules
  const pointRuleCount = await prisma.pointRule.count();
  if (pointRuleCount === 0) {
    await prisma.pointRule.createMany({
      data: [
        { rank: 1, title: '1st Reporter', pointsAwarded: 15, description: '🔥 15 points awarded' },
        { rank: 2, title: '2nd Reporter', pointsAwarded: 10, description: '🔥 10 points awarded' },
        { rank: 3, title: '3rd Reporter', pointsAwarded: 5, description: '🔥 5 points awarded' },
        { rank: 4, title: '4th+ Reporter', pointsAwarded: 0, description: 'No points awarded' },
      ],
    });
    console.log('✅ Point Rules Seeded');
  }

  // Academic Quarters are managed dynamically by EnrollPro sync.
  // The sync calls syncTermCalendar() which creates/updates terms from EnrollPro API.
  // No hardcoded term dates are seeded here.

  // 17. Seed Recycle Market Stocks (starting from empty inventory)
  const defaultStocks = [
    { categoryCode: 'pet_plastic', categoryName: 'PET Plastic Bottles', shortName: 'PET Bottles', thresholdLimitKg: 50.0, marketPricePerKg: 18.0, accumulatedKg: 0.0, isApprovedForSale: false },
    { categoryCode: 'aluminum_cans', categoryName: 'Aluminum & Metal Cans', shortName: 'Aluminum Cans', thresholdLimitKg: 30.0, marketPricePerKg: 45.0, accumulatedKg: 0.0, isApprovedForSale: false },
    { categoryCode: 'cardboard', categoryName: 'Cardboard & Paper', shortName: 'Cardboard', thresholdLimitKg: 60.0, marketPricePerKg: 12.0, accumulatedKg: 0.0, isApprovedForSale: false },
    { categoryCode: 'glass', categoryName: 'Glass Bottles & Containers', shortName: 'Glass Bottles', thresholdLimitKg: 40.0, marketPricePerKg: 15.0, accumulatedKg: 0.0, isApprovedForSale: false },
  ];

  for (const item of defaultStocks) {
    await prisma.recycleMarketStock.upsert({
      where: { categoryCode: item.categoryCode },
      update: item,
      create: item,
    });
  }
  console.log('✅ Recycle Market Stocks Seeded (starting inventory: 0 kg)');

  // 18. Clean initial state for Recycle Sale Transactions (0 sold until MRF closes a sale)
  await prisma.recycleSaleTransaction.deleteMany();
  console.log('✅ Recycle Sales Transactions Cleaned (Ready for live MRF sales)');

  // 19. Seed MRF Inventory Items
  const inventoryCount = await prisma.mrfInventoryItem.count();
  if (inventoryCount === 0) {
    const inventoryItems = [
      { name: 'Digital Weighing Scale', category: 'EQUIPMENT', unit: 'pcs', quantity: 2, condition: 'GOOD', isPersistent: true, description: 'Platform scale for weighing recyclables' },
      { name: 'Sorting Table (Stainless)', category: 'EQUIPMENT', unit: 'pcs', quantity: 3, condition: 'GOOD', isPersistent: true, description: 'Large stainless steel sorting tables' },
      { name: 'Baling Machine', category: 'EQUIPMENT', unit: 'pcs', quantity: 1, condition: 'GOOD', isPersistent: true, description: 'Manual hydraulic baling press' },
      { name: 'Safety Gloves (Pair)', category: 'SUPPLY', unit: 'pcs', quantity: 20, condition: 'GOOD', isPersistent: false, description: 'Cut-resistant work gloves' },
      { name: 'Trash Bags (Roll)', category: 'SUPPLY', unit: 'rolls', quantity: 15, condition: 'GOOD', isPersistent: false, description: 'Large heavy-duty trash bags' },
      { name: 'Safety Goggles', category: 'SUPPLY', unit: 'pcs', quantity: 10, condition: 'GOOD', isPersistent: false, description: 'Eye protection for sorting' },
      { name: 'Label Stickers (Roll)', category: 'SUPPLY', unit: 'rolls', quantity: 5, condition: 'GOOD', isPersistent: false, description: 'Adhesive labels for bin marking' },
      { name: 'MRF Signage Set', category: 'TOOL', unit: 'pcs', quantity: 1, condition: 'GOOD', isPersistent: true, description: 'Campus MRF wayfinding signs' },
    ];

    for (const item of inventoryItems) {
      await prisma.mrfInventoryItem.create({ data: item });
    }
    console.log('✅ MRF Inventory Items Seeded');
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
