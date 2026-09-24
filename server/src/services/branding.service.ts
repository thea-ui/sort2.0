import { PrismaClient, type SystemSetting } from '@prisma/client';
import type { Response } from 'express';

const prisma = new PrismaClient();

// ─── Public branding contract ─────────────────────────────────────────
// Mirrors the EnrollPro-compatible settings shape consumed by the client
// ThemeProvider (fetch -> cache -> apply -> SSE). Never add secrets here:
// this payload is served without authentication.

export const BRANDING_DEFAULTS = {
  schoolName: 'School Name',
  schoolAcronym: null as string | null,
  schoolId: null as string | null,
  division: null as string | null,
  region: null as string | null,
  address: null as string | null,
  schoolHeadName: null as string | null,
  primaryColor: '#00271D',
  secondaryColor: '#00A77C',
  accentColor: '#00A77C',
  goldColor: '#C69B26',
  logoUrl: null as string | null,
} as const;

export interface PublicBranding {
  schoolName: string;
  schoolAcronym: string | null;
  schoolId: string | null;
  division: string | null;
  region: string | null;
  address: string | null;
  schoolHeadName: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  goldColor: string;
  logoUrl: string | null;
  currentSchoolYear: string | null;
  enrollproPublicUrl: string;
}

const COLOR_FIELDS = ['primaryColor', 'secondaryColor', 'accentColor', 'goldColor'] as const;
const TEXT_LIMITS: Record<string, number> = {
  schoolName: 120,
  schoolAcronym: 20,
  schoolId: 40,
  division: 120,
  region: 120,
  address: 240,
  schoolHeadName: 120,
  logoUrl: 500,
  enrollproPublicUrl: 300,
  enrollproUrl: 300,
};

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export type BrandingPatch = Partial<Record<keyof typeof TEXT_LIMITS | (typeof COLOR_FIELDS)[number], string | null>>;

/**
 * Whitelist + normalise an untrusted branding patch. Unknown keys are dropped,
 * colors must be 6-digit hex, text is trimmed and length-capped.
 */
export function sanitizeBrandingPatch(input: Record<string, unknown>): BrandingPatch {
  const patch: BrandingPatch = {};

  for (const [key, limit] of Object.entries(TEXT_LIMITS)) {
    const value = input[key];
    if (value === undefined) continue;
    if (value === null) {
      patch[key] = null;
      continue;
    }
    if (typeof value !== 'string') continue;
    const trimmed = value.trim().slice(0, limit);
    patch[key] = trimmed.length > 0 ? trimmed : null;
  }

  for (const key of COLOR_FIELDS) {
    const value = input[key];
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (HEX_COLOR.test(trimmed)) patch[key] = trimmed.toLowerCase();
  }

  return patch;
}

/**
 * EnrollPro origin for reverse navigation. Prefers the stored value, then the
 * environment, then the shared dev default; always without a trailing `/api`.
 */
export function getEnrollProPublicUrl(stored?: string | null): string {
  const raw =
    stored ||
    process.env.ENROLLPRO_PUBLIC_URL ||
    process.env.ENROLLPRO_BASE_URL ||
    'https://dev-jegs.buru-degree.ts.net/api';
  return raw.replace(/\/api\/?$/, '').replace(/\/+$/, '');
}

export function toPublicBranding(
  row: Partial<SystemSetting> | null,
  currentSchoolYear: string | null = null
): PublicBranding {
  const text = (value: string | null | undefined, fallback: string | null) =>
    value && value.trim().length > 0 ? value : fallback;

  return {
    schoolName: text(row?.schoolName, BRANDING_DEFAULTS.schoolName) as string,
    schoolAcronym: text(row?.schoolAcronym, null),
    schoolId: text(row?.schoolId, null),
    division: text(row?.division, null),
    region: text(row?.region, null),
    address: text(row?.address, null),
    schoolHeadName: text(row?.schoolHeadName, null),
    primaryColor: text(row?.primaryColor, BRANDING_DEFAULTS.primaryColor) as string,
    secondaryColor: text(row?.secondaryColor, BRANDING_DEFAULTS.secondaryColor) as string,
    accentColor: text(row?.accentColor, BRANDING_DEFAULTS.accentColor) as string,
    goldColor: text(row?.goldColor, BRANDING_DEFAULTS.goldColor) as string,
    logoUrl: text(row?.logoUrl, null),
    currentSchoolYear: currentSchoolYear && currentSchoolYear.trim().length > 0 ? currentSchoolYear : null,
    enrollproPublicUrl: getEnrollProPublicUrl(row?.enrollproPublicUrl),
  };
}

export async function getPublicBranding(): Promise<PublicBranding> {
  const [row, activeYear] = await Promise.all([
    prisma.systemSetting.findUnique({ where: { id: 'default_setting' } }),
    prisma.schoolYear.findFirst({ where: { isActive: true }, select: { label: true } }),
  ]);
  return toPublicBranding(row, activeYear?.label ?? null);
}

// ─── Live update channel (SSE) ────────────────────────────────────────
// Same pattern as SMART's settings stream: unnamed `data:` frames plus a
// 30s comment heartbeat, consumed by EventSource in the client.

const streamClients = new Set<Response>();

export function addBrandingStreamClient(res: Response): void {
  streamClients.add(res);
}

export function removeBrandingStreamClient(res: Response): void {
  streamClients.delete(res);
}

export function getBrandingStreamClientCount(): number {
  return streamClients.size;
}

export function broadcastBranding(branding: PublicBranding): void {
  const frame = `data: ${JSON.stringify(branding)}\n\n`;
  for (const client of streamClients) {
    try {
      client.write(frame);
    } catch {
      streamClients.delete(client);
    }
  }
}

/**
 * Persist a validated branding patch and push the new values to every open
 * stream. Returns the public payload so callers can respond with it.
 */
export async function saveBranding(patch: BrandingPatch): Promise<PublicBranding> {
  await prisma.systemSetting.upsert({
    where: { id: 'default_setting' },
    update: { ...patch },
    create: { id: 'default_setting', ...patch },
  });
  const branding = await getPublicBranding();
  broadcastBranding(branding);
  return branding;
}
