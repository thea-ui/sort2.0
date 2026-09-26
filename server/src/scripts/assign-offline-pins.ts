/**
 * BULK OFFLINE PIN ASSIGNMENT (emergency provisioning)
 * ---------------------------------------------------------------------------
 * During an EnrollPro outage nobody can sign in, and offline PINs must be set
 * while signed in — a chicken-and-egg problem. This tool lets an operator with
 * server/DB access provision PINs for a cohort so the school can keep working.
 *
 * It does NOT bypass authentication: PINs are only usable while the break-glass
 * fallback is armed (Admin -> Settings -> School & Sync) and EnrollPro is
 * unreachable.
 *
 * Two modes:
 *   --pin 246810          one shared temporary PIN for the whole cohort.
 *                         Fastest to distribute (one announcement), but anyone
 *                         who knows a learner's LRN could sign in as them for
 *                         the duration of the window.
 *   (default)             a unique random PIN per account, printed as a
 *                         distribution list. Safer; needs per-person handoff.
 *
 * Always writes to a file (and/or stdout) because the PINs cannot be read back
 * later — only the bcrypt hashes are stored.
 *
 * Usage:
 *   npm --prefix server run assign:pins -- --role STUDENT --pin 246810
 *   npm --prefix server run assign:pins -- --role TEACHER,MRF,ADMIN
 *   npm --prefix server run assign:pins -- --all --out pins.csv
 *   npm --prefix server run assign:pins -- --role STUDENT --dry-run
 *
 * Options:
 *   --identifier <id> One account (Employee ID / LRN / email); overrides --role
 *   --role <list>     Comma-separated roles: STUDENT, TEACHER, MRF, ADMIN
 *   --all             Every eligible account
 *   --pin <digits>    Shared PIN (6-8 digits) instead of unique random PINs
 *   --out <file>      Write the distribution list to a CSV file
 *   --dry-run         Show who would be affected; change nothing
 */
import dotenv from 'dotenv';
import { writeFileSync } from 'node:fs';
import { PrismaClient, Role } from '@prisma/client';
import { setOfflinePin, assertValidOfflinePin, getOfflineAuthState } from '../services/offline-auth.service.js';

dotenv.config();

const prisma = new PrismaClient();
const VALID_ROLES = new Set(['STUDENT', 'TEACHER', 'MRF', 'ADMIN']);

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const args: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) args[key] = true;
    else {
      args[key] = next;
      i++;
    }
  }
  return args;
}

function printHelp(): void {
  console.log(`
Bulk offline PIN assignment

  --identifier <id> One account (Employee ID / LRN / email); overrides --role
  --role <list>    Comma-separated: STUDENT, TEACHER, MRF, ADMIN
  --all            Every eligible account
  --pin <digits>   Shared 6-8 digit PIN for the whole cohort
  --out <file>     Write the distribution list to a CSV file
  --dry-run        Show who would be affected; change nothing

PINs are stored bcrypt-hashed and cannot be read back afterwards.
`);
}

/** Random 6-digit PIN that satisfies the policy (no obvious sequences). */
function randomPin(): string {
  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = String(Math.floor(100000 + Math.random() * 900000));
    try {
      assertValidOfflinePin(candidate);
      return candidate;
    } catch {
      /* re-roll */
    }
  }
  throw new Error('Could not generate a valid random PIN');
}

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.h) {
    printHelp();
    return;
  }

  const dryRun = args['dry-run'] === true;
  const sharedPin = typeof args.pin === 'string' ? args.pin.trim() : null;
  const outFile = typeof args.out === 'string' ? args.out : null;

  let roles: Role[];
  const singleIdentifier = typeof args.identifier === 'string' ? args.identifier.trim() : '';

  if (singleIdentifier) {
    roles = [...VALID_ROLES] as Role[]; // eligibility still comes from the lookup below
  } else if (args.all) {
    roles = [...VALID_ROLES] as Role[];
  } else {
    const raw = typeof args.role === 'string' ? args.role : '';
    if (!raw) {
      printHelp();
      throw new Error('Specify --identifier <id>, --role <list>, or --all.');
    }
    roles = raw
      .split(',')
      .map((r) => r.trim().toUpperCase())
      .filter(Boolean) as Role[];
    const invalid = roles.filter((r) => !VALID_ROLES.has(r));
    if (invalid.length > 0) throw new Error(`Unknown role(s): ${invalid.join(', ')}`);
  }

  if (sharedPin) assertValidOfflinePin(sharedPin);

  const users = await prisma.user.findMany({
    where: {
      ...(singleIdentifier
        ? {
            OR: [
              { employeeId: { equals: singleIdentifier, mode: 'insensitive' } },
              { enrollproLrn: { equals: singleIdentifier, mode: 'insensitive' } },
              { email: { equals: singleIdentifier, mode: 'insensitive' } },
            ],
          }
        : { role: { in: roles } }),
      syncSource: 'ENROLLPRO',
      archivedAt: null,
      NOT: { enrollmentStatus: { in: ['NOT_ENROLLED', 'ALUMNI'] } },
    },
    select: {
      id: true,
      name: true,
      employeeId: true,
      enrollproLrn: true,
      role: true,
      accountStatus: true,
      suspendedUntil: true,
    },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
  });

  const eligible = users.filter(
    (u) => !(u.accountStatus === 'SUSPENDED' && u.suspendedUntil && u.suspendedUntil > new Date())
  );

  const state = await getOfflineAuthState();
  console.log(`\nScope        : ${singleIdentifier ? `single account (${singleIdentifier})` : roles.join(', ')}`);
  console.log(`Eligible     : ${eligible.length} account(s)${users.length - eligible.length > 0 ? ` (${users.length - eligible.length} suspended, skipped)` : ''}`);
  console.log(`PIN mode     : ${sharedPin ? `shared (${'*'.repeat(sharedPin.length)})` : 'unique random per account'}`);
  console.log(`Offline auth : ${state.enabled ? `ARMED until ${state.expiresAt}` : 'DISABLED — arm it in Admin -> Settings -> School & Sync before users can sign in'}`);
  console.log(`Dry run      : ${dryRun ? 'yes (nothing will be written)' : 'no'}\n`);

  if (eligible.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  const rows: { identifier: string; name: string; role: string; pin: string }[] = [];

  for (const user of eligible) {
    const pin = sharedPin ?? randomPin();
    const identifier = user.enrollproLrn || user.employeeId;
    rows.push({ identifier, name: user.name, role: user.role, pin });

    if (!dryRun) {
      await setOfflinePin(user.id, pin);
    }
  }

  if (!dryRun) {
    console.log(`Assigned offline PINs to ${rows.length} account(s).\n`);
  }

  const csv = [
    'identifier,name,role,pin',
    ...rows.map((r) => [r.identifier, r.name, r.role, r.pin].map((v) => csvEscape(String(v))).join(',')),
  ].join('\n');

  if (outFile) {
    writeFileSync(outFile, csv, 'utf8');
    console.log(`Distribution list written to ${outFile}`);
    if (sharedPin) console.log(`Shared PIN: ${sharedPin}`);
  } else {
    console.log(csv);
    if (sharedPin) console.log(`\nShared PIN: ${sharedPin}`);
  }

  if (!dryRun) {
    console.log('\nHand each person their PIN. Users sign in with their usual LRN / Employee ID and this PIN.');
    console.log('PINs cannot be read back later (only bcrypt hashes are stored) — keep this list safe, then destroy it.');
  }
}

main()
  .catch((err) => {
    console.error(`\n[assign-pins] ${err.message}`);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
