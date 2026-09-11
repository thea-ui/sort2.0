import { PrismaClient, SyncStatus, SyncSource, Role } from '@prisma/client';
import { ensureSchoolYear } from './rollover.service.js';

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
}

export async function runEnrollProSync(): Promise<SyncResult> {
  const start = Date.now();
  const errors: string[] = [];

  const cohortResults = {
    learners: { pulled: 0, created: 0, updated: 0, deleted: 0 } as CohortResult,
    faculty: { pulled: 0, created: 0, updated: 0, deleted: 0 } as CohortResult,
    staff: { pulled: 0, created: 0, updated: 0, deleted: 0 } as CohortResult,
  };

  try {
    // 1. Get school year context
    const syHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
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

    for (const f of facultyResponses) {
      const empId = f.employeeId || `EMP-${f.teacherId}`;
      const email = f.email || `faculty-${empId}@sort.local`;
      syncEntries.push({
        enrollproId: `faculty-${f.teacherId}`, email: email.toLowerCase(),
        name: buildFullName(f.lastName, f.firstName, f.middleName),
        employeeId: empId, role: ROLE_OVERRIDES[empId] || Role.TEACHER,
        gradeLevel: f.advisorySectionGradeLevelName, sectionName: f.advisorySectionName,
        schoolYearId: f.schoolYearId || schoolYearId,
        schoolYearLabel: f.schoolYearLabel || schoolYearLabel,
        cohort: 'faculty',
      });
    }

    const facultyEmpIds = new Set(facultyResponses.map(f => f.employeeId).filter(Boolean));
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

    for (const u of localSynced) {
      if (!u.enrollproId) continue;

      const cohort = u.enrollproId.startsWith('learner-') ? 'learners'
        : u.enrollproId.startsWith('faculty-') ? 'faculty'
        : u.enrollproId.startsWith('staff-') ? 'staff'
        : null;

      if (!cohort) continue;

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

    // Purge any leftover LOCAL-synced accounts
    const localPurge = await prisma.user.deleteMany({ where: { syncSource: 'LOCAL' } });
    if (localPurge.count > 0) {
      console.log(`[Sync] Purged ${localPurge.count} orphaned LOCAL accounts`);
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
    } else {
      status = SyncStatus.SUCCESS;
    }

    const durationMs = Date.now() - start;

    const message = learnerRosterEmpty
      ? `NO_STUDENTS_ENROLLED: EnrollPro SY ${schoolYearLabel ?? schoolYearId ?? '?'} has no enrolled learners yet`
      : undefined;
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
