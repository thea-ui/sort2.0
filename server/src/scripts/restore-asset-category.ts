import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const prisma = new PrismaClient();

interface DefaultCategory {
  name: string;
  code: string;
  items: string[];
}

const DEFAULT_CATEGORIES: DefaultCategory[] = [
  {
    name: 'Furniture',
    code: 'furniture',
    items: [
      'Arm Chair (Plastic)',
      'Arm Chair (Wooden)',
      'Office Chair',
      'Student Desk',
      "Teacher's Table",
      'Wooden Table',
      'Filing Cabinet',
      'Bookshelf',
      'Whiteboard Stand',
      'Lecture Podium',
    ],
  },
  {
    name: 'Electronics',
    code: 'electronics',
    items: [
      'Desktop Computer',
      'Laptop',
      'LCD Projector',
      'LED TV/Monitor',
      'Speaker / PA Sound System',
      'Printer / Scanner',
      'Wireless Router / Access Point',
      'Document Camera',
    ],
  },
  {
    name: 'Fixtures',
    code: 'fixtures',
    items: [
      'Ceiling Fan',
      'Air Conditioner Unit (Split/Window)',
      'LED Tube Light / Panel Light',
      'Wall Light Switch',
      'Electrical Power Outlet',
      'Door Lock / Handle Assembly',
      'Window Blinds / Curtain Rod',
      'Plumbing Faucet / Sink Assembly',
    ],
  },
  {
    name: 'Equipment',
    code: 'equipment',
    items: [
      'Science Microscope',
      'Bunsen Burner / Gas Hose',
      'Laboratory Centrifuge',
      'Fire Extinguisher (CO2/Dry Chemical)',
      'First Aid Kit Box',
      'Oscilloscope / Multimeter',
      'Paper Shredder Machine',
    ],
  },
  {
    name: 'Other',
    code: 'other',
    items: [
      'Trash Can / Litter Bin (General)',
      'Whiteboard / Cork Board',
      'Cleaning Broom / Mop Stand',
      'Extension Cord Wheel',
      'Wall Clock (Analog/Digital)',
    ],
  },
];

async function restoreCategory(def: DefaultCategory) {
  let category = await prisma.assetCategory.findUnique({ where: { code: def.code } });
  if (!category) {
    category = await prisma.assetCategory.create({
      data: { name: def.name, code: def.code, enabled: true },
    });
    console.log(`Created category: ${def.name}`);
  }

  const existing = await prisma.itemPreset.findMany({
    where: { categoryId: category.id },
    select: { name: true },
  });
  const existingNames = new Set(existing.map((item) => item.name.trim().toLowerCase()));
  const missing = def.items.filter((name) => !existingNames.has(name.trim().toLowerCase()));

  if (missing.length > 0) {
    await prisma.itemPreset.createMany({
      data: missing.map((name) => ({ categoryId: category.id, name, enabled: true })),
    });
  }

  console.log(`Restored ${def.name}: ${missing.length} item preset(s) added`);
}

async function main() {
  const requested = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
  const defs = requested.length > 0 ? DEFAULT_CATEGORIES.filter((d) => requested.includes(d.code)) : DEFAULT_CATEGORIES;

  if (defs.length === 0) {
    console.error(`Unknown category code(s): ${requested.join(', ')}`);
    console.error(`Available: ${DEFAULT_CATEGORIES.map((d) => d.code).join(', ')}`);
    process.exitCode = 1;
    return;
  }

  for (const def of defs) {
    await restoreCategory(def);
  }
}

main()
  .catch((error) => {
    console.error('Restore failed:', error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
