import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User, Report, BinStatus, Challenge, PointHistory, Offense, SystemSettings, CalendarEvent, SyncLog, Role, ReportStatus, AppNotification } from '../types';
import { apiService, storeRefreshToken, clearRefreshToken } from '../services/api';
import { getStoredLocations, saveLocations, locationsToBins } from '../services/locationStore';
import { useAuthState, LoginResult } from './useAuthState';
import { useNotifications } from './useNotifications';


interface MockDataContextType {
  currentUser: User;
  users: User[];
  reports: Report[];
  bins: BinStatus[];
  challenges: Challenge[];
  pointHistory: PointHistory[];
  offenses: Offense[];
  settings: SystemSettings;
  calendarEvents: CalendarEvent[];
  syncLogs: SyncLog[];
  notifications: AppNotification[];
  isAuthenticated: boolean;
  
  // Actions
  login: (employeeId: string, email: string) => Promise<LoginResult>;
  logout: () => void;
  changeRole: (newRole: Role) => void;
  verifyReport: (reportId: string) => void;
  verifyReportsBatch: (reportIds: string[]) => Promise<void>;
  dispatchReport: (reportId: string, mrfId: string, mrfName: string) => void;
  createReport: (reportData: Omit<Report, 'id' | 'status' | 'reporterId' | 'reporterName' | 'pointsAwarded' | 'timestamp'>) => Report;
  updateReportStatus: (reportId: string, status: ReportStatus, weightCollected?: number, completionNotes?: string, collectedOutcome?: string) => void;
  updateBinLevel: (binId: string, fillLevel: number) => void;
  toggleBinDispatch: (binId: string) => void;
  setBinsState: React.Dispatch<React.SetStateAction<BinStatus[]>>;
  triggerSync: (system: string) => void;
  updateSettings: (newSettings: Partial<SystemSettings>) => void;
  resetDatabase: () => void;
  addOffense: (userId: string, description: string, severity?: 'WARNING' | 'DEDUCT' | 'SUSPENSION') => void;
  deductPoints: (userId: string, amount: number) => void;
  claimCertificate: (certName: string) => Promise<void>;
  dismissNotification: (notificationId: string) => void;
  clearNotificationsForUser: () => void;
}

const MockDataContext = createContext<MockDataContextType | undefined>(undefined);

// Initial Seed Data
const DEFAULT_SETTINGS: SystemSettings = {
  pointsPerReport: 50,
  pointsPerKgRecyclable: 10,
  warningThreshold: 3,
  certificatePointThreshold: 500,
  quarterGateActive: true,
  maxUnverifiedReports: 3,
  dismissPointPenalty: 10,
  falseReportPointPenalty: 50,
  warningAutoDeductAmount: 10,
  suspensionDurationHours: 24,
  rewardsReservePercent: 20,
  defaultVendorName: 'GreenCycle Recycling Vendor',
  binResetEnabled: true,
  binResetTime: '18:00',
};

const DEFAULT_USERS: User[] = [];

const DEFAULT_BINS: BinStatus[] = [];


const DEFAULT_CHALLENGES: Challenge[] = [];

const DEFAULT_REPORTS: Report[] = [];

const DEFAULT_CALENDAR: CalendarEvent[] = [];

const DEFAULT_HISTORY: PointHistory[] = [];

export const MockDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, setCurrentUser, isAuthenticated, setIsAuthenticated, login: authLogin, logout: authLogout, changeRole: authChangeRole } = useAuthState();
  const { notifications, setNotifications, addNotification, dismissNotification, clearNotificationsForUser } = useNotifications();

  const [users, setUsers] = useState<User[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [bins, setBins] = useState<BinStatus[]>([]);

  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [pointHistory, setPointHistory] = useState<PointHistory[]>([]);
  const [offenses, setOffenses] = useState<Offense[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [pointRules, setPointRules] = useState<{ rank: number; pointsAwarded: number }[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);

  const skipStorageKeysRef = useRef(new Set<string>());

  // Load database from localStorage or initialize with defaults
  useEffect(() => {
    function loadFromStorage<T>(key: string, defaultValue: T): T {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    }

    const loadedSettings = loadFromStorage('sort_settings', DEFAULT_SETTINGS);
    let loadedUsers = loadFromStorage('sort_users', DEFAULT_USERS);

    // Sanitize and deduplicate users array by email
    loadedUsers = loadedUsers.filter((u: User, index: number, self: User[]) =>
      index === self.findIndex((t: User) => t.email.toLowerCase() === u.email.toLowerCase())
    );

    // Always try to fetch users from API first
    apiService.getUsers().then((serverUsers) => {
      if (serverUsers && Array.isArray(serverUsers) && serverUsers.length > 0) {
        const formatted = serverUsers.map((u: any) => ({
          ...u,
            certificatesEarned: u.certificatesEarned || (u as any).certificates || [],
          }));
          setUsers(formatted);
          localStorage.setItem('sort_users', JSON.stringify(formatted));
      } else if (loadedUsers.length > 0) {
        setUsers(loadedUsers);
      } else {
        setUsers([]);
      }
    }).catch(() => {
      // API offline, use localStorage fallback
      setUsers(loadedUsers);
    });

    const rawReports = loadFromStorage('sort_reports', DEFAULT_REPORTS);
    const loadedReports: Report[] = (rawReports || []).map((r: Report) => {
      let title = r.title;
      let locationName = r.locationName;
      if (title && (title.includes('Grid [') || title.toLowerCase().includes('scattered debris at grid'))) {
        title = 'Scattered Debris';
      }
      if (locationName && (locationName.includes('Grid [') || locationName.toLowerCase().includes('scattered debris at grid'))) {
        locationName = 'Scattered Debris';
      }
      return { ...r, title, locationName };
    });
    const storedLocations = getStoredLocations();
    const loadedBins = storedLocations.length > 0 ? locationsToBins(storedLocations) : loadFromStorage('sort_bins', DEFAULT_BINS);

    let loadedChallenges = loadFromStorage('sort_challenges', DEFAULT_CHALLENGES);

    // Fetch challenges from server API
    apiService.getChallenges().then(serverChallenges => {
      if (serverChallenges && Array.isArray(serverChallenges) && serverChallenges.length > 0) {
        setChallenges(serverChallenges);
        localStorage.setItem('sort_challenges', JSON.stringify(serverChallenges));
      }
    }).catch(() => {});

    const loadedPointHistory = loadFromStorage('sort_point_history', DEFAULT_HISTORY);
    const loadedOffenses = loadFromStorage('sort_offenses', [] as Offense[]);
    const loadedCalendar = loadFromStorage('sort_calendar', DEFAULT_CALENDAR);
    const loadedSyncLogs = loadFromStorage('sort_sync_logs', [] as SyncLog[]);
    const loadedNotifications = loadFromStorage('sort_notifications', [] as AppNotification[]);

    setSettings(loadedSettings);
    setUsers(loadedUsers);
    setReports(loadedReports);
    setBins(loadedBins);
    setChallenges(loadedChallenges);
    setPointHistory(loadedPointHistory);
    setOffenses(loadedOffenses);
    setCalendarEvents(loadedCalendar);
    setSyncLogs(loadedSyncLogs);
    setNotifications(loadedNotifications);

    // If a token exists, do NOT set currentUser here — let the /auth/me
    // call in the next useEffect be the single source of truth so we never
    // flash the wrong user on reload.
    const token = sessionStorage.getItem('sortv2_token');
    if (!token) {
      setCurrentUser(loadedUsers[0] || null);
    }
  }, []);

// Real-Time Cross-Browser & Multi-Account API Polling (Chrome <-> Brave sync)
  useEffect(() => {
    const syncBackendData = async () => {
      try {
        const serverReports = await apiService.getReports();
        if (serverReports && Array.isArray(serverReports)) {
          setReports(prev => {
            if (serverReports.length === 0) return prev;

            // Server reports are authoritative
            const result = [...serverReports];

            // Preserve local optimistic dispatches when server state lags behind
            // (avoids UI flicker when backend PATCH /reports/:id/status is slow or fails silently)
            result.forEach((sr, idx) => {
              const localMatch = prev.find(pr =>
                pr.id === sr.id ||
                (pr.locationName.toLowerCase() === sr.locationName.toLowerCase() &&
                 pr.category === sr.category &&
                 pr.reporterId === sr.reporterId)
              );
              if (localMatch && localMatch.status === 'DISPATCHED' && sr.status !== 'DISPATCHED') {
                result[idx] = {
                  ...sr,
                  status: 'DISPATCHED',
                  isVerified: true,
                  assignedMrfId: localMatch.assignedMrfId ?? sr.assignedMrfId,
                  assignedMrfName: localMatch.assignedMrfName ?? sr.assignedMrfName,
                };
              }
            });

// Retain any pending local optimistic reports not yet returned by backend
            prev.forEach(pr => {
              const matchesServer = result.some(sr =>
                sr.id === pr.id ||
                (sr.locationName.toLowerCase() === pr.locationName.toLowerCase() &&
                 sr.category === pr.category &&
                 pr.reporterId === sr.reporterId)
              );
              if (!matchesServer) {
                result.unshift(pr);
              }
            });

            return result;
          });
        }

        // Sync users from backend (overrides localStorage mock data)
        const serverUsers = await apiService.getUsers();
        if (serverUsers && Array.isArray(serverUsers) && serverUsers.length > 0) {
          setUsers(serverUsers.map((u: any) => ({
            ...u,
            certificatesEarned: u.certificatesEarned || u.certificates || [],
          })));
          localStorage.setItem('sort_users', JSON.stringify(serverUsers));
        }
      } catch {
        // Express server offline fallback to local storage
      }
    };

    syncBackendData();
    const pollInterval = setInterval(syncBackendData, 2000); // 2-second real-time sync
    return () => clearInterval(pollInterval);
  }, []);

  // Listen for storage changes across concurrent browser tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (!e.newValue) return;
      try {
        if (e.key) skipStorageKeysRef.current.add(e.key);
        if (e.key === 'sort_reports') setReports(JSON.parse(e.newValue));
        if (e.key === 'sort_users') setUsers(JSON.parse(e.newValue));
        if (e.key === 'sort_bins') setBins(JSON.parse(e.newValue));
        if (e.key === 'sort_locations') {
          skipStorageKeysRef.current.add('sort_bins');
          setBins(locationsToBins(JSON.parse(e.newValue)));
        }
        if (e.key === 'sort_point_history') setPointHistory(JSON.parse(e.newValue));
        if (e.key === 'sort_challenges') setChallenges(JSON.parse(e.newValue));
        if (e.key === 'sort_offenses') setOffenses(JSON.parse(e.newValue));
      } catch (err) {
        console.warn('Cross-session sync notice:', err);
      }
    };

    const handleLocationUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setBins(locationsToBins(customEvent.detail));
      } else {
        setBins(locationsToBins(getStoredLocations()));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('sort_locations_updated', handleLocationUpdate);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('sort_locations_updated', handleLocationUpdate);
    };
  }, []);


  // Save to localStorage when state changes
  useEffect(() => {
    if (settings) localStorage.setItem('sort_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (skipStorageKeysRef.current.has('sort_users')) {
      skipStorageKeysRef.current.delete('sort_users');
    } else if (users.length > 0) {
      localStorage.setItem('sort_users', JSON.stringify(users));
    }
  }, [users]);

  useEffect(() => {
    if (skipStorageKeysRef.current.has('sort_reports')) {
      skipStorageKeysRef.current.delete('sort_reports');
    } else {
      localStorage.setItem('sort_reports', JSON.stringify(reports));
    }

    // Synchronize location bin statuses with active (PENDING or DISPATCHED) reports
    const currentLocations = getStoredLocations();
    let hasChanges = false;

    const updatedLocations = currentLocations.map((loc) => {
      let locChanged = false;
      const updatedStreams = loc.streams.map((st) => {
        const matchingReports = reports.filter(
          (r) =>
            r.locationName.trim().toLowerCase() === loc.name.trim().toLowerCase() &&
            r.category === st.type &&
            (r.status === 'PENDING' || r.status === 'DISPATCHED')
        );

        const unverifiedPending = matchingReports.filter(r => !r.isVerified && r.status === 'PENDING');
        const isVerifiedOrDispatched = matchingReports.some(r => r.isVerified || r.status === 'DISPATCHED');
        const shouldBeUnavailable = isVerifiedOrDispatched || unverifiedPending.length >= 3;
        const isCurrentlyUnavailable = st.status === 'Unavailable';

        if (shouldBeUnavailable !== isCurrentlyUnavailable) {
          locChanged = true;
          hasChanges = true;
          return { ...st, status: shouldBeUnavailable ? ('Unavailable' as const) : ('Available' as const) };
        }
        return st;
      });

      if (locChanged) {
        const anyUnavailable = updatedStreams.some((s) => s.status === 'Unavailable');
        return {
          ...loc,
          status: anyUnavailable ? ('Unavailable' as const) : ('Available' as const),
          streams: updatedStreams,
        };
      }
      return loc;
    });

    if (hasChanges) {
      saveLocations(updatedLocations);
      setBins(locationsToBins(updatedLocations));
    }
  }, [reports]);

  useEffect(() => {
    if (skipStorageKeysRef.current.has('sort_bins')) {
      skipStorageKeysRef.current.delete('sort_bins');
    } else if (bins.length > 0) {
      localStorage.setItem('sort_bins', JSON.stringify(bins));
    }
  }, [bins]);

  useEffect(() => {
    if (skipStorageKeysRef.current.has('sort_challenges')) {
      skipStorageKeysRef.current.delete('sort_challenges');
    } else if (challenges.length > 0) {
      localStorage.setItem('sort_challenges', JSON.stringify(challenges));
    }
  }, [challenges]);

  useEffect(() => {
    localStorage.setItem('sort_point_history', JSON.stringify(pointHistory));
  }, [pointHistory]);

  useEffect(() => {
    localStorage.setItem('sort_offenses', JSON.stringify(offenses));
  }, [offenses]);

  useEffect(() => {
    if (calendarEvents.length > 0) localStorage.setItem('sort_calendar', JSON.stringify(calendarEvents));
  }, [calendarEvents]);

  useEffect(() => {
    if (syncLogs.length > 0) localStorage.setItem('sort_sync_logs', JSON.stringify(syncLogs));
  }, [syncLogs]);

  useEffect(() => {
    localStorage.setItem('sort_notifications', JSON.stringify(notifications));
  }, [notifications]);

  // Fetch tiered point rules from Admin Settings/Database
  useEffect(() => {
    apiService.getPointRules().then((rules) => {
      if (rules && Array.isArray(rules) && rules.length > 0) {
        setPointRules(rules.map(r => ({ rank: r.rank, pointsAwarded: r.pointsAwarded })));
      }
    }).catch(() => {});
  }, []);

  // Actions — delegate to extracted hooks, then sync local state
  const login = async (password: string, identifier: string): Promise<LoginResult> => {
    const result = await authLogin(password, identifier);
    if (result.ok) {
      setUsers(prev => prev.map(u => u.email.toLowerCase() === result.user.email.toLowerCase() ? result.user : u));
    }
    return result;
  };

  const logout = () => {
    authLogout();
  };

  const changeRole = (newRole: Role) => {
    authChangeRole(newRole, users);
  };

  const clearUserNotifications = () => {
    if (currentUser) clearNotificationsForUser(currentUser.id);
  };

  const createReport = (reportData: Omit<Report, 'id' | 'status' | 'reporterId' | 'reporterName' | 'pointsAwarded' | 'timestamp'>) => {
    const currentUserId = currentUser?.id || 'current';
    
    // Check if current user already has an active (unresolved) report for this trashbin
    const existingUserReport = reports.find(r => 
      (r.reporterId === currentUserId || r.reporterId === 'current') &&
      r.locationName.toLowerCase() === reportData.locationName.toLowerCase() &&
      r.category === reportData.category &&
      (r.status === 'PENDING' || r.status === 'DISPATCHED')
    );

    if (existingUserReport) {
      throw new Error(`You have already submitted an active report for ${reportData.locationName} (${reportData.category}). You can only report a specific trashbin once until MRF resolves it.`);
    }

    // Check if bin is currently pending pick up or reached 3-report unverified limit
    const unverifiedReports = reports.filter(r =>
      r.locationName.toLowerCase() === reportData.locationName.toLowerCase() &&
      r.category === reportData.category &&
      !r.isVerified &&
      r.status === 'PENDING'
    );

    if (unverifiedReports.length >= 3) {
      throw new Error(`This trash bin at ${reportData.locationName} (${reportData.category}) has reached the 3-report limit waiting for Admin verification and is currently unavailable.`);
    }

    const isDispatchedBin = reports.some(r =>
      r.locationName.toLowerCase() === reportData.locationName.toLowerCase() &&
      r.category === reportData.category &&
      r.status === 'DISPATCHED'
    );

    if (isDispatchedBin) {
      throw new Error(`This trash bin at ${reportData.locationName} (${reportData.category}) is pending pick up (MRF Collector Dispatched) and is currently unavailable.`);
    }

    // Determine current report position rank for this trashbin
    const clusterReports = reports.filter(r =>
      r.locationName.toLowerCase() === reportData.locationName.toLowerCase() &&
      r.category === reportData.category &&
      (r.status === 'PENDING' || r.status === 'DISPATCHED')
    );
    const calculatedRank = clusterReports.length + 1;

    const newReport: Report = {
      ...reportData,
      id: `rep-${Date.now()}`,
      status: 'PENDING',
      reporterId: currentUserId,
      reporterName: currentUser?.name || 'Alex Mercer',
      reporterRole: currentUser?.role?.toLowerCase() as Report['reporterRole'] || 'student',
      pointsAwarded: 0, // Points deferred until MRF resolution
      reporterRank: calculatedRank,
      timestamp: new Date().toISOString(),
    };

    setReports(prev => [newReport, ...prev]);

    // Notify admin/MRF about new report
    addNotification('REPORT_SUBMITTED', 'New Report Submitted', `${currentUser?.name || 'Someone'} reported ${reportData.title} at ${reportData.locationName}`, newReport.id, 'admin');
    // Notify the reporter
    addNotification('REPORT_SUBMITTED', 'Report Submitted', `Your report "${reportData.title}" at ${reportData.locationName} is pending admin review.`, newReport.id, currentUserId);

    // Persist new report to PostgreSQL Express API
    apiService.createReport({
      title: newReport.title,
      description: newReport.description,
      category: newReport.category,
      urgency: newReport.urgency,
      locationName: newReport.locationName,
      coordinates: newReport.coordinates,
      imageUrl: newReport.imageUrl,
      reportType: (reportData as any).reportType || 'WASTE',
    }).then(serverRes => {
      if (serverRes && serverRes.id) {
        setReports(prev => prev.map(r => r.id === newReport.id ? { ...r, id: serverRes.id } : r));
      }
    }).catch(err => {
      console.warn('PostgreSQL database create report notice:', err);
    });

    return newReport;
  };

  const updateReportStatus = (
    reportId: string,
    status: ReportStatus,
    weightCollected?: number,
    completionNotes?: string,
    collectedOutcome?: string
  ) => {
    const targetReport = reports.find(r => r.id === reportId);
    if (!targetReport) return;

    // Optimistically update local report state (no point calculations client-side)
    setReports(prev => {
      if (status === 'COLLECTED' || status === 'RESOLVED') {
        // Mark the entire cluster as resolved
        const clusterIds = new Set(
          prev
            .filter(r =>
              r.locationName.toLowerCase() === targetReport.locationName.toLowerCase() &&
              r.category === targetReport.category &&
              r.status !== 'DISMISSED' &&
              r.status !== 'COLLECTED' &&
              r.status !== 'RESOLVED' &&
              r.status !== 'EXPIRED'
            )
            .map(r => r.id)
        );
        clusterIds.add(reportId);

        return prev.map(r => {
          if (clusterIds.has(r.id)) {
            return {
              ...r,
              status,
              weightCollected: weightCollected ?? r.weightCollected,
              completionNotes: completionNotes ?? r.completionNotes,
              collectedOutcome: collectedOutcome ?? r.collectedOutcome,
              completedAt: r.completedAt || new Date().toISOString(),
            };
          }
          return r;
        });
      }

      // Non-final status update (e.g. DISPATCHED, DISMISSED)
      return prev.map(r => r.id === reportId ? {
        ...r,
        status,
        weightCollected: weightCollected ?? r.weightCollected,
        completionNotes: completionNotes ?? r.completionNotes,
        collectedOutcome: collectedOutcome ?? r.collectedOutcome,
      } : r);
    });

    // Generate notifications based on status change
    if (status === 'COLLECTED' || status === 'RESOLVED') {
      addNotification('REPORT_COMPLETED', 'Cleanup Completed!', `MRF has completed cleanup at ${targetReport.locationName}.`, reportId, targetReport.reporterId);
    } else if (status === 'DISMISSED') {
      addNotification('REPORT_DISMISSED', 'Report Dismissed', `Your report at ${targetReport.locationName} was dismissed by admin.`, reportId, targetReport.reporterId);
    }

    // Persist status update to PostgreSQL Express backend
    // Server is the single source of truth for points
    apiService.updateReportStatus(reportId, {
      status,
      weightCollected,
    }).then(async () => {
      // Full refresh: the server may have awarded points to the entire stream.
      // A full refresh guarantees authoritative data for all reports and users.
      try {
        const [serverReports, serverUsers] = await Promise.all([
          apiService.getReports(),
          apiService.getUsers(),
        ]);
        if (serverReports && Array.isArray(serverReports)) {
          setReports(serverReports);
        }
        if (serverUsers && Array.isArray(serverUsers)) {
          setUsers(serverUsers.map((u: any) => ({
            ...u,
            certificatesEarned: u.certificatesEarned || u.certificates || [],
          })));
        }
      } catch (err) {
        console.warn('Sync after status update notice:', err);
      }
    }).catch(err => {
      console.warn('PostgreSQL updateReportStatus error:', err);
    });
  };

  const updateBinLevel = (binId: string, fillLevel: number) => {
    setBins(prev => prev.map(b => {
      if (b.id === binId) {
        return { 
          ...b, 
          fillLevel,
          lastEmptied: fillLevel === 0 ? new Date().toISOString().replace('T', ' ').substring(0, 16) : b.lastEmptied
        };
      }
      return b;
    }));
  };

  const toggleBinDispatch = (binId: string) => {
    setBins(prev => prev.map(b => b.id === binId ? { ...b, activeDispatch: !b.activeDispatch } : b));
  };

  const triggerSync = (system: string) => {
    const isSuccess = Math.random() > 0.05; // 95% success rate
    const records = Math.floor(Math.random() * 20) + 5;
    const newLog: SyncLog = {
      id: `sync-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      system,
      status: isSuccess ? 'SUCCESS' : 'FAILED',
      recordsSynced: isSuccess ? records : 0
    };
    setSyncLogs(prev => [newLog, ...prev]);
  };

  const updateSettings = (newSettings: Partial<SystemSettings>) => {
    setSettings(prev => prev ? { ...prev, ...newSettings } : null);
  };

  const addOffense = async (userId: string, description: string, severity?: 'WARNING' | 'DEDUCT' | 'SUSPENSION', reportId?: string) => {
    // Auto-determine severity based on user's offense level if not provided
    const user = users.find(u => u.id === userId);
    const level = (user?.warningsCount ?? 0) + 1;
    const autoSeverity: 'WARNING' | 'DEDUCT' | 'SUSPENSION' =
      level === 1 ? 'WARNING' : level === 2 ? 'DEDUCT' : 'SUSPENSION';
    const effectiveSeverity = severity || autoSeverity;

    // Call backend API
    try {
      const token = sessionStorage.getItem('sortv2_token');
      if (token) {
        const res = await fetch(`http://localhost:5000/api/users/${userId}/warn`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ description, severity: effectiveSeverity, reportId }),
        });
        if (res.ok) {
          const data = await res.json();
          // Update local state from backend response
          setUsers(prev => prev.map(u => {
            if (u.id === userId) {
              const updated: any = { ...u, warningsCount: data.warningsCount || u.warningsCount + 1 };
              if (data.pointsDeducted > 0) updated.points = Math.max(0, u.points - data.pointsDeducted);
              if (effectiveSeverity === 'SUSPENSION') {
                updated.accountStatus = 'SUSPENDED';
                updated.suspendedUntil = data.offense?.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
              }
              return updated;
            }
            return u;
          }));
          const newOffense: Offense = {
            id: data.offense?.id || `off-${Date.now()}`,
            userId,
            userName: users.find(u => u.id === userId)?.name || 'Unknown User',
            description,
            severity: effectiveSeverity,
            timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
            expiresAt: data.offense?.expiresAt,
          };
          setOffenses(prev => [newOffense, ...prev]);
          return data;
        }
      }
    } catch (err) {
      console.warn('Backend warn API failed:', err);
    }

    // Fallback: local only
    const expiresAt = effectiveSeverity === 'SUSPENSION' ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : undefined;
    const newOffense: Offense = {
      id: `off-${Date.now()}`,
      userId,
      userName: users.find(u => u.id === userId)?.name || 'Unknown User',
      description,
      severity: effectiveSeverity,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      expiresAt,
    };
    setOffenses(prev => [newOffense, ...prev]);
    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        const updated: any = { ...u, warningsCount: u.warningsCount + 1 };
        if (effectiveSeverity === 'SUSPENSION') {
          updated.accountStatus = 'SUSPENDED';
          updated.suspendedUntil = expiresAt;
        }
        return updated;
      }
      return u;
    }));
  };

  const deductPoints = async (userId: string, amount: number, reason?: string) => {
    // Call backend API
    try {
      const token = sessionStorage.getItem('sortv2_token');
      if (token) {
        const res = await fetch(`http://localhost:5000/api/users/${userId}/deduct-points`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ amount, reason }),
        });
        if (res.ok) {
          const data = await res.json();
          setUsers(prev => prev.map(u => u.id === userId ? { ...u, points: data.points ?? Math.max(0, u.points - amount) } : u));
          return data;
        }
      }
    } catch (err) {
      console.warn('Backend deduct API failed:', err);
    }

    // Fallback: local only
    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        return { ...u, points: Math.max(0, u.points - amount) };
      }
      return u;
    }));
  };

  const claimCertificate = async (certName: string) => {
    if (!currentUser) return;

    // Optimistic local update
    setUsers(prev => prev.map(u => {
      if (u.id === currentUser.id) {
        const certs = [...u.certificatesEarned];
        if (!certs.includes(certName)) {
          certs.push(certName);
        }
        return { ...u, certificatesEarned: certs };
      }
      return u;
    }));

    // Persist to server
    try {
      const result = await apiService.claimCertificate(currentUser.id, certName);
      if (result?.user) {
        setUsers(prev => prev.map(u => {
          if (u.id === currentUser.id) {
            return {
              ...u,
              certificatesEarned: (result.user as any).certificatesEarned || (result.user as any).certificates || u.certificatesEarned,
            };
          }
          return u;
        }));
      }
    } catch (err: any) {
      console.warn('Claim certificate error:', err);
      // Revert optimistic update on failure
      setUsers(prev => prev.map(u => {
        if (u.id === currentUser.id) {
          return { ...u, certificatesEarned: u.certificatesEarned.filter(c => c !== certName) };
        }
        return u;
      }));
    }
  };

  const resetDatabase = () => {
    localStorage.removeItem('sort_settings');
    localStorage.removeItem('sort_users');
    localStorage.removeItem('sort_reports');
    localStorage.removeItem('sort_bins');
    localStorage.removeItem('sort_challenges');
    localStorage.removeItem('sort_point_history');
    localStorage.removeItem('sort_offenses');
    localStorage.removeItem('sort_calendar');
    localStorage.removeItem('sort_sync_logs');
    localStorage.removeItem('sort_notifications');
    // Reset recycle market local cache so stale inventory does not reappear after a purge
    localStorage.removeItem('sort_market_stocks');
    localStorage.removeItem('sort_market_sales');
    localStorage.removeItem('sort_market_version');

    // Ensure all student points and warnings are zeroed out
    const cleanUsers = DEFAULT_USERS.map(u => ({
      ...u,
      points: u.role === 'STUDENT' ? 0 : u.points,
      warningsCount: u.role === 'STUDENT' ? 0 : u.warningsCount,
      certificatesEarned: u.role === 'STUDENT' ? [] : u.certificatesEarned,
    }));

    setSettings(DEFAULT_SETTINGS);
    setUsers(cleanUsers);
    setReports([]);
    setBins(DEFAULT_BINS);
    setChallenges([]);
    setPointHistory([]);
    setOffenses([]);
    setCalendarEvents(DEFAULT_CALENDAR);
    setSyncLogs([]);
    setNotifications([]);

    // Call Express API to purge backend database tables (also resets recycle market inventory)
    apiService.purgeDatabase().catch(err => {
      console.warn('Backend purge API notice:', err);
    });
  };

  if (!currentUser || !settings) {
    // Prevent rendering until local storage is read and initialized.
    // Provide a manual escape hatch in case loading hangs (clear session + retry).
    const handleRecovery = () => {
        sessionStorage.removeItem('sort_auth');
        sessionStorage.removeItem('sortv2_token');
        sessionStorage.removeItem('sort_tab_role');
        localStorage.removeItem('sort_users');
        localStorage.removeItem('sort_reports');
        localStorage.removeItem('sort_settings');
        window.location.reload();
      };

    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-emerald-400">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
          <p className="text-lg font-semibold tracking-wider animate-pulse">Initializing S.O.R.T. Database...</p>
          <button
            type="button"
            onClick={handleRecovery}
            className="mt-6 px-4 py-2 rounded-xl border border-emerald-500/40 text-emerald-300 text-xs font-bold hover:bg-emerald-500/10 transition-colors"
          >
            Stuck? Reset session & retry
          </button>
        </div>
      </div>
    );
  }

  const verifyReport = (reportId: string) => {
    const targetReport = reports.find(r => r.id === reportId);
    if (!targetReport) return;

    // Optimistically mark as verified locally (no point calculations client-side)
    setReports(prev => prev.map(r => {
      if (r.id === reportId || (
        r.locationName.toLowerCase() === targetReport.locationName.toLowerCase() &&
        r.category === targetReport.category &&
        r.status !== 'DISMISSED' &&
        r.status !== 'COLLECTED' &&
        r.status !== 'RESOLVED' &&
        r.status !== 'EXPIRED'
      )) {
        return { ...r, isVerified: true };
      }
      return r;
    }));

    // Send verification to server — server is the single source of truth for points
    apiService.verifyReport(reportId).then(async () => {
      // Full refresh: the server may have awarded points to the entire stream,
      // not just this one report. A full refresh guarantees authoritative data.
      try {
        const [serverReports, serverUsers, serverChallenges] = await Promise.all([
          apiService.getReports(),
          apiService.getUsers(),
          apiService.getChallenges(),
        ]);
        if (serverReports && Array.isArray(serverReports)) {
          setReports(serverReports);
        }
        if (serverUsers && Array.isArray(serverUsers)) {
          setUsers(serverUsers.map((u: any) => ({
            ...u,
            certificatesEarned: u.certificatesEarned || u.certificates || [],
          })));
        }
        if (serverChallenges && Array.isArray(serverChallenges)) {
          setChallenges(serverChallenges);
        }
      } catch (err) {
        console.warn('Sync after verify error:', err);
      }
    }).catch(() => {});
  };

  const dispatchReport = (reportId: string, mrfId: string, mrfName: string) => {
    const target = reports.find(r => r.id === reportId);
    // Skip dismissed or expired reports
    if (target?.status === 'DISMISSED' || target?.status === 'EXPIRED') return;

    // Optimistically update local state
    setReports(prev => prev.map(r => {
      const isMatch = r.id === reportId || (target && r.locationName.toLowerCase() === target.locationName.toLowerCase() && r.category === target.category);
      if (isMatch) {
        // Notify reporter about dispatch
        addNotification('REPORT_DISPATCHED', 'MRF Collector Dispatched', `MRF staff ${mrfName} has been assigned to collect waste at ${r.locationName}.`, r.id, r.reporterId);
        return {
          ...r,
          isVerified: true,
          status: 'DISPATCHED' as ReportStatus,
          assignedMrfId: mrfId,
          assignedMrfName: mrfName
        };
      }
      return r;
    }));

    // Send dispatch update to server
    apiService.updateReportStatus(reportId, {
      status: 'DISPATCHED',
      assignedMrfId: mrfId,
    }).then(async () => {
      // Full refresh to get authoritative server state
      try {
        const serverReports = await apiService.getReports();
        if (serverReports && Array.isArray(serverReports)) {
          setReports(serverReports);
        }
      } catch (err) {
        console.warn('Sync after dispatch:', err);
      }
    }).catch((err) => {
      console.warn('Backend dispatch update failed (local state still applied):', err);
    });
  };

  const verifyReportsBatch = async (reportIds: string[]): Promise<void> => {
    // Optimistically mark all as verified locally
    setReports(prev => prev.map(r => {
      if (reportIds.includes(r.id)) {
        return { ...r, isVerified: true };
      }
      return r;
    }));

    try {
      await apiService.verifyReportsBatch(reportIds);

      // Full refresh: the server awards points to the entire stream per group,
      // not just the selected reports. A full refresh guarantees authoritative data.
      const [serverReports, serverUsers, serverChallenges] = await Promise.all([
        apiService.getReports(),
        apiService.getUsers(),
        apiService.getChallenges(),
      ]);
      if (serverReports && Array.isArray(serverReports)) {
        setReports(serverReports);
      }
      if (serverUsers && Array.isArray(serverUsers)) {
        setUsers(serverUsers.map((u: any) => ({
          ...u,
          certificatesEarned: u.certificatesEarned || u.certificates || [],
        })));
      }
      if (serverChallenges && Array.isArray(serverChallenges)) {
        setChallenges(serverChallenges);
      }
    } catch (err) {
      console.warn('Batch verify error:', err);
      throw err;
    }
  };

  return (
    <MockDataContext.Provider value={{
      currentUser,
      users,
      reports,
      bins,
      challenges,
      pointHistory,
      offenses,
      settings,
      calendarEvents,
      syncLogs,
      notifications,
      isAuthenticated,
      login,
      logout,
      changeRole,
      verifyReport,
      verifyReportsBatch,
      dispatchReport,
      createReport,
      updateReportStatus,
      updateBinLevel,
      toggleBinDispatch,
      setBinsState: setBins,
      triggerSync,
      updateSettings,
      resetDatabase,
      addOffense,
      deductPoints,
      claimCertificate,
      dismissNotification,
      clearNotificationsForUser: clearUserNotifications
    }}>
      {children}
    </MockDataContext.Provider>
  );
};

export const useMockData = () => {
  const context = useContext(MockDataContext);
  if (!context) {
    throw new Error('useMockData must be used within a MockDataProvider');
  }
  return context;
};
