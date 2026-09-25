import { PrismaClient, SyncStatus, SyncSource, Role } from '@prisma/client';
import { ensureSchoolYear } from './rollover.service.js';
import { assessRoster, isPurgeableLocalAccount } from './enrollpro-sync-guard.js';

const prisma = new PrismaClient();

const ENROLLPRO_BASE = process.env.ENROLLPRO_BASE_URL || 'https://dev-jegs.buru-degree.ts.net/api';
const ENROLLPRO_SYNC_SECRET = process.env.ENROLLPRO_SYNC_SECRET || '';

// Role overrides: "1234503=MRF,1234501=ADMIN"
const ROLE_OVERRIDES: Record<string, Role> = {};
if (process.env.ENROLLPRO_ROLE_OVERRIDES) {
  for (const pair of process.env.ENROLLPRO_ROLE_OVERRIDES.split(',')) {
    const [empId, role] = pair.trim().split('=');
    if (empId && role && Role[role as keyof typeof Role]) {
      ROLE_OVERRIDES[empId.trim()] = Role[role as keyof typeof Role];
    }
  }
}
console.log('[Sync] Role overrides:', ROLE_OVERRIDES);

// ─── EnrollPro API Response Types (matching actual responses) ──────────

interface EnrollProLearnerResponse {
  enrollmentApplicationId: number;
  status: string;
  learnerType: string;
  learner: {
    id: number;
    externalId: string;
    lrn: string;
    firstName: string;
    lastName: string;
    middleName?: string;
    extensionName?: string;
    sex?: string;
    birthdate?: string;
    portalAccount?: {
      isActive?: boolean;
      mustChangePassword?: boolean;
      accountName?: string;
    } | null;
  };
  gradeLevel: { id: number; name: string };
  section: { id: number; name: string; programType?: string };
  schoolYear: { id: number; yearLabel: string };
  enrolledAt?: string;
}

interface EnrollProFacultyResponse {
  teacherId: number;
  employeeId: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  email?: string;
  departmentName?: string;
  advisorySectionName?: string;
  advisorySectionGradeLevelName?: string;
  schoolYearId: number;
  schoolYearLabel: string;
  isClassAdviser?: boolean;
}

interface EnrollProStaffResponse {
  id: number;
  employeeId: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  suffix?: string;
  email?: string;
  roles: string[];
  isActive: boolean;
  schoolYearId?: number;
  schoolYearLabel?: string;
}

interface EnrollProMeta {
  generatedAt?: string;
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

interface EnrollProResponse<T> {
  data: T[];
  meta: EnrollProMeta;
}

interface EnrollProSchoolYear {
  id: number;
  yearLabel: string;
  termFormat?: string;
  terms?: { identity?: string; displayLabel?: string; startDate?: string | null; endDate?: string | null }[];
  term1Start?: string | null;
  term1End?: string | null;
  term2Start?: string | null;
  term2End?: string | null;
  term3Start?: string | null;
  term3End?: string | null;
  term4Start?: string | null;
  term4End?: string | null;
}

// ─── Helpers ───────────────────────────────────────────────────────────

function buildFullName(last?: string, first?: string, middle?: string): string {
  const parts = [last, first, middle].filter(Boolean);
  return parts.join(', ') || 'Unknown';
}

function mapRole(roles: string[]): Role {
  const r = roles.map(x => x.toUpperCase()).join(' ');
  if (r.includes('ADMIN') || r.includes('SYSTEM_ADMIN') || r.includes('HEAD_REGISTRAR') || r.includes('REGISTRAR')) {
    return Role.ADMIN;
  }
  if (r.includes('TEACHER') || r.includes('ADVISER') || r.includes('CLASS_ADVISER')) {
    return Role.TEACHER;
  }
  if (r.includes('MRF')) {
    return Role.MRF;
  }
  // Least privilege: an unrecognised role string must never escalate to ADMIN.
  // Baseline staff access is TEACHER (same fallback used for staff records above).
  return Role.TEACHER;
}

/**
 * Resolve the full start/end range of an EnrollPro school year. The school year
 * spans all terms, so the end date must be the LAST term end — not term1End.
 * Falls back to the nested `terms` array and finally to a one-year span.
 */
export function resolveSchoolYearRange(sy: EnrollProSchoolYear): { startDate?: Date; endDate?: Date } {
  const starts: string[] = [];
  const ends: string[] = [];

  for (const s of [sy.term1Start, sy.term2Start, sy.term3Start, sy.term4Start]) {
    if (s) starts.push(s);
  }
  for (const e of [sy.term1End, sy.term2End, sy.term3End, sy.term4End]) {
    if (e) ends.push(e);
  }

  if (starts.length === 0 && Array.isArray(sy.terms)) {
    for (const t of sy.terms) {
      if (t?.startDate) starts.push(t.startDate);
      if (t?.endDate) ends.push(t.endDate);
    }
  }

  const startMs = starts.map((s) => new Date(s).getTime()).filter((n) => !isNaN(n));
  const endMs = ends.map((e) => new Date(e).getTime()).filter((n) => !isNaN(n));
  if (startMs.length === 0 || endMs.length === 0) return {};

  const startDate = new Date(Math.min(...startMs));
  let endDate = new Date(Math.max(...endMs));

  // Safety net: a valid school year must have endDate > startDate.
  if (endDate <= startDate) {
    endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 1);
    endDate.setDate(endDate.getDate() - 1);
  }

  return { startDate, endDate };
}

// ─── API Fetcher with Pagination ───────────────────────────────────────

async function fetchAllPages<T>(endpoint: string, schoolYearId?: number): Promise<T[]> {
  const results: T[] = [];
  let page = 1;
  const limit = 200;
  let totalPages = 1;

  const baseHeaders: Record<string, string> = { 'Content-Type': 'application/json' };

  // Integration endpoints require X-Integration-Key, not JWT
  if (ENROLLPRO_SYNC_SECRET) {
    baseHeaders['X-Integration-Key'] = ENROLLPRO_SYNC_SECRET;
  }

  while (page <= totalPages) {
    const url = new URL(`${ENROLLPRO_BASE}${endpoint}`);
    url.searchParams.set('page', String(page));
    url.searchParams.set('limit', String(limit));
    if (schoolYearId) url.searchParams.set('schoolYearId', String(schoolYearId));

    const res = await fetch(url.toString(), { headers: baseHeaders });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`${endpoint} returned ${res.status}: ${body || res.statusText}`);
    }

    const json = await res.json() as EnrollProResponse<T>;
    results.push(...json.data);

    if (json.meta?.totalPages) {
      totalPages = json.meta.totalPages;
    } else if (json.data.length < limit) {
      break;
    }
    page++;
  }

  return results;
}

// ─── School-Year Mirror ────────────────────────────────────────────────

function integrationHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (ENROLLPRO_SYNC_SECRET) headers['X-Integration-Key'] = ENROLLPRO_SYNC_SECRET;
  return headers;
}

interface EnrollProSchoolYearTemplate {
  startMonthDay: string;
  endMonthDay: string;
}

export interface EnrollProSchoolYearCatalog {
  supported: boolean;
  years: EnrollProSchoolYear[];
  activeId?: number;
  template?: EnrollProSchoolYearTemplate;
  source: 'LIST' | 'ENUMERATED' | 'NONE';
}

function monthDay(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return `${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function buildTemplate(years: EnrollProSchoolYear[]): EnrollProSchoolYearTemplate | undefined {
  for (const sy of years) {
    const { startDate, endDate } = resolveSchoolYearRange(sy);
    if (startDate && endDate) {
      return {
        startMonthDay: monthDay(startDate.toISOString()) || '06-08',
        endMonthDay: monthDay(endDate.toISOString()) || '04-08',
      };
    }
  }
  return undefined;
}

/**
 * Derive a date range from a `YYYY-YYYY` label for years whose term data is
 * unavailable (EnrollPro returns 409 for those). Uses the academic calendar
 * pattern observed on other years, defaulting to Jun 8 → Apr 8.
 */
function deriveRangeFromLabel(
  label: string,
  template?: EnrollProSchoolYearTemplate
): { startDate?: Date; endDate?: Date } {
  const match = /^(\d{4})-(\d{4})$/.exec(label.trim());
  if (!match) return {};
  const startMonthDay = template?.startMonthDay || '06-08';
  const endMonthDay = template?.endMonthDay || '04-08';
  const startDate = new Date(`${match[1]}-${startMonthDay}T00:00:00.000Z`);
  const endDate = new Date(`${match[2]}-${endMonthDay}T00:00:00.000Z`);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return {};
  return { startDate, endDate };
}

async function fetchActiveEnrollProSchoolYear(): Promise<EnrollProSchoolYear | null> {
  const res = await fetch(`${ENROLLPRO_BASE}/integration/v1/school-year`, { headers: integrationHeaders() });
  if (!res.ok) return null;
  const json = await res.json() as { data?: EnrollProSchoolYear };
  return json.data?.id ? json.data : null;
}

/**
 * Resolve a single EnrollPro school year by ID.
 * - 200: full record with term dates.
 * - 404: the year does not exist.
 * - other (e.g. 409 TERM_ORDER_INVALID): the year exists but its term data is
 *   inconsistent; recover the label from the section/learner rosters so
 *   historical years still mirror.
 */
async function resolveEnrollProSchoolYearById(id: number): Promise<EnrollProSchoolYear | null> {
  const headers = integrationHeaders();

  const res = await fetch(`${ENROLLPRO_BASE}/integration/v1/school-year?schoolYearId=${id}`, { headers });
  if (res.ok) {
    const json = await res.json() as { data?: EnrollProSchoolYear };
    if (json.data?.id && json.data?.yearLabel) return json.data;
  }
  if (res.status === 404) return null;

  const labelFrom = async (path: string): Promise<string | null> => {
    try {
      const r = await fetch(`${ENROLLPRO_BASE}${path}?schoolYearId=${id}&page=1&limit=1`, { headers });
      if (!r.ok) return null;
      const j = await r.json() as { data?: Array<{ schoolYear?: { id: number; yearLabel: string } }> };
      return j.data?.[0]?.schoolYear?.yearLabel ?? null;
    } catch {
      return null;
    }
  };

  const label = (await labelFrom('/integration/v1/sections')) ?? (await labelFrom('/integration/v1/learners'));
  return label ? { id, yearLabel: label } : null;
}

/**
 * Enumerate EnrollPro school years when no list endpoint exists.
 *
 * School years are created sequentially, so historical years have IDs lower
 * than the active year. We walk downward from the active ID and stop after a
 * short run of consecutive misses (tolerating small ID gaps).
 */
async function enumerateEnrollProSchoolYears(activeId: number): Promise<EnrollProSchoolYear[]> {
  const years: EnrollProSchoolYear[] = [];
  const MAX_PROBES = 60;
  const MAX_CONSECUTIVE_MISSES = 4;
  let consecutiveMisses = 0;

  for (let id = activeId, probes = 0; id >= 1 && probes < MAX_PROBES && consecutiveMisses < MAX_CONSECUTIVE_MISSES; id--, probes++) {
    const sy = await resolveEnrollProSchoolYearById(id);
    if (sy) {
      years.push(sy);
      consecutiveMisses = 0;
    } else {
      consecutiveMisses++;
    }
  }

  return years;
}

/**
 * Fetch the full EnrollPro school-year catalog.
 *
 * Preferred: a dedicated list endpoint (if the partner ever adds one).
 * Fallback: enumerate IDs around the active year. Enumeration recovers labels
 * from the roster endpoints when `/school-year` fails on old years.
 */
export async function fetchEnrollProSchoolYears(): Promise<EnrollProSchoolYearCatalog> {
  // 1. Preferred list endpoint.
  const listRes = await fetch(`${ENROLLPRO_BASE}/integration/v1/school-years?page=1&limit=200`, { headers: integrationHeaders() });
  if (listRes.ok) {
    const json = await listRes.json() as { data?: EnrollProSchoolYear[] | { data?: EnrollProSchoolYear[] } };
    const payload = json.data as any;
    const years: EnrollProSchoolYear[] = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
    if (years.length > 0) {
      return { supported: true, years, template: buildTemplate(years), source: 'LIST' };
    }
  }

  // 2. Fallback enumeration around the authoritative active year.
  const active = await fetchActiveEnrollProSchoolYear();
  if (!active?.id) {
    return { supported: false, years: [], source: 'NONE' };
  }

  const enumerated = await enumerateEnrollProSchoolYears(active.id);
  if (!enumerated.some((y) => y.id === active.id)) enumerated.push(active);
  enumerated.sort((a, b) => b.id - a.id);

  return {
    supported: true,
    years: enumerated,
    activeId: active.id,
    template: buildTemplate(enumerated),
    source: 'ENUMERATED',
  };
}

export interface SchoolYearMirrorResult {
  supported: boolean;
  fetched: number;
  created: number;
  updated: number;
  linked: number;
  message?: string;
}

/**
 * Mirror every EnrollPro school year into the local DB.
 *
 * Safety contract:
 * - Never activates or archives a year (the active pointer stays owned by sync).
 * - Never triggers a rollover.
 * - Creates missing historical years as inactive, non-archived rows.
 * - Idempotent: re-running only updates / links existing rows.
 */
export async function mirrorEnrollProSchoolYears(): Promise<SchoolYearMirrorResult> {
  const result: SchoolYearMirrorResult = { supported: false, fetched: 0, created: 0, updated: 0, linked: 0 };

  const catalog = await fetchEnrollProSchoolYears();
  result.supported = catalog.supported;

  if (!catalog.supported) {
    result.message = 'Could not reach the EnrollPro school-year catalog.';
    return result;
  }

  result.fetched = catalog.years.length;

  for (const sy of catalog.years) {
    if (!sy?.id || !sy?.yearLabel) continue;

    let { startDate, endDate } = resolveSchoolYearRange(sy);
    if (!startDate || !endDate) {
      ({ startDate, endDate } = deriveRangeFromLabel(sy.yearLabel, catalog.template));
    }
    if (!startDate || !endDate) continue;

    const byEnrollproId = await prisma.schoolYear.findUnique({ where: { enrollproId: sy.id } });
    if (byEnrollproId) {
      await prisma.schoolYear.update({
        where: { id: byEnrollproId.id },
        data: { label: sy.yearLabel, startDate, endDate },
      });
      result.updated++;
      continue;
    }

    // Link a manually created year that has no EnrollPro ID yet but matches by label.
    const byLabel = await prisma.schoolYear.findFirst({
      where: { label: sy.yearLabel, enrollproId: null },
    });
    if (byLabel) {
      await prisma.schoolYear.update({
        where: { id: byLabel.id },
        data: { enrollproId: sy.id, startDate, endDate },
      });
      result.linked++;
      continue;
    }

    await prisma.schoolYear.create({
      data: {
        enrollproId: sy.id,
        label: sy.yearLabel,
        startDate,
        endDate,
        isActive: false,
        isArchived: false,
      },
    });
    result.created++;
  }

  return result;
}

// ─── Core Sync Logic ───────────────────────────────────────────────────

interface CohortResult {
  pulled: number;
  created: number;
  updated: number;
  deleted: number;
  error?: string;
}

interface SyncResult {
  recordsPulled: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsDeleted: number;
  durationMs: number;
  schoolYearId?: number;
  schoolYearLabel?: string;
  status: SyncStatus;
  cohortResults: {
    learners: CohortResult;
    faculty: CohortResult;
    staff: CohortResult;
  };
  message?: string;
  error?: string;
  /** Cohorts whose archive reconciliation was deliberately withheld. */
  reconciliationSkipped?: string[];
}

export interface RunSyncOptions {
  /**
   * Opt-in override for the empty-roster guard. By default a cohort whose
   * roster comes back with 0 records while local accounts still exist is
   * treated as suspect: reconciliation is skipped so a degraded EnrollPro
   * response cannot archive the entire cohort. Set this only when an empty
   * roster is genuinely expected (e.g. a brand-new school year).
   */
  allowEmpty?: boolean;
}

export async function runEnrollProSync(options: RunSyncOptions = {}): Promise<SyncResult> {
  const start = Date.now();
  const errors: string[] = [];
  const reconciliationSkipped = new Map<'learners' | 'faculty' | 'staff', string>();

  const cohortResults = {
    learners: { pulled: 0, created: 0, updated: 0, deleted: 0 } as CohortResult,
    faculty: { pulled: 0, created: 0, updated: 0, deleted: 0 } as CohortResult,
    staff: { pulled: 0, created: 0, updated: 0, deleted: 0 } as CohortResult,
  };

  try {
    // 1. Get school year context
    const schoolYearRes = await fetch(`${ENROLLPRO_BASE}/integration/v1/school-year`, { headers: integrationHeaders() });
    let schoolYearId: number | undefined;
    let schoolYearLabel: string | undefined;
    let activeSchoolYear: EnrollProSchoolYear | undefined;

    if (schoolYearRes.ok) {
      const syData = await schoolYearRes.json() as { data?: EnrollProSchoolYear };
      activeSchoolYear = syData.data;
      schoolYearId = activeSchoolYear?.id;
      schoolYearLabel = activeSchoolYear?.yearLabel;
    } else {
      // Learner and faculty rosters are school-year scoped. Without an SY id the
      // fetch is unscoped, so the result cannot be trusted to prove that an
      // account disappeared — reconciliation for those cohorts is skipped below.
      // Staff is not SY-scoped and still reconciles normally.
      reconciliationSkipped.set('learners', `active school-year unavailable (HTTP ${schoolYearRes.status})`);
      reconciliationSkipped.set('faculty', `active school-year unavailable (HTTP ${schoolYearRes.status})`);
      errors.push(`school-year context unavailable: HTTP ${schoolYearRes.status}`);
      console.warn(`[Sync] Active school-year fetch returned HTTP ${schoolYearRes.status}; learner/faculty reconciliation will be skipped`);
    }

    // 1b. Mirror the full EnrollPro school-year catalog. This never activates
    //     or rolls a year over — it only fills in the historical years SORT has
    //     been missing. When EnrollPro has no list endpoint, the catalog is
    //     enumerated from the active year.
    try {
      const mirror = await mirrorEnrollProSchoolYears();
      if (mirror.supported) {
        console.log(`[Sync] School-year mirror: ${mirror.created} created, ${mirror.updated} updated, ${mirror.linked} linked (${mirror.fetched} fetched)`);
      } else {
        console.log('[Sync] School-year catalog unavailable — keeping existing years');
      }
    } catch (mirrorErr: any) {
      console.error('[Sync] School-year mirror error:', mirrorErr.message);
      errors.push(`school-year mirror: ${mirrorErr.message}`);
    }

    if (schoolYearId && schoolYearLabel) {
      try {
        const { startDate: syStartDate, endDate: syEndDate } = activeSchoolYear
          ? resolveSchoolYearRange(activeSchoolYear)
          : {};
        const { rolloverTriggered } = await ensureSchoolYear(schoolYearId, schoolYearLabel, syStartDate, syEndDate);
        if (rolloverTriggered) {
          console.log(`[Sync] School year rollover triggered: transitioned to "${schoolYearLabel}"`);
        }

        // Correct the active year's dates/label from EnrollPro (fixes years that
        // were previously stored with term1End as the school-year end).
        if (syStartDate && syEndDate) {
          await prisma.schoolYear.updateMany({
            where: { enrollproId: schoolYearId },
            data: { label: schoolYearLabel, startDate: syStartDate, endDate: syEndDate },
          });
        }
      } catch (rolloverErr: any) {
        console.error('[Sync] School year rollover error:', rolloverErr.message);
        errors.push(`rollover: ${rolloverErr.message}`);
      }
    }

    // 2. Fetch all data in parallel — track success/failure per cohort
    const [learnerResult, facultyResult, staffResult] = await Promise.allSettled([
      fetchAllPages<EnrollProLearnerResponse>('/integration/v1/learners', schoolYearId),
      fetchAllPages<EnrollProFacultyResponse>('/integration/v1/faculty', schoolYearId),
      fetchAllPages<EnrollProStaffResponse>('/integration/v1/staff'),
    ]);

    const learnerResponses = learnerResult.status === 'fulfilled' ? learnerResult.value : [];
    const facultyResponses = facultyResult.status === 'fulfilled' ? facultyResult.value : [];
    const staffResponses = staffResult.status === 'fulfilled' ? staffResult.value : [];

    if (learnerResult.status === 'rejected') {
      cohortResults.learners.error = learnerResult.reason?.message || 'Learner fetch failed';
      errors.push(`learners: ${cohortResults.learners.error}`);
    }
    if (facultyResult.status === 'rejected') {
      cohortResults.faculty.error = facultyResult.reason?.message || 'Faculty fetch failed';
      errors.push(`faculty: ${cohortResults.faculty.error}`);
    }
    if (staffResult.status === 'rejected') {
      cohortResults.staff.error = staffResult.reason?.message || 'Staff fetch failed';
      errors.push(`staff: ${cohortResults.staff.error}`);
    }

    cohortResults.learners.pulled = learnerResponses.length;
    cohortResults.faculty.pulled = facultyResponses.length;
    cohortResults.staff.pulled = staffResponses.length;

    // 3. Build sync entries with cohort tracking
    type SyncEntry = {
      enrollproId: string;
      email: string;
      name: string;
      employeeId: string;
      role: Role;
      gradeLevel?: string;
      sectionName?: string;
      academicProgram?: string;
      enrollproLrn?: string;
      schoolYearId?: number;
      schoolYearLabel?: string;
      portalAccountActive?: boolean;
      cohort: 'learners' | 'faculty' | 'staff';
    };

    const syncEntries: SyncEntry[] = [];

    for (const lr of learnerResponses) {
      const learner = lr.learner;
      if (!learner) continue;
      const extId = String(learner.externalId || learner.id);
      const lrn = learner.lrn || undefined;
      const email = lrn ? `${lrn}@sort.local` : `learner-${extId}@sort.local`;
      const portalActive = lr.learner.portalAccount ? (lr.learner.portalAccount.isActive ?? true) : false;
      syncEntries.push({
        enrollproId: `learner-${extId}`, email: email.toLowerCase(),
        name: buildFullName(learner.lastName, learner.firstName, learner.middleName),
        employeeId: lrn || `LRN-${extId}`, role: Role.STUDENT,
        gradeLevel: lr.gradeLevel?.name, sectionName: lr.section?.name,
        academicProgram: lr.section?.programType, enrollproLrn: lrn,
        schoolYearId: lr.schoolYear?.id || schoolYearId,
        schoolYearLabel: lr.schoolYear?.yearLabel || schoolYearLabel,
        portalAccountActive: portalActive,
        cohort: 'learners',
      });
    }

    const facultyEmpIds = new Set(facultyResponses.map(f => f.employeeId).filter(Boolean));
    const staffByEmployeeId = new Map(staffResponses.map(s => [s.employeeId, s]));

    for (const f of facultyResponses) {
      const empId = f.employeeId || `EMP-${f.teacherId}`;
      const email = f.email || `faculty-${empId}@sort.local`;
      // Faculty records carry no `roles` field. When the same employee also
      // appears in the staff list we mirror the authoritative staff role instead
      // of silently defaulting to TEACHER (which previously discarded admin /
      // registrar roles unless a manual ENROLLPRO_ROLE_OVERRIDES entry existed).
      const staffRoles = staffByEmployeeId.get(empId)?.roles;
      syncEntries.push({
        enrollproId: `faculty-${f.teacherId}`, email: email.toLowerCase(),
        name: buildFullName(f.lastName, f.firstName, f.middleName),
        employeeId: empId,
        role: ROLE_OVERRIDES[empId] || (staffRoles && staffRoles.length ? mapRole(staffRoles) : Role.TEACHER),
        gradeLevel: f.advisorySectionGradeLevelName, sectionName: f.advisorySectionName,
        schoolYearId: f.schoolYearId || schoolYearId,
        schoolYearLabel: f.schoolYearLabel || schoolYearLabel,
        cohort: 'faculty',
      });
    }

    for (const s of staffResponses) {
      const empId = s.employeeId || `EMP-${s.id}`;
      const email = s.email || `staff-${empId}@sort.local`;
      if (facultyEmpIds.has(empId)) continue;
      syncEntries.push({
        enrollproId: `staff-${s.id}`, email: email.toLowerCase(),
        name: buildFullName(s.lastName, s.firstName, s.middleName),
        employeeId: empId, role: ROLE_OVERRIDES[empId] || mapRole(s.roles),
        schoolYearId: s.schoolYearId || schoolYearId,
        schoolYearLabel: s.schoolYearLabel || schoolYearLabel,
        cohort: 'staff',
      });
    }

    for (const entry of syncEntries) {
      if (ROLE_OVERRIDES[entry.employeeId]) {
        entry.role = ROLE_OVERRIDES[entry.employeeId];
      }
    }

    // 4. Batch upsert with per-cohort tracking
    const syncedIdsByCohort = {
      learners: new Set<string>(),
      faculty: new Set<string>(),
      staff: new Set<string>(),
    };
    const BATCH_SIZE = 50;

    for (let i = 0; i < syncEntries.length; i += BATCH_SIZE) {
      const batch = syncEntries.slice(i, i + BATCH_SIZE);

      await prisma.$transaction(async (tx) => {
        for (const entry of batch) {
          syncedIdsByCohort[entry.cohort].add(entry.enrollproId);

          const existing = await tx.user.findUnique({ where: { enrollproId: entry.enrollproId } });

          if (existing) {
            await tx.user.update({
              where: { id: existing.id },
              data: {
                name: entry.name,
                email: entry.email,
                employeeId: entry.employeeId,
                role: entry.role,
                gradeLevel: entry.gradeLevel,
                sectionName: entry.sectionName,
                academicProgram: entry.academicProgram,
                enrollproLrn: entry.enrollproLrn,
                schoolYearId: entry.schoolYearId,
                schoolYearLabel: entry.schoolYearLabel,
                portalAccountActive: entry.portalAccountActive,
                archivedAt: null,
                ...(entry.cohort === 'learners' ? { enrollmentStatus: 'ENROLLED' } : {}),
              },
            });
            cohortResults[entry.cohort].updated++;
          } else {
            const emailDup = await tx.user.findUnique({ where: { email: entry.email } });

            if (emailDup) {
              await tx.user.update({
                where: { id: emailDup.id },
                data: {
                  enrollproId: entry.enrollproId,
                  syncSource: SyncSource.ENROLLPRO,
                  email: entry.email,
                  employeeId: entry.employeeId,
                  role: entry.role,
                  gradeLevel: entry.gradeLevel,
                  sectionName: entry.sectionName,
                  academicProgram: entry.academicProgram,
                  enrollproLrn: entry.enrollproLrn,
                  schoolYearId: entry.schoolYearId,
                  schoolYearLabel: entry.schoolYearLabel,
                  portalAccountActive: entry.portalAccountActive,
                  archivedAt: null,
                  ...(entry.cohort === 'learners' ? { enrollmentStatus: 'ENROLLED' } : {}),
                },
              });
              cohortResults[entry.cohort].updated++;
            } else {
              try {
                await tx.user.create({
                  data: {
                    name: entry.name,
                    email: entry.email,
                    passwordHash: null,
                    employeeId: entry.employeeId,
                    role: entry.role,
                    syncSource: SyncSource.ENROLLPRO,
                    enrollproId: entry.enrollproId,
                    enrollproLrn: entry.enrollproLrn,
                    gradeLevel: entry.gradeLevel,
                    sectionName: entry.sectionName,
                    academicProgram: entry.academicProgram,
                    schoolYearId: entry.schoolYearId,
                    schoolYearLabel: entry.schoolYearLabel,
                    portalAccountActive: entry.portalAccountActive,
                    enrollmentStatus: entry.cohort === 'learners' ? 'ENROLLED' : undefined,
                  },
                });
                cohortResults[entry.cohort].created++;
              } catch (createErr: any) {
                if (createErr?.code === 'P2002') {
                  const empDup = await tx.user.findFirst({ where: { employeeId: entry.employeeId } });
                  if (empDup) {
                    await tx.user.update({
                      where: { id: empDup.id },
                      data: {
                        enrollproId: entry.enrollproId,
                        syncSource: SyncSource.ENROLLPRO,
                        name: entry.name,
                        email: entry.email,
                        employeeId: entry.employeeId,
                        role: entry.role,
                        gradeLevel: entry.gradeLevel,
                        sectionName: entry.sectionName,
                        academicProgram: entry.academicProgram,
                        enrollproLrn: entry.enrollproLrn,
                        schoolYearId: entry.schoolYearId,
                        schoolYearLabel: entry.schoolYearLabel,
                        portalAccountActive: entry.portalAccountActive,
                        archivedAt: null,
                        ...(entry.cohort === 'learners' ? { enrollmentStatus: 'ENROLLED' } : {}),
                      },
                    });
                    cohortResults[entry.cohort].updated++;
                  }
                } else {
                  errors.push(`create ${entry.name}: ${createErr.message}`);
                }
              }
            }
          }
        }
      }, { timeout: 30000 });
    }

    // 5. Per-cohort reconciliation — archive identities no longer present in a
    //    successfully fetched roster. NEVER delete: accounts own reports,
    //    points, offenses, and snapshots that must survive for transparency.
    const learnerRosterEmpty = cohortResults.learners.pulled === 0 && !cohortResults.learners.error;
    const localSynced = await prisma.user.findMany({
      where: { syncSource: SyncSource.ENROLLPRO, archivedAt: null },
      select: { id: true, enrollproId: true },
    });

    const cohortOf = (enrollproId: string): 'learners' | 'faculty' | 'staff' | null =>
      enrollproId.startsWith('learner-') ? 'learners'
        : enrollproId.startsWith('faculty-') ? 'faculty'
        : enrollproId.startsWith('staff-') ? 'staff'
        : null;

    const localCohortCounts = { learners: 0, faculty: 0, staff: 0 };
    for (const u of localSynced) {
      if (!u.enrollproId) continue;
      const cohort = cohortOf(u.enrollproId);
      if (cohort) localCohortCounts[cohort]++;
    }

    // Empty-roster guard: EnrollPro can answer 200 with an empty/partial payload
    // (degraded instance, wrong school-year scope). Treating that as "everyone
    // left" would mass-archive the cohort, so require an explicit override.
    for (const cohort of ['learners', 'faculty', 'staff'] as const) {
      if (reconciliationSkipped.has(cohort)) continue;
      const decision = assessRoster({
        pulled: cohortResults[cohort].pulled,
        fetchError: cohortResults[cohort].error,
        localCount: localCohortCounts[cohort],
        allowEmpty: options.allowEmpty === true,
      });
      if (!decision.reconcile) {
        const reason = decision.reason || 'roster not trusted';
        reconciliationSkipped.set(cohort, reason);
        if (!cohortResults[cohort].error) {
          errors.push(`${cohort}: ${reason}`);
          console.warn(`[Sync] ${reason}`);
        }
      }
    }

    for (const u of localSynced) {
      if (!u.enrollproId) continue;

      const cohort = cohortOf(u.enrollproId);

      if (!cohort) continue;

      // Skip a cohort whose reconciliation was withheld (empty/failed/unscoped
      // roster). No archive is ever performed without a trustworthy roster.
      if (reconciliationSkipped.has(cohort)) continue;

      // Only reconcile if this cohort was successfully fetched (no error)
      if (!cohortResults[cohort].error && !syncedIdsByCohort[cohort].has(u.enrollproId)) {
        await prisma.userSession.deleteMany({ where: { userId: u.id } }).catch(() => {});
        // When EnrollPro has rolled over but nobody is enrolled yet, learners
        // are archived as NOT_ENROLLED (awaiting enrollment) rather than ALUMNI.
        const nextStatus = cohort === 'learners'
          ? (learnerRosterEmpty ? 'NOT_ENROLLED' : 'ALUMNI')
          : undefined;
        try {
          await prisma.user.update({
            where: { id: u.id },
            data: {
              archivedAt: new Date(),
              portalAccountActive: false,
              ...(nextStatus ? { enrollmentStatus: nextStatus } : {}),
            },
          });
          cohortResults[cohort].deleted++;
        } catch (archErr: any) {
          errors.push(`archive stale ${u.enrollproId}: ${archErr.message}`);
        }
      }
    }

    // Purge leftover LOCAL-synced accounts — but NEVER one that owns data
    // (reports, points, walk-in turnovers, claims, offenses, sessions) or one
    // that is a deliberate offline walk-in demo account (OFFLINE_DEMO), which is
    // seeded precisely so the station can be demonstrated without EnrollPro.
    const localAccounts = await prisma.user.findMany({
      where: { syncSource: 'LOCAL' },
      select: {
        id: true,
        enrollmentStatus: true,
        _count: {
          select: {
            reports: true,
            assignedReports: true,
            pointHistories: true,
            offenses: true,
            sessions: true,
            certificatesIssued: true,
            walkIns: true,
            walkInsRecorded: true,
            rewardClaims: true,
            rewardReleases: true,
          },
        },
      },
    });
    const orphanLocalIds = localAccounts
      .filter((u) =>
        isPurgeableLocalAccount({
          enrollmentStatus: u.enrollmentStatus,
          activityCounts: Object.values(u._count),
        })
      )
      .map((u) => u.id);
    const localPurge = orphanLocalIds.length > 0
      ? await prisma.user.deleteMany({ where: { id: { in: orphanLocalIds } } })
      : { count: 0 };
    if (localPurge.count > 0) {
      console.log(`[Sync] Purged ${localPurge.count} orphaned LOCAL accounts (activity-free only)`);
    }

    // 6. Determine accurate status
    const totalPulled = cohortResults.learners.pulled + cohortResults.faculty.pulled + cohortResults.staff.pulled;
    const totalCreated = cohortResults.learners.created + cohortResults.faculty.created + cohortResults.staff.created;
    const totalUpdated = cohortResults.learners.updated + cohortResults.faculty.updated + cohortResults.staff.updated;
    const totalDeleted = cohortResults.learners.deleted + cohortResults.faculty.deleted + cohortResults.staff.deleted + localPurge.count;

    const failedCohorts = [
      cohortResults.learners.error,
      cohortResults.faculty.error,
      cohortResults.staff.error,
    ].filter(Boolean).length;

    let status: SyncStatus;
    if (failedCohorts === 3) {
      status = SyncStatus.FAILED;
    } else if (failedCohorts > 0) {
      status = SyncStatus.PARTIAL;
    } else if (reconciliationSkipped.size > 0) {
      // Data was pulled, but at least one cohort was deliberately not
      // reconciled. Reporting SUCCESS here would hide a degraded provider.
      status = SyncStatus.PARTIAL;
    } else {
      status = SyncStatus.SUCCESS;
    }

    const durationMs = Date.now() - start;

    const skippedSummary = reconciliationSkipped.size > 0
      ? `SKIPPED_RECONCILIATION(${[...reconciliationSkipped.keys()].join(',')})`
      : undefined;

    const message = skippedSummary
      ?? (learnerRosterEmpty
        ? `NO_STUDENTS_ENROLLED: EnrollPro SY ${schoolYearLabel ?? schoolYearId ?? '?'} has no enrolled learners yet`
        : undefined);
    if (message) console.log(`[Sync] ${message}`);

    await prisma.enrollmentSyncLog.create({
      data: {
        syncType: 'ENROLLPRO_FULL',
        status,
        recordsPulled: totalPulled,
        recordsCreated: totalCreated,
        recordsUpdated: totalUpdated,
        recordsDeleted: totalDeleted,
        errorMessage: errors.length > 0 ? errors.join('; ').slice(0, 1000) : null,
        message,
        schoolYearId,
        schoolYearLabel,
        durationMs,
      },
    });

    console.log(`[Sync] ${status} ${durationMs}ms: ${totalCreated} created, ${totalUpdated} updated, ${totalDeleted} archived (${totalPulled} pulled)`);
    return {
      recordsPulled: totalPulled, recordsCreated: totalCreated, recordsUpdated: totalUpdated,
      recordsDeleted: totalDeleted, durationMs, schoolYearId, schoolYearLabel, status, cohortResults, message,
      reconciliationSkipped: reconciliationSkipped.size > 0 ? [...reconciliationSkipped.keys()] : undefined,
    };
  } catch (error: any) {
    const durationMs = Date.now() - start;
    await prisma.enrollmentSyncLog.create({
      data: {
        syncType: 'ENROLLPRO_FULL', status: SyncStatus.FAILED,
        recordsPulled: 0, recordsCreated: 0, recordsUpdated: 0, recordsDeleted: 0,
        errorMessage: error.message?.slice(0, 1000), durationMs,
      },
    }).catch(() => {});
    console.error('[Sync] Failed:', error.message);
    return {
      recordsPulled: 0, recordsCreated: 0, recordsUpdated: 0, recordsDeleted: 0,
      durationMs, status: SyncStatus.FAILED, cohortResults, error: error.message,
    };
  }
}

// ─── Term Calendar Sync ────────────────────────────────────────────────

export async function syncTermCalendar(): Promise<{ synced: number; error?: string }> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    // Integration endpoints require X-Integration-Key, not JWT
    if (ENROLLPRO_SYNC_SECRET) {
      headers['X-Integration-Key'] = ENROLLPRO_SYNC_SECRET;
    }

    const res = await fetch(`${ENROLLPRO_BASE}/integration/v1/school-year`, { headers });
    if (!res.ok) return { synced: 0, error: `Returned ${res.status}` };

    const json = await res.json() as { data?: any };
    const sy = json.data;
    if (!sy?.id) return { synced: 0, error: 'No active school year' };

    let synced = 0;
    const now = new Date();
    const terms = [
      { start: sy.term1Start, end: sy.term1End, name: 'Term 1', code: 'T1' },
      { start: sy.term2Start, end: sy.term2End, name: 'Term 2', code: 'T2' },
      { start: sy.term3Start, end: sy.term3End, name: 'Term 3', code: 'T3' },
    ];

    // Sync to TermCalendar (EnrollPro mirror)
    for (const term of terms) {
      if (!term.start || !term.end) continue;
      const startDate = new Date(term.start);
      const endDate = new Date(term.end);
      const isActive = now >= startDate && now <= endDate;

      const existing = await prisma.termCalendar.findFirst({ where: { termCode: `${term.code}-SY${sy.id}` } });
      if (existing) {
        await prisma.termCalendar.update({ where: { id: existing.id }, data: { isActive, startDate, endDate } });
      } else {
        await prisma.termCalendar.create({
          data: {
            enrollproId: sy.id * 10 + synced,
            termName: term.name, termCode: `${term.code}-SY${sy.id}`,
            startDate, endDate,
            schoolYearId: sy.id, schoolYearLabel: sy.yearLabel || String(sy.id),
            isActive,
          },
        });
      }
      synced++;
    }

    // Also sync to AcademicQuarter (SORT's internal calendar)
    for (const term of terms) {
      if (!term.start || !term.end) continue;
      const isActive = now >= new Date(term.start) && now <= new Date(term.end);

      const existing = await prisma.academicQuarter.findFirst({ where: { quarterCode: term.code } });
      if (existing) {
        await prisma.academicQuarter.update({
          where: { id: existing.id },
          data: { startDate: term.start.slice(0, 10), endDate: term.end.slice(0, 10), isActive },
        });
      } else {
        await prisma.academicQuarter.create({
          data: {
            quarterName: term.name,
            quarterCode: term.code,
            startDate: term.start.slice(0, 10),
            endDate: term.end.slice(0, 10),
            isActive,
          },
        });
      }
    }

    return { synced };
  } catch (error: any) {
    return { synced: 0, error: error.message };
  }
}
