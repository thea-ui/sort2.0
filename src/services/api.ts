import { User, Report, BinStatus } from '../types';

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
    throw new Error(errorData.error || `API Request failed with status ${response.status}`);
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
    updates: { status?: string; assignedMrfId?: string; assignedMrfName?: string; weightCollected?: number; isVerified?: boolean; pointsAwarded?: number; skipPoints?: boolean }
  ): Promise<Report> => {
    return fetchAPI(`/reports/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  verifyReportsBatch: async (
    reportIds: string[]
  ): Promise<{ updatedReports: Report[]; awards: { reportId: string; userId: string; amount: number; rank: number }[]; summary: { totalProcessed: number; totalAwarded: number; totalPoints: number } }> => {
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

  createSchoolYear: async (data: { label: string; startDate?: string; endDate?: string; enrollproId?: number }): Promise<any> => {
    return fetchAPI('/school-years', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  archiveSchoolYear: async (id: string): Promise<any> => {
    return fetchAPI(`/school-years/${id}/archive`, {
      method: 'POST',
    });
  },

  // Inventory Endpoints
  getInventoryItems: async (): Promise<any[]> => {
    return fetchAPI('/inventory');
  },

  createInventoryItem: async (data: { name: string; category: string; unit: string; quantity?: number; description?: string; minThreshold?: number; condition?: string; isPersistent?: boolean }): Promise<any> => {
    return fetchAPI('/inventory', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateInventoryItem: async (id: string, data: Record<string, any>): Promise<any> => {
    return fetchAPI(`/inventory/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  deleteInventoryItem: async (id: string): Promise<any> => {
    return fetchAPI(`/inventory/${id}`, {
      method: 'DELETE',
    });
  },

  getInventoryTransactions: async (filters?: { itemId?: string; schoolYearId?: string; type?: string }): Promise<any[]> => {
    const query = filters ? new URLSearchParams(filters as Record<string, string>).toString() : '';
    return fetchAPI(`/inventory/transactions${query ? `?${query}` : ''}`);
  },

  createInventoryTransaction: async (data: { itemId: string; type: string; quantity: number; notes?: string; performedBy?: string }): Promise<any> => {
    return fetchAPI('/inventory/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};


