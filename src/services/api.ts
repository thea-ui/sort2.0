import { User, Report, BinStatus } from '../types';

const API_BASE_URL = 'http://localhost:5000/api';

/**
 * Helper to retrieve stored Auth JWT Token from localStorage
 */
function getAuthToken(): string | null {
  return localStorage.getItem('sortv2_token');
}

/**
 * Generic API Fetcher wrapper with fallback safety
 */
async function fetchAPI<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API Request failed with status ${response.status}`);
  }

  return response.json();
}

export const apiService = {
  // Auth API
  login: async (email: string, passwordOrId: string): Promise<{ token: string; user: User }> => {
    return fetchAPI('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password: passwordOrId, employeeId: passwordOrId }),
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

  createReport: async (reportData: Partial<Report>): Promise<Report> => {
    return fetchAPI('/reports', {
      method: 'POST',
      body: JSON.stringify(reportData),
    });
  },

  updateReportStatus: async (
    id: string,
    updates: { status?: string; assignedMrfId?: string; weightCollected?: number; isVerified?: boolean }
  ): Promise<Report> => {
    return fetchAPI(`/reports/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
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
};
