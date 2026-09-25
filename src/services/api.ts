import { User, Report, BinStatus, Challenge, AdminChallenge, VerifySingleResult, VerifyBatchResult, Certificate, TermStatus, IssueTermResult, AtlasMapPayload, WalkInStudentOption, WalkInTurnover, WalkInProgress, RecordWalkInInput, RecordWalkInResult, Reward, RewardClaim } from '../types';

const API_BASE_URL = (import.meta.env.VITE_API_URL as string) || '/api';

/**
 * Helper to retrieve stored Auth JWT Token from sessionStorage
 */
function getAuthToken(): string | null {
  return sessionStorage.getItem('sortv2_token');
}

/**
 * The last account that completed a login/refresh. Persisted in localStorage
 * (not sessionStorage) so the refresh token is still discoverable after a
 * browser restart — sessionStorage is wiped when the tab closes, which used to
 * strand a perfectly valid 7-day refresh token and force a fresh login.
 */
const LAST_USER_ID_KEY = 'sortv2_last_user_id';
const USER_SNAPSHOT_KEY = 'sortv2_user_snapshot';

function getStoredUserId(): string | null {
  return sessionStorage.getItem('sortv2_user_id') || localStorage.getItem(LAST_USER_ID_KEY);
}

/**
 * The last account persisted in localStorage. Exposed so callers can clear a
 * session whose access token was already wiped from sessionStorage.
 */
export function getPersistedUserId(): string | null {
  return localStorage.getItem(LAST_USER_ID_KEY);
}

/**
 * Helper to retrieve stored refresh token for the current user from localStorage
 */
function getRefreshToken(): string | null {
  const userId = getStoredUserId();
  if (!userId) return null;
  return localStorage.getItem(`sortv2_refresh_${userId}`);
}

/**
 * Store refresh token in localStorage keyed by user ID (supports multi-account)
 */
export function storeRefreshToken(userId: string, refreshToken: string): void {
  localStorage.setItem(`sortv2_refresh_${userId}`, refreshToken);
  localStorage.setItem(LAST_USER_ID_KEY, userId);
}

/**
 * Clear refresh token for a specific user
 */
export function clearRefreshToken(userId: string): void {
  localStorage.removeItem(`sortv2_refresh_${userId}`);
  if (localStorage.getItem(LAST_USER_ID_KEY) === userId) {
    localStorage.removeItem(LAST_USER_ID_KEY);
  }
}

/**
 * Cache the signed-in user's profile. Only used to keep an existing session
 * usable when the server is briefly unreachable (e.g. a browser restart during
 * an outage); it is never a substitute for server-side authorization.
 */
export function storeUserSnapshot(user: User): void {
  try {
    localStorage.setItem(USER_SNAPSHOT_KEY, JSON.stringify(user));
  } catch {
    /* storage full or unavailable — non-fatal */
  }
}

export function getUserSnapshot(): User | null {
  try {
    const raw = localStorage.getItem(USER_SNAPSHOT_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function clearUserSnapshot(): void {
  localStorage.removeItem(USER_SNAPSHOT_KEY);
}

export type SessionUser = User & { certificatesEarned?: unknown };

let isRefreshing = false;
let refreshPromise: Promise<RefreshOutcome> | null = null;

/**
 * Result of a refresh attempt.
 *
 * - `refreshed`   — new tokens issued; caller may continue.
 * - `invalid`     — the server definitively rejected the refresh token
 *                   (400/401/403). The session is dead and must be cleared.
 * - `unreachable` — transient failure (network down, 5xx, rate limit). The
 *                   session is still valid; callers must NOT log the user out.
 */
export type RefreshOutcome =
  | { status: 'refreshed'; accessToken: string; refreshToken: string; user: User }
  | { status: 'invalid' }
  | { status: 'unreachable' };

const INVALID_REFRESH_STATUSES = new Set([400, 401, 403]);

/**
 * Refresh the access token using the stored refresh token.
 * Coalesces concurrent calls into a single request.
 */
async function refreshAccessToken(): Promise<RefreshOutcome> {
  if (isRefreshing && refreshPromise) return refreshPromise;

  const refreshToken = getRefreshToken();
  if (!refreshToken) return { status: 'invalid' };

  isRefreshing = true;
  refreshPromise = (async (): Promise<RefreshOutcome> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        return INVALID_REFRESH_STATUSES.has(response.status)
          ? { status: 'invalid' }
          : { status: 'unreachable' };
      }

      const data = await response.json();
      // Store new tokens
      sessionStorage.setItem('sortv2_token', data.accessToken);
      if (data.user?.id) {
        sessionStorage.setItem('sortv2_user_id', data.user.id);
        storeRefreshToken(data.user.id, data.refreshToken);
        storeUserSnapshot(data.user);
      }
      return {
        status: 'refreshed',
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.user,
      };
    } catch {
      return { status: 'unreachable' };
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Result of a boot restore attempt.
 *
 * - `restored`    — a new token pair was issued; the user is genuinely signed in.
 * - `unreachable` — SORT could not be reached. The stored credentials may still
 *                   be valid, so the caller may keep a degraded session.
 * - `none`        — there is nothing to resume, or the server definitively
 *                   rejected the token. The caller must sign out and the cached
 *                   profile is already cleared so it cannot resurrect a UI.
 */
export type RestoreOutcome =
  | { status: 'restored'; user: User }
  | { status: 'unreachable' }
  | { status: 'none' };

function burnStoredSession(userId: string | null): void {
  if (userId) clearRefreshToken(userId);
  sessionStorage.removeItem('sortv2_token');
  sessionStorage.removeItem('sortv2_user_id');
  sessionStorage.setItem('sort_auth', 'false');
  clearUserSnapshot();
}

/**
 * Resume a session from the persisted refresh token.
 *
 * Used on boot: a browser restart clears sessionStorage (which holds the access
 * token) but not localStorage, so without this the user would have to log in
 * again — impossible while the identity provider is unreachable.
 */
async function restoreSession(): Promise<RestoreOutcome> {
  const userId = getStoredUserId();
  if (!userId) return { status: 'none' };
  if (!localStorage.getItem(`sortv2_refresh_${userId}`)) {
    // A cached profile without a credential must never keep a session alive.
    burnStoredSession(userId);
    return { status: 'none' };
  }

  sessionStorage.setItem('sortv2_user_id', userId);
  const outcome = await refreshAccessToken();

  if (outcome.status === 'refreshed') {
    return { status: 'restored', user: outcome.user };
  }

  if (outcome.status === 'unreachable') {
    sessionStorage.removeItem('sortv2_user_id');
    return { status: 'unreachable' };
  }

  burnStoredSession(userId);
  return { status: 'none' };
}

/**
 * Generic API Fetcher wrapper with automatic token refresh on 401
 */
async function fetchAPI<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  let token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // If 401, try refreshing the token once
  if (response.status === 401 && getRefreshToken()) {
    const outcome = await refreshAccessToken();
    if (outcome.status === 'refreshed') {
      headers['Authorization'] = `Bearer ${outcome.accessToken}`;
      response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const err = new Error(errorData.error || `API Request failed with status ${response.status}`);
    (err as any).code = errorData.code;
    (err as any).status = response.status;
    throw err;
  }

  return response.json();
}

export const apiService = {
  // Auth API
  login: async (identifier: string, password: string): Promise<{ token: string; refreshToken: string; user: User }> => {
    return fetchAPI('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
  },

  refreshAccessToken,

  restoreSession,

  /**
   * Public identity-provider status. No auth required, no secrets returned.
   * Lets the login screens warn that credential checks are unavailable before
   * the user types anything.
   */
  getProviderStatus: async (): Promise<{ provider: string; online: boolean; checkedAt: string }> => {
    return fetchAPI('/auth/provider-status');
  },

  logout: async (refreshToken: string): Promise<void> => {
    await fetchAPI('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  },

  getCurrentUser: async (): Promise<{ user: User }> => {
    return fetchAPI('/auth/me');
  },

  // Users API
  getUsers: async (): Promise<User[]> => {
    return fetchAPI('/users');
  },

  getLeaderboard: async (): Promise<User[]> => {
    return fetchAPI('/users/leaderboard');
  },

  // Reports API
  getReports: async (filters?: { status?: string; category?: string; reporterId?: string }): Promise<Report[]> => {
    const query = new URLSearchParams(filters as Record<string, string>).toString();
    const endpoint = query ? `/reports?${query}` : '/reports';
    return fetchAPI(endpoint);
  },

  createReport: async (reportData: Partial<Report> & { reporterEmail?: string }): Promise<Report> => {
    return fetchAPI('/reports', {
      method: 'POST',
      body: JSON.stringify(reportData),
    });
  },

  updateReportStatus: async (
    id: string,
    updates: { status?: string; assignedMrfId?: string; assignedMrfName?: string; weightCollected?: number }
  ): Promise<Report> => {
    return fetchAPI(`/reports/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  verifyReport: async (reportId: string): Promise<VerifySingleResult> => {
    return fetchAPI(`/reports/${reportId}/verify`, {
      method: 'POST',
    });
  },

  verifyReportsBatch: async (
    reportIds: string[]
  ): Promise<VerifyBatchResult> => {
    return fetchAPI('/reports/verify-batch', {
      method: 'POST',
      body: JSON.stringify({ reportIds }),
    });
  },

  // Waste Bins API
  getBins: async (): Promise<BinStatus[]> => {
    return fetchAPI('/bins');
  },

  updateBin: async (id: string, updates: Partial<BinStatus>): Promise<BinStatus> => {
    return fetchAPI(`/bins/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  // Admin Purge API
  purgeDatabase: async (): Promise<{ message: string }> => {
    return fetchAPI('/reports/purge', {
      method: 'DELETE',
    });
  },

  // Settings & Presets System Sync API
  getSettings: async (): Promise<any> => {
    return fetchAPI('/settings');
  },

  // Public tenant branding (no auth) — also consumed by the ThemeProvider.
  getPublicSettings: async (): Promise<{ settings: Record<string, any> }> => {
    return fetchAPI('/settings/public');
  },

  // Pull branding from EnrollPro (admin). Server-side sync; never called from
  // the browser against EnrollPro directly.
  pullEnrollProBranding: async (): Promise<{
    status: 'synced' | 'failed';
    colors: { primary: string; secondary: string; accent: string };
    logoUpdated: boolean;
    branding: Record<string, any> | null;
    error?: string;
  }> => {
    return fetchAPI('/settings/branding/pull', { method: 'POST', body: JSON.stringify({}) });
  },

  updateSettings: async (settingsData: Record<string, any>): Promise<any> => {
    return fetchAPI('/settings', {
      method: 'PATCH',
      body: JSON.stringify(settingsData),
    });
  },

  getPresetGroups: async (): Promise<any[]> => {
    return fetchAPI('/settings/preset-groups');
  },

  addPresetItem: async (categoryName: string, name: string): Promise<any> => {
    return fetchAPI('/settings/preset-groups/items', {
      method: 'POST',
      body: JSON.stringify({ categoryName, name }),
    });
  },

  updatePresetItem: async (id: string, updates: { enabled?: boolean; name?: string }): Promise<any> => {
    return fetchAPI(`/settings/preset-groups/items/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  deletePresetItem: async (id: string): Promise<any> => {
    return fetchAPI(`/settings/preset-groups/items/${id}`, {
      method: 'DELETE',
    });
  },

  getCampusLocations: async (): Promise<any[]> => {
    return fetchAPI('/settings/campus-locations');
  },

  saveCampusLocations: async (locations: any[]): Promise<any[]> => {
    return fetchAPI('/settings/campus-locations', {
      method: 'POST',
      body: JSON.stringify({ locations }),
    });
  },

  getRoomLocations: async (): Promise<string[]> => {
    return fetchAPI('/settings/room-locations');
  },

  getWasteTypes: async (): Promise<any[]> => {
    return fetchAPI('/settings/waste-types');
  },

  getUrgencyLevels: async (): Promise<any[]> => {
    return fetchAPI('/settings/urgency-levels');
  },

  getAssetConditions: async (): Promise<any[]> => {
    return fetchAPI('/settings/asset-conditions');
  },

  getPointRules: async (): Promise<any[]> => {
    return fetchAPI('/settings/point-rules');
  },

  getAcademicQuarters: async (): Promise<any[]> => {
    return fetchAPI('/settings/academic-quarters');
  },

  updateAcademicQuarter: async (id: string, updates: { startDate?: string; endDate?: string; isActive?: boolean }): Promise<any> => {
    return fetchAPI(`/settings/academic-quarters/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  syncAcademicTerms: async (): Promise<any> => {
    return fetchAPI('/sync/terms', { method: 'POST' });
  },

  getSyncStatus: async (): Promise<any> => {
    return fetchAPI('/sync/status');
  },

  // Audit Logs
  getAuditLogs: async (limit?: number): Promise<any[]> => {
    return fetchAPI(`/settings/audit-logs${limit ? `?limit=${limit}` : ''}`);
  },

  createAuditLog: async (log: { actorName: string; actorRole: string; actionType: string; details: string }): Promise<any> => {
    return fetchAPI('/settings/audit-logs', {
      method: 'POST',
      body: JSON.stringify(log),
    });
  },

  // Campus News
  getCampusNews: async (): Promise<any[]> => {
    return fetchAPI('/settings/campus-news');
  },

  createCampusNews: async (news: { title: string; body: string; tag: string; tagColor: string; iconColor: string }): Promise<any> => {
    return fetchAPI('/settings/campus-news', {
      method: 'POST',
      body: JSON.stringify(news),
    });
  },

  updateCampusNews: async (id: string, updates: { title?: string; body?: string; tag?: string; tagColor?: string; iconColor?: string; isPublished?: boolean }): Promise<any> => {
    return fetchAPI(`/settings/campus-news/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  deleteCampusNews: async (id: string): Promise<any> => {
    return fetchAPI(`/settings/campus-news/${id}`, {
      method: 'DELETE',
    });
  },

  getAssetCategories: async (): Promise<any[]> => {
    return fetchAPI('/settings/asset-categories');
  },

  createAssetCategory: async (categoryData: { name: string; code?: string }): Promise<any> => {
    return fetchAPI('/settings/asset-categories', {
      method: 'POST',
      body: JSON.stringify(categoryData),
    });
  },

  updateAssetCategory: async (id: string, updates: { name?: string; code?: string; enabled?: boolean }): Promise<any> => {
    return fetchAPI(`/settings/asset-categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  deleteAssetCategory: async (id: string): Promise<any> => {
    return fetchAPI(`/settings/asset-categories/${id}`, {
      method: 'DELETE',
    });
  },

  createWasteType: async (wasteData: { name: string; code?: string; description?: string; hexColor?: string }): Promise<any> => {
    return fetchAPI('/settings/waste-types', {
      method: 'POST',
      body: JSON.stringify(wasteData),
    });
  },

  updateWasteType: async (id: string, updates: { name?: string; description?: string; hexColor?: string; enabled?: boolean }): Promise<any> => {
    return fetchAPI(`/settings/waste-types/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  deleteWasteType: async (id: string): Promise<any> => {
    return fetchAPI(`/settings/waste-types/${id}`, {
      method: 'DELETE',
    });
  },

  createUrgencyLevel: async (urgencyData: { level: string; code?: string; slaHours?: number; description?: string; badgeStyle?: string }): Promise<any> => {
    return fetchAPI('/settings/urgency-levels', {
      method: 'POST',
      body: JSON.stringify(urgencyData),
    });
  },

  updateUrgencyLevel: async (id: string, updates: { level?: string; slaHours?: number; description?: string; badgeStyle?: string; enabled?: boolean }): Promise<any> => {
    return fetchAPI(`/settings/urgency-levels/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  deleteUrgencyLevel: async (id: string): Promise<any> => {
    return fetchAPI(`/settings/urgency-levels/${id}`, {
      method: 'DELETE',
    });
  },

  createAssetCondition: async (conditionData: { name: string; code?: string; description?: string; badgeStyle?: string }): Promise<any> => {
    return fetchAPI('/settings/asset-conditions', {
      method: 'POST',
      body: JSON.stringify(conditionData),
    });
  },

  updateAssetCondition: async (id: string, updates: { name?: string; description?: string; badgeStyle?: string; enabled?: boolean }): Promise<any> => {
    return fetchAPI(`/settings/asset-conditions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  deleteAssetCondition: async (id: string): Promise<any> => {
    return fetchAPI(`/settings/asset-conditions/${id}`, {
      method: 'DELETE',
    });
  },

  updatePointRule: async (id: string, updates: { pointsAwarded?: number; title?: string; description?: string }): Promise<any> => {
    return fetchAPI(`/settings/point-rules/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  // Recyclables Market Endpoints
  getMarketStocks: async (): Promise<any[]> => {
    return fetchAPI('/market/stocks');
  },

  updateMarketStock: async (code: string, updates: { thresholdLimitKg?: number; marketPricePerKg?: number; addKg?: number; setAccumulatedKg?: number }): Promise<any> => {
    return fetchAPI(`/market/stocks/${code}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  approveMarketSale: async (params: { categoryCode: string; isApproved?: boolean }): Promise<any> => {
    return fetchAPI('/market/approve-sale', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  sellMarketBatch: async (params: { categoryCode: string; buyerName?: string }): Promise<any> => {
    return fetchAPI('/market/sell-batch', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  getMarketSales: async (schoolYearId?: string): Promise<any[]> => {
    const query = schoolYearId ? `?schoolYearId=${schoolYearId}` : '';
    return fetchAPI(`/market/sales${query}`);
  },

  // School Year Endpoints
  getSchoolYears: async (): Promise<any[]> => {
    return fetchAPI('/school-years');
  },

  getActiveSchoolYear: async (): Promise<any> => {
    return fetchAPI('/school-years/active');
  },

  getSchoolYearDetails: async (id: string): Promise<any> => {
    return fetchAPI(`/school-years/${id}`);
  },

  getSchoolYearLedger: async (id: string): Promise<any> => {
    return fetchAPI(`/school-years/${id}/ledger`);
  },

  createSchoolYear: async (data: { label: string; startDate: string; endDate: string; enrollproId?: number }): Promise<any> => {
    return fetchAPI('/school-years', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateSchoolYear: async (id: string, data: { label?: string; startDate?: string; endDate?: string }): Promise<any> => {
    return fetchAPI(`/school-years/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  activateSchoolYear: async (id: string): Promise<any> => {
    return fetchAPI(`/school-years/${id}/activate`, {
      method: 'POST',
    });
  },

  // Mirror every EnrollPro school year (import only; never activates/rolls over)
  importSchoolYears: async (): Promise<any> => {
    return fetchAPI('/sync/school-years', {
      method: 'POST',
    });
  },

  // MRF Asset Ledger API
  getAssetRecords: async (filters?: { action?: string; schoolYearId?: string; q?: string }): Promise<any[]> => {
    const query = filters ? new URLSearchParams(filters as Record<string, string>).toString() : '';
    return fetchAPI(`/assets${query ? `?${query}` : ''}`);
  },

  getAssetSummary: async (schoolYearId?: string): Promise<any> => {
    const query = schoolYearId ? `?schoolYearId=${schoolYearId}` : '';
    return fetchAPI(`/assets/summary${query}`);
  },

  createAssetRecord: async (data: {
    assetName: string;
    category: string;
    action: string;
    disposition?: string;
    quantity?: number;
    unit?: string;
    condition?: string;
    sourceReportId?: string;
    locationName?: string;
    notes?: string;
  }): Promise<any> => {
    return fetchAPI('/assets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Asset Scrap Recovery Stock API
  getAssetScrapStocks: async (): Promise<any[]> => {
    return fetchAPI('/asset-scrap/stocks');
  },

  updateAssetScrapStock: async (
    materialCode: string,
    data: { addKg?: number; setAccumulatedKg?: number; thresholdLimitKg?: number; marketPricePerKg?: number }
  ): Promise<any> => {
    return fetchAPI(`/asset-scrap/stocks/${materialCode}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  approveAssetScrapSale: async (data: { materialCode: string; isApproved?: boolean; approvalReference?: string }): Promise<any> => {
    return fetchAPI('/asset-scrap/approve-sale', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  sellAssetScrapBatch: async (data: { materialCode: string; buyerName?: string; approvalReference?: string }): Promise<any> => {
    return fetchAPI('/asset-scrap/sell-batch', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getAssetScrapSales: async (schoolYearId?: string): Promise<any[]> => {
    const query = schoolYearId ? `?schoolYearId=${schoolYearId}` : '';
    return fetchAPI(`/asset-scrap/sales${query}`);
  },

  // Asset Scrap Items (per-batch records, incl. unweighed)
  getAssetScrapItems: async (params?: { status?: string; materialCode?: string; sourceAssetId?: string; sourceReportId?: string; schoolYearId?: string }): Promise<any[]> => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.materialCode) query.set('materialCode', params.materialCode);
    if (params?.sourceAssetId) query.set('sourceAssetId', params.sourceAssetId);
    if (params?.sourceReportId) query.set('sourceReportId', params.sourceReportId);
    if (params?.schoolYearId) query.set('schoolYearId', params.schoolYearId);
    const qs = query.toString();
    return fetchAPI(`/asset-scrap/items${qs ? `?${qs}` : ''}`);
  },

  createAssetScrapItem: async (data: {
    materialCode: string;
    weightKg?: number;
    status?: 'AWAITING_WEIGHT' | 'IN_STOCK';
    description?: string;
    sourceAssetId?: string;
    sourceReportId?: string;
  }): Promise<any> => {
    return fetchAPI('/asset-scrap/items', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  weighAssetScrapItem: async (id: string, weightKg: number): Promise<any> => {
    return fetchAPI(`/asset-scrap/items/${id}/weigh`, {
      method: 'PATCH',
      body: JSON.stringify({ weightKg }),
    });
  },

  disposeAssetScrapItem: async (id: string, disposalReference?: string): Promise<any> => {
    return fetchAPI(`/asset-scrap/items/${id}/dispose`, {
      method: 'PATCH',
      body: JSON.stringify({ disposalReference }),
    });
  },

  // Challenges API
  getChallenges: async (): Promise<Challenge[]> => {
    return fetchAPI('/challenges');
  },

  getAdminChallenges: async (): Promise<AdminChallenge[]> => {
    return fetchAPI('/challenges/admin');
  },

  createChallenge: async (data: {
    title: string;
    code: string;
    challengeType: string;
    target: number;
    pointsAwarded?: number;
    iconName?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
  }): Promise<Challenge> => {
    return fetchAPI('/challenges', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateChallenge: async (id: string, data: Record<string, any>): Promise<Challenge> => {
    return fetchAPI(`/challenges/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  deleteChallenge: async (id: string): Promise<{ message: string }> => {
    return fetchAPI(`/challenges/${id}`, {
      method: 'DELETE',
    });
  },

  // Certificates API
  claimCertificate: async (userId: string, certificateName: string): Promise<{ message: string; user: User }> => {
    return fetchAPI(`/users/${userId}/claim-certificate`, {
      method: 'POST',
      body: JSON.stringify({ certificateName }),
    });
  },

  claimCertificatesBatch: async (certificateName: string): Promise<{
    message: string;
    certificateName: string;
    threshold: number;
    awarded: { id: string; name: string; points: number }[];
    alreadyHad: { id: string; name: string }[];
    summary: { totalQualified: number; newlyAwarded: number; alreadyClaimed: number };
  }> => {
    return fetchAPI('/users/claim-certificates-batch', {
      method: 'POST',
      body: JSON.stringify({ certificateName }),
    });
  },

  downloadCertificate: async (userId: string, certificateName: string): Promise<void> => {
    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const encodedCertName = encodeURIComponent(certificateName);
    const response = await fetch(`${API_BASE_URL}/users/${userId}/certificate/${encodedCertName}/download`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Download failed with status ${response.status}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const baseName = certificateName.replace(/[^a-zA-Z0-9]/g, '_');
    a.download = baseName.toLowerCase().endsWith('certificate')
      ? `${baseName}.pdf`
      : `${baseName}_Certificate.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  viewCertificate: async (userId: string, certificateName: string): Promise<void> => {
    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const encodedCertName = encodeURIComponent(certificateName);
    const response = await fetch(`${API_BASE_URL}/users/${userId}/certificate/${encodedCertName}/view`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `View failed with status ${response.status}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => window.URL.revokeObjectURL(url), 10000);
  },

  // ─── Certificate Issuance API ───────────────────────────────────────
  getUserCertificates: async (userId: string): Promise<Certificate[]> => {
    return fetchAPI(`/certificates?userId=${encodeURIComponent(userId)}`);
  },

  getTermStatus: async (quarterCode?: string): Promise<TermStatus> => {
    const query = quarterCode ? `?quarterCode=${encodeURIComponent(quarterCode)}` : '';
    return fetchAPI(`/certificates/term-status${query}`);
  },

  claimMilestoneCertificate: async (userId: string): Promise<{
    message: string;
    alreadyClaimed: boolean;
    certificate: Certificate;
  }> => {
    return fetchAPI('/certificates/claim-milestone', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  },

  issueTermCertificates: async (opts?: { quarterCode?: string; force?: boolean }): Promise<IssueTermResult> => {
    return fetchAPI('/certificates/issue-term', {
      method: 'POST',
      body: JSON.stringify(opts || {}),
    });
  },

  getCertificateHistory: async (limit = 50): Promise<Certificate[]> => {
    return fetchAPI(`/certificates/history?limit=${limit}`);
  },

  downloadCertificateById: async (certificateId: string, fileName?: string): Promise<void> => {
    await fetchCertificateBlob(certificateId, 'download', fileName);
  },

  viewCertificateById: async (certificateId: string): Promise<void> => {
    await fetchCertificateBlob(certificateId, 'view');
  },

  // ATLAS Campus Map (read-only mirror)
  getAtlasMap: async (): Promise<AtlasMapPayload> => {
    return fetchAPI<AtlasMapPayload>('/atlas/map');
  },

  getAtlasStatus: async (): Promise<any> => {
    return fetchAPI('/atlas/status');
  },

  triggerAtlasSync: async (): Promise<any> => {
    return fetchAPI('/atlas/sync', { method: 'POST', body: JSON.stringify({}) });
  },

  // ─── Walk-in Bottle Turnover API ────────────────────────────────────
  searchWalkInStudents: async (query: string): Promise<{ students: WalkInStudentOption[] }> => {
    return fetchAPI(`/walk-ins/students?q=${encodeURIComponent(query)}`);
  },

  recordWalkIn: async (input: RecordWalkInInput): Promise<RecordWalkInResult> => {
    return fetchAPI('/walk-ins', { method: 'POST', body: JSON.stringify(input) });
  },

  getWalkIns: async (params?: { date?: string; studentId?: string; limit?: number }): Promise<{ turnovers: WalkInTurnover[] }> => {
    const query = new URLSearchParams();
    if (params?.date) query.set('date', params.date);
    if (params?.studentId) query.set('studentId', params.studentId);
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    return fetchAPI(`/walk-ins${qs ? `?${qs}` : ''}`);
  },

  getMyWalkIns: async (limit = 20): Promise<{ turnovers: WalkInTurnover[]; progress: WalkInProgress | null }> => {
    return fetchAPI(`/walk-ins/me?limit=${limit}`);
  },

  getWalkInProgress: async (studentId: string): Promise<{ progress: WalkInProgress }> => {
    return fetchAPI(`/walk-ins/progress/${encodeURIComponent(studentId)}`);
  },

  // ─── Rewards & Prize Claims API ─────────────────────────────────────
  getRewards: async (): Promise<{ schoolYearId: string | null; yearGrams: number; rewards: Reward[] }> => {
    return fetchAPI('/rewards');
  },

  requestRewardClaim: async (claimId: string): Promise<{ success: boolean; claim: RewardClaim }> => {
    return fetchAPI(`/rewards/claims/${claimId}/request`, { method: 'POST', body: JSON.stringify({}) });
  },

  getRewardClaims: async (status?: string): Promise<{ claims: RewardClaim[] }> => {
    const qs = status ? `?status=${encodeURIComponent(status)}` : '';
    return fetchAPI(`/rewards/claims${qs}`);
  },

  releaseRewardClaim: async (claimId: string): Promise<{ success: boolean; claim: RewardClaim; pointsAwarded: number }> => {
    return fetchAPI(`/rewards/claims/${claimId}/release`, { method: 'POST', body: JSON.stringify({}) });
  },

  cancelRewardClaim: async (claimId: string, reason?: string): Promise<{ success: boolean; claim: RewardClaim }> => {
    return fetchAPI(`/rewards/claims/${claimId}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) });
  },

  getRewardCatalog: async (): Promise<{ rewards: Reward[] }> => {
    return fetchAPI('/rewards/admin');
  },

  updateReward: async (id: string, updates: Partial<Reward>): Promise<{ success: boolean; reward: Reward }> => {
    return fetchAPI(`/rewards/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
  },
};

/**
 * Fetch the protected campus image as a blob object URL.
 * Returns null when ATLAS/SORT has no image (404) so callers render a fallback.
 * The caller owns the object URL and must revoke it on cleanup.
 */
export async function fetchAtlasCampusImageObjectUrl(): Promise<string | null> {
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/atlas/campus-image`, { headers });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Campus image request failed with status ${response.status}`);

  const blob = await response.blob();
  if (!blob.type.startsWith('image/')) return null;
  return window.URL.createObjectURL(blob);
}

async function fetchCertificateBlob(
  certificateId: string,
  mode: 'download' | 'view',
  fileName?: string
): Promise<void> {
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/certificates/${certificateId}/${mode}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Request failed with status ${response.status}`);
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);

  if (mode === 'view') {
    window.open(url, '_blank');
    setTimeout(() => window.URL.revokeObjectURL(url), 10000);
    return;
  }

  const a = document.createElement('a');
  a.href = url;
  a.download = fileName || `certificate-${certificateId}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}


