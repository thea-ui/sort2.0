import { PrismaClient, SyncStatus, SyncSource, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { ensureSchoolYear } from './rollover.service.js';

const prisma = new PrismaClient();

const ENROLLPRO_BASE = process.env.ENROLLPRO_BASE_URL || 'https://dev-jegs.buru-degree.ts.net/api';
const ENROLLPRO_SYNC_SECRET = process.env.ENROLLPRO_SYNC_SECRET || '';
const ENROLLPRO_ACCOUNT = process.env.ENROLLPRO_ACCOUNT || '';
const ENROLLPRO_PASSWORD = process.env.ENROLLPRO_PASSWORD || '';
const ENROLLPRO_DEFAULT_PASSWORD = process.env.ENROLLPRO_DEFAULT_PASSWORD || 'DepEd2026!';

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
  return Role.ADMIN;
}

function generateTempPassword(identifier: string): string {
  const clean = identifier.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `sort-${clean}`.slice(0, 20);
}

// ─── EnrollPro JWT Auth ────────────────────────────────────────────────

let cachedEnrollProToken: string | null = null;
let tokenExpiryMs = 0;

async function getEnrollProToken(): Promise<string | null> {
  if (cachedEnrollProToken && Date.now() < tokenExpiryMs - 60_000) {
    return cachedEnrollProToken;
  }

  if (!ENROLLPRO_ACCOUNT || !ENROLLPRO_PASSWORD) {
    return null;
  }

  try {
    const res = await fetch(`${ENROLLPRO_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountName: ENROLLPRO_ACCOUNT, password: ENROLLPRO_PASSWORD }),
    });

    if (!res.ok) return null;

    const data = await res.json() as { token?: string; accessToken?: string };
    cachedEnrollProToken = data.token || data.accessToken || null;
    tokenExpiryMs = Date.now() + 3_600_000;
    return cachedEnrollProToken;
  } catch {
    return null;
  }
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
  if (schoolYearId) {
    baseHeaders['x-school-year-context-id'] = String(schoolYearId);
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

// ─── Core Sync Logic ───────────────────────────────────────────────────

interface SyncResult {
  recordsPulled: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsDeleted: number;
  durationMs: number;
  schoolYearId?: number;
  schoolYearLabel?: string;
  error?: string;
}

export async function runEnrollProSync(): Promise<SyncResult> {
  const start = Date.now();
  let recordsCreated = 0;
  let recordsUpdated = 0;
  let recordsDeleted = 0;
  const errors: string[] = [];

  try {
    // 1. Get school year context
    const syHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
    // Integration endpoints require X-Integration-Key, not JWT
    if (ENROLLPRO_SYNC_SECRET) {
      syHeaders['X-Integration-Key'] = ENROLLPRO_SYNC_SECRET;
    }

    const schoolYearRes = await fetch(`${ENROLLPRO_BASE}/integration/v1/school-year`, { headers: syHeaders });
    let schoolYearId: number | undefined;
    let schoolYearLabel: string | undefined;

    if (schoolYearRes.ok) {
      const syData = await schoolYearRes.json() as { data?: { id: number; yearLabel: string; term1Start?: string; term1End?: string } };
      schoolYearId = syData.data?.id;
      schoolYearLabel = syData.data?.yearLabel;

      // Auto-detect school year change and trigger rollover if needed
      if (schoolYearId && schoolYearLabel) {
        try {
          const syStartDate = syData.data?.term1Start ? new Date(syData.data.term1Start) : undefined;
          const syEndDate = syData.data?.term1End ? new Date(syData.data.term1End) : undefined;
          const { rolloverTriggered } = await ensureSchoolYear(schoolYearId, schoolYearLabel, syStartDate, syEndDate);
          if (rolloverTriggered) {
            console.log(`[Sync] School year rollover triggered: transitioned to "${schoolYearLabel}"`);
          }
        } catch (rolloverErr: any) {
          console.error('[Sync] School year rollover error:', rolloverErr.message);
          errors.push(`rollover: ${rolloverErr.message}`);
        }
      }
    }

    // 2. Fetch all data in parallel
    const [learnerResponses, facultyResponses, staffResponses] = await Promise.all([
      fetchAllPages<EnrollProLearnerResponse>('/integration/v1/learners', schoolYearId).catch((e) => {
        errors.push(`learners: ${e.message}`);
        return [] as EnrollProLearnerResponse[];
      }),
      fetchAllPages<EnrollProFacultyResponse>('/integration/v1/faculty', schoolYearId).catch((e) => {
        errors.push(`faculty: ${e.message}`);
        return [] as EnrollProFacultyResponse[];
      }),
      fetchAllPages<EnrollProStaffResponse>('/integration/v1/staff').catch((e) => {
        errors.push(`staff: ${e.message}`);
        return [] as EnrollProStaffResponse[];
      }),
    ]);

    const totalPulled = learnerResponses.length + facultyResponses.length + staffResponses.length;

    // 3. Build sync entries
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
    };

    const syncEntries: SyncEntry[] = [];

    // Learners → STUDENT role
    for (const lr of learnerResponses) {
      const learner = lr.learner;
      if (!learner) continue;

      const extId = String(learner.externalId || learner.id);
      const lrn = learner.lrn || undefined;
      const email = lrn ? `${lrn}@sort.local` : `learner-${extId}@sort.local`;

      syncEntries.push({
        enrollproId: `learner-${extId}`,
        email: email.toLowerCase(),
        name: buildFullName(learner.lastName, learner.firstName, learner.middleName),
        employeeId: lrn || `LRN-${extId}`,
        role: Role.STUDENT,
        gradeLevel: lr.gradeLevel?.name,
        sectionName: lr.section?.name,
        academicProgram: lr.section?.programType,
        enrollproLrn: lrn,
        schoolYearId: lr.schoolYear?.id || schoolYearId,
        schoolYearLabel: lr.schoolYear?.yearLabel || schoolYearLabel,
      });
    }

    // Faculty → TEACHER role (sync all faculty from EnrollPro)
    for (const f of facultyResponses) {
      const empId = f.employeeId || `EMP-${f.teacherId}`;
      const email = f.email || `faculty-${empId}@sort.local`;

      syncEntries.push({
        enrollproId: `faculty-${f.teacherId}`,
        email: email.toLowerCase(),
        name: buildFullName(f.lastName, f.firstName, f.middleName),
        employeeId: empId,
        role: ROLE_OVERRIDES[empId] || Role.TEACHER,
        gradeLevel: f.advisorySectionGradeLevelName,
        sectionName: f.advisorySectionName,
        schoolYearId: f.schoolYearId || schoolYearId,
        schoolYearLabel: f.schoolYearLabel || schoolYearLabel,
      });
    }

    // Staff → ADMIN or TEACHER based on roles
    // Skip staff entries whose employeeId already exists as a faculty member
    const facultyEmpIds = new Set(facultyResponses.map(f => f.employeeId).filter(Boolean));
    for (const s of staffResponses) {
      const empId = s.employeeId || `EMP-${s.id}`;
      const email = s.email || `staff-${empId}@sort.local`;

      // Skip if this staff member is already in the faculty list (duplicate entry from EnrollPro)
      if (facultyEmpIds.has(empId)) continue;

      syncEntries.push({
        enrollproId: `staff-${s.id}`,
        email: email.toLowerCase(),
        name: buildFullName(s.lastName, s.firstName, s.middleName),
        employeeId: empId,
        role: ROLE_OVERRIDES[empId] || mapRole(s.roles),
        schoolYearId: s.schoolYearId || schoolYearId,
        schoolYearLabel: s.schoolYearLabel || schoolYearLabel,
      });
    }

    // Apply role overrides to ALL entries (faculty included)
    for (const entry of syncEntries) {
      if (ROLE_OVERRIDES[entry.employeeId]) {
        entry.role = ROLE_OVERRIDES[entry.employeeId];
      }
    }

    // 4. Batch upsert + delete in transaction (with extended timeout)
    const syncedIds = new Set<string>();
    const BATCH_SIZE = 50;

    for (let i = 0; i < syncEntries.length; i += BATCH_SIZE) {
      const batch = syncEntries.slice(i, i + BATCH_SIZE);

      await prisma.$transaction(async (tx) => {
        for (const entry of batch) {
          syncedIds.add(entry.enrollproId);

          const existing = await tx.user.findUnique({ where: { enrollproId: entry.enrollproId } });

          if (existing) {
            await tx.user.update({
              where: { id: existing.id },
              data: {
                name: entry.name,
                role: entry.role,
                gradeLevel: entry.gradeLevel,
                sectionName: entry.sectionName,
                academicProgram: entry.academicProgram,
                enrollproLrn: entry.enrollproLrn,
                schoolYearId: entry.schoolYearId,
                schoolYearLabel: entry.schoolYearLabel,
              },
            });
            recordsUpdated++;
          } else {
            const emailDup = await tx.user.findUnique({ where: { email: entry.email } });

            if (emailDup) {
              await tx.user.update({
                where: { id: emailDup.id },
                data: {
                  enrollproId: entry.enrollproId,
                  syncSource: SyncSource.ENROLLPRO,
                  role: entry.role,
                  gradeLevel: entry.gradeLevel,
                  sectionName: entry.sectionName,
                  academicProgram: entry.academicProgram,
                  enrollproLrn: entry.enrollproLrn,
                  schoolYearId: entry.schoolYearId,
                  schoolYearLabel: entry.schoolYearLabel,
                },
              });
              recordsUpdated++;
            } else {
              const passwordHash = await bcrypt.hash(ENROLLPRO_DEFAULT_PASSWORD, 10);

              try {
                await tx.user.create({
                  data: {
                    name: entry.name,
                    email: entry.email,
                    passwordHash,
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
                  },
                });
                recordsCreated++;
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
                        role: entry.role,
                        gradeLevel: entry.gradeLevel,
                        sectionName: entry.sectionName,
                        academicProgram: entry.academicProgram,
                        enrollproLrn: entry.enrollproLrn,
                        schoolYearId: entry.schoolYearId,
                        schoolYearLabel: entry.schoolYearLabel,
                      },
                    });
                    recordsUpdated++;
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

    // Safety guard: only delete stale users if we actually fetched data
    // If totalPulled is 0, it means auth failed or API is down — don't wipe existing users
    if (totalPulled > 0) {
      // Delete EnrollPro-synced users no longer in EnrollPro
      const localSynced = await prisma.user.findMany({
        where: { syncSource: SyncSource.ENROLLPRO },
        select: { id: true, enrollproId: true },
      });

      for (const u of localSynced) {
        if (u.enrollproId && !syncedIds.has(u.enrollproId)) {
          await prisma.userSession.deleteMany({ where: { userId: u.id } }).catch(() => {});
          try {
            await prisma.user.delete({ where: { id: u.id } });
            recordsDeleted++;
          } catch (delErr: any) {
            errors.push(`delete stale ${u.enrollproId}: ${delErr.message}`);
          }
        }
      }
    } else {
      console.log('[Sync] Skipping stale user deletion — 0 records fetched (possible auth/API issue)');
    }

    // Purge any leftover LOCAL-synced accounts that predate the EnrollPro-only policy
    const localPurge = await prisma.user.deleteMany({
      where: { syncSource: 'LOCAL' },
    });
    if (localPurge.count > 0) {
      recordsDeleted += localPurge.count;
      console.log(`[Sync] Purged ${localPurge.count} orphaned LOCAL accounts`);
    }

    const durationMs = Date.now() - start;

    await prisma.enrollmentSyncLog.create({
      data: {
        syncType: 'ENROLLPRO_FULL',
        status: errors.length > 0 && recordsCreated === 0 && recordsUpdated === 0 ? SyncStatus.FAILED : SyncStatus.SUCCESS,
        recordsPulled: totalPulled,
        recordsCreated,
        recordsUpdated,
        recordsDeleted,
        errorMessage: errors.length > 0 ? errors.join('; ').slice(0, 1000) : null,
        schoolYearId,
        schoolYearLabel,
        durationMs,
      },
    });

    console.log(`[Sync] ${durationMs}ms: ${recordsCreated} created, ${recordsUpdated} updated, ${recordsDeleted} deleted (${totalPulled} pulled)`);
    return { recordsPulled: totalPulled, recordsCreated, recordsUpdated, recordsDeleted, durationMs, schoolYearId, schoolYearLabel };
  } catch (error: any) {
    const durationMs = Date.now() - start;
    await prisma.enrollmentSyncLog.create({
      data: {
        syncType: 'ENROLLPRO_FULL', status: SyncStatus.FAILED,
        recordsPulled: 0, recordsCreated, recordsUpdated, recordsDeleted,
        errorMessage: error.message?.slice(0, 1000), durationMs,
      },
    }).catch(() => {});
    console.error('[Sync] Failed:', error.message);
    return { recordsPulled: 0, recordsCreated, recordsUpdated, recordsDeleted, durationMs, error: error.message };
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
