import { User, Report, BinStatus, Challenge, AdminChallenge, VerifySingleResult, VerifyBatchResult, Certificate, TermStatus, IssueTermResult } from '../types';

const API_BASE_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:5000/api';

/**
 * Helper to retrieve stored Auth JWT Token from sessionStorage
 */
function getAuthToken(): string | null {
  return sessionStorage.getItem('sortv2_token');
}

/**
 * Helper to retrieve stored refresh token for the current user from localStorage
 */
function getRefreshToken(): string | null {
  const userId = sessionStorage.getItem('sortv2_user_id');
  if (!userId) return null;
  return localStorage.getItem(`sortv2_refresh_${userId}`);
}

/**
 * Store refresh token in localStorage keyed by user ID (supports multi-account)
 */
export function storeRefreshToken(userId: string, refreshToken: string): void {
  localStorage.setItem(`sortv2_refresh_${userId}`, refreshToken);
}

/**
 * Clear refresh token for a specific user
 */
export function clearRefreshToken(userId: string): void {
  localStorage.removeItem(`sortv2_refresh_${userId}`);
}

let isRefreshing = false;
let refreshPromise: Promise<any> | null = null;

/**
 * Refresh the access token using the stored refresh token.
 * Coalesces concurrent calls into a single request.
 */
async function refreshAccessToken(): Promise<{ accessToken: string; refreshToken: string; user: User } | null> {
  if (isRefreshing && refreshPromise) return refreshPromise;

  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) return null;

      const data = await response.json();
      // Store new tokens
      sessionStorage.setItem('sortv2_token', data.accessToken);
      if (data.user?.id) {
        storeRefreshToken(data.user.id, data.refreshToken);
      }
      return data;
    } catch {
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
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
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${refreshed.accessToken}`;
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
};

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


