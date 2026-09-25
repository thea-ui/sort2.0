/**
 * EMERGENCY BREAK-GLASS SESSION MINT
 * ---------------------------------------------------------------------------
 * Purpose: restore operator access to SORT while the identity provider
 * (EnrollPro) is unreachable. SORT login is strictly delegated to EnrollPro, so
 * once EnrollPro is down every fresh login returns 503. This script mints a
 * REAL `user_sessions` row for an already-provisioned account, which makes the
 * normal local `/api/auth/refresh` rotation work — the holder keeps working for
 * the break-glass window without ever contacting EnrollPro again.
 *
 * Authorization model: this requires direct database access + the server's
 * JWT_SECRET. It cannot be invoked over the network and refuses accounts that
 * are not provisioned (`syncSource !== 'ENROLLPRO'`), suspended, archived, or
 * not enrolled. It never creates users, never changes passwords, and never
 * touches EnrollPro credentials.
 *
 * Every mint writes an `audit_logs` row (`OFFLINE_SESSION_MINTED`).
 *
 * Usage:
 *   npm --prefix server run emergency:session -- --list
 *   npm --prefix server run emergency:session -- --id 1234501
 *   npm --prefix server run emergency:session -- --id 1234501 --hours 24
 *
 * Output contains live tokens and account identifiers. Do not paste it into
 * chat, tickets, or logs.
 */
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { validateEnv, getJwtSecret } from '../config/env.js';

dotenv.config();

const prisma = new PrismaClient();

const ACCESS_EXPIRY_SECONDS = 15 * 60;
const DEFAULT_HOURS = 72;
const MAX_HOURS = 72;
const BREAK_GLASS_TAG = 'BREAK-GLASS (emergency-session script)';

function maskId(value: string | null | undefined): string {
  const id = String(value ?? '').trim();
  if (id.length <= 4) return '****';
  return `${id.slice(0, 2)}${'*'.repeat(id.length - 4)}${id.slice(-2)}`;
}

function formatDuration(hours: number): string {
  return hours === 1 ? '1 hour' : `${hours} hours`;
}

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const args: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
    } else {
      args[key] = next;
      i++;
    }
  }
  return args;
}

function printHelp(): void {
  console.log(`
SORT emergency break-glass session

  --list                 List provisioned accounts eligible for a mint
  --id <identifier>      Employee ID, LRN, or email of the account to mint
  --hours <n>            Session lifetime (1-${MAX_HOURS}, default ${DEFAULT_HOURS})
  --help                 Show this message

The script refuses accounts that are not EnrollPro-provisioned, suspended,
archived, or not enrolled. Every mint is written to audit_logs.
`);
}

async function listCandidates(): Promise<void> {
  const users = await prisma.user.findMany({
    where: { syncSource: 'ENROLLPRO' },
    select: {
      id: true,
      name: true,
      role: true,
      employeeId: true,
      enrollproLrn: true,
      email: true,
      accountStatus: true,
      archivedAt: true,
      enrollmentStatus: true,
    },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
    take: 500,
  });

  const eligible = users.filter(
    (u) =>
      u.accountStatus !== 'SUSPENDED' &&
      !u.archivedAt &&
      !(u.role === 'STUDENT' && (u.enrollmentStatus === 'NOT_ENROLLED' || u.enrollmentStatus === 'ALUMNI'))
  );

  console.log(`\nProvisioned accounts eligible for a break-glass mint: ${eligible.length}\n`);
  console.log('ROLE     | IDENTIFIER           | NAME');
  console.log('---------|----------------------|------------------------------');
  for (const u of eligible) {
    const identifier = u.employeeId || u.enrollproLrn || u.email;
    console.log(
      `${u.role.padEnd(8)} | ${String(identifier).padEnd(20)} | ${u.name}`
    );
  }
  const excluded = users.length - eligible.length;
  if (excluded > 0) {
    console.log(`\n(${excluded} excluded: suspended, archived, or not enrolled)`);
  }
  console.log('\nThis output contains account identifiers. Do not share it.\n');
}

async function mint(identifier: string, hours: number): Promise<void> {
  if (!Number.isFinite(hours) || hours <= 0 || hours > MAX_HOURS) {
    throw new Error(`--hours must be between 1 and ${MAX_HOURS}.`);
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { employeeId: { equals: identifier, mode: 'insensitive' } },
        { enrollproLrn: { equals: identifier, mode: 'insensitive' } },
        { email: { equals: identifier, mode: 'insensitive' } },
      ],
    },
  });

  if (!user) {
    throw new Error(`No account found for "${maskId(identifier)}". Use --list to see eligible accounts.`);
  }

  if (user.syncSource !== 'ENROLLPRO') {
    throw new Error(
      `Account ${maskId(identifier)} is not EnrollPro-provisioned (syncSource=${user.syncSource}). ` +
        'Break-glass sessions are only for mirrored accounts; offline demo accounts cannot be minted.'
    );
  }

  if (user.accountStatus === 'SUSPENDED' && user.suspendedUntil && user.suspendedUntil > new Date()) {
    throw new Error(
      `Account ${maskId(identifier)} is suspended until ${user.suspendedUntil.toISOString()}. Refusing to mint.`
    );
  }

  if (user.archivedAt) {
    throw new Error(`Account ${maskId(identifier)} is archived. Refusing to mint.`);
  }

  if (user.role === 'STUDENT' && (user.enrollmentStatus === 'NOT_ENROLLED' || user.enrollmentStatus === 'ALUMNI')) {
    throw new Error(
      `Student ${maskId(identifier)} is not enrolled for the current school year (${user.enrollmentStatus}). Refusing to mint.`
    );
  }

  const refreshToken = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

  const session = await prisma.userSession.create({
    data: {
      userId: user.id,
      refreshToken,
      deviceInfo: BREAK_GLASS_TAG,
      ipAddress: 'local-script',
      expiresAt,
    },
  });

  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    getJwtSecret(),
    { expiresIn: ACCESS_EXPIRY_SECONDS }
  );

  await prisma.auditLog.create({
    data: {
      actorName: 'emergency-session-script',
      actorRole: 'SYSTEM',
      actionType: 'OFFLINE_SESSION_MINTED',
      details: JSON.stringify({
        sessionId: session.id,
        targetRole: user.role,
        maskedTarget: maskId(identifier),
        hours,
        expiresAt: expiresAt.toISOString(),
      }),
      ipAddress: 'local-script',
    },
  });

  const snippet = [
    `sessionStorage.setItem(\`sortv2_token\`, \`${accessToken}\`);`,
    `sessionStorage.setItem(\`sortv2_user_id\`, \`${user.id}\`);`,
    'sessionStorage.setItem(`sort_auth`, `true`);',
    `localStorage.setItem(\`sortv2_refresh_${user.id}\`, \`${refreshToken}\`);`,
    'location.reload();',
  ].join('\n  ');

  console.log(`
=== BREAK-GLASS SESSION MINTED ===

  Account    : ${user.name} (${user.role})
  Identifier : ${maskId(identifier)}
  Session    : ${session.id}
  Expires    : ${expiresAt.toISOString()} (${formatDuration(hours)})
  Audit row  : OFFLINE_SESSION_MINTED

  1. Open the SORT app in your browser and stay on its origin.
  2. Open DevTools -> Console.
  3. Paste this and press Enter:

  ${snippet}

  4. The app reloads signed in. Keep the tab open - access refreshes every
     12 minutes against SORT's own endpoint, so no EnrollPro contact is needed.

  Treat the block above as a live credential. Do not share it.
`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || args.h) {
    printHelp();
    return;
  }

  validateEnv();

  if (args.list) {
    await listCandidates();
    return;
  }

  const identifier = typeof args.id === 'string' ? args.id.trim() : '';
  if (!identifier) {
    printHelp();
    throw new Error('Missing required --id <identifier>.');
  }

  const hours = typeof args.hours === 'string' ? Number(args.hours) : DEFAULT_HOURS;
  await mint(identifier, hours);
}

main()
  .catch((err) => {
    console.error(`\n[emergency-session] ${err.message}`);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
