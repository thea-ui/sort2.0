import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User, Report, BinStatus, Challenge, PointHistory, Offense, SystemSettings, CalendarEvent, SyncLog, Role, ReportStatus, AppNotification } from '../types';
import { apiService, storeRefreshToken, clearRefreshToken } from '../services/api';
import { getStoredLocations, saveLocations, locationsToBins } from '../services/locationStore';
import { useAuthState, LoginResult } from './useAuthState';
import { useNotifications } from './useNotifications';
import { buildDispatchNotifications, buildVerifiedNotifications, NOTIFICATIONS_STORAGE_KEY } from '../utils/notifications';
import { isTerminalReport, isDispatchableStreamMember } from '../utils/reportUtils';


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
  certificateGraceDays: 3,
  certificateMilestoneName: 'Eco-Milestone Certificate',
  certificateChampionName: 'Eco-Champion Certificate',
  certificateLeaderName: 'Eco-Leader Certificate',
  certificateAdvocateName: 'Eco-Advocate Certificate',
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
  walkInPointsPer500ml: 1,
  walkInEnabled: true,
};

const DEFAULT_USERS: User[] = [];

const DEFAULT_BINS: BinStatus[] = [];


const DEFAULT_CHALLENGES: Challenge[] = [];

const DEFAULT_REPORTS: Report[] = [];

const DEFAULT_CALENDAR: CalendarEvent[] = [];

const DEFAULT_HISTORY: PointHistory[] = [];

// The public `/users` endpoint serves a privacy-minimised projection (no email,
// employeeId or syncSource) to anonymous callers and to non-staff sessions,
// while staff receive the full record. A minimised payload (e.g. from a signed
// out landing tab polling every 2s) must never downgrade the richer projection
// held by an admin tab — otherwise the Users tab blanks out and repopulates on
// every cross-tab sync, which reads as flickering.
const isFullUserProjection = (list: User[]): boolean =>
  list.length > 0 && Boolean((list[0] as any)?.email || (list[0] as any)?.syncSource);

const sameUserList = (a: User[], b: User[]): boolean =>
  a === b || (a.length === b.length && JSON.stringify(a) === JSON.stringify(b));

/**
 * Reconciles an incoming server user list with the current one, skipping the
 * update when the list is unchanged so the heavy Users table is not forced to
 * re-render on every 2s poll. Same-tab fetches intentionally still allow a
 * downgrade to the minimised projection (e.g. after a logout/role switch) so a
 * learner session can never inherit a cached admin projection.
 */
const reconcileUsers = (prev: User[], next: User[]): User[] =>
  sameUserList(prev, next) ? prev : next;

/**
 * Cross-tab guard: a minimised payload written by an unauthenticated or
 * non-staff tab (e.g. the public landing poll) must never downgrade the full
 * projection an admin tab already holds — that is what made the Users tab blank
 * and repopulate on every storage event.
 */
const reconcileUsersFromStorage = (prev: User[], next: User[]): User[] => {
  if (isFullUserProjection(prev) && !isFullUserProjection(next)) return prev;
  return reconcileUsers(prev, next);
};

export const MockDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, setCurrentUser, isAuthenticated, setIsAuthenticated, login: authLogin, logout: authLogout, changeRole: authChangeRole } = useAuthState();
  const { notifications, setNotifications, addNotification, addNotifications, dismissNotification, clearNotificationsForUser } = useNotifications();

  const [users, setUsers] = useState<User[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [bins, setBins] = useState<BinStatus[]>([]);

  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [pointHistory, setPointHistory] = useState<PointHistory[]>([]);
  const [offenses, setOffenses] = useState<Offense[]>([]);
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
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

    // Sanitize and deduplicate users. Anonymous API responses omit `email`
    // (data minimisation), so the key must fall back to `id` and never crash.
    const userKey = (user: User): string => String(user.email ?? user.id ?? '').toLowerCase();
    loadedUsers = loadedUsers.filter((u: User, index: number, self: User[]) =>
      index === self.findIndex((t: User) => userKey(t) === userKey(u))
    );

    // Always try to fetch users from API first
    apiService.getUsers().then((serverUsers) => {
      if (serverUsers && Array.isArray(serverUsers) && serverUsers.length > 0) {
        const formatted = serverUsers.map((u: any) => ({
          ...u,
            certificatesEarned: u.certificatesEarned || (u as any).certificates || [],
          }));
          setUsers((prev) => reconcileUsers(prev, formatted));
          // Only cache the full (authenticated) projection. Anonymous responses
          // are privacy-minimised and must not pollute the local cache.
          if (isFullUserProjection(formatted)) {
            localStorage.setItem('sort_users', JSON.stringify(formatted));
          }
      } else if (loadedUsers.length > 0) {
        setUsers((prev) => reconcileUsers(prev, loadedUsers));
      } else {
        setUsers((prev) => reconcileUsers(prev, []));
      }
    }).catch(() => {
      // API offline, use localStorage fallback
      setUsers((prev) => reconcileUsers(prev, loadedUsers));
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

    // Fetch challenges from server API (requires auth — skip while signed out)
    if (sessionStorage.getItem('sortv2_token')) {
      apiService.getChallenges().then(serverChallenges => {
        // An empty array is authoritative (e.g. the term ended) and must
        // overwrite the stale cache, so only reject non-array responses.
        if (Array.isArray(serverChallenges)) {
          setChallenges(serverChallenges);
          localStorage.setItem('sort_challenges', JSON.stringify(serverChallenges));
        }
      }).catch(() => {});
    }

    const loadedPointHistory = loadFromStorage('sort_point_history', DEFAULT_HISTORY);
    const loadedOffenses = loadFromStorage('sort_offenses', [] as Offense[]);
    const loadedCalendar = loadFromStorage('sort_calendar', DEFAULT_CALENDAR);
    const loadedSyncLogs = loadFromStorage('sort_sync_logs', [] as SyncLog[]);

    setSettings(loadedSettings);
    setUsers((prev) => reconcileUsers(prev, loadedUsers));
    setReports(loadedReports);
    setBins(loadedBins);
    setChallenges(loadedChallenges);
    setPointHistory(loadedPointHistory);
    setOffenses(loadedOffenses);
    setCalendarEvents(loadedCalendar);
    setSyncLogs(loadedSyncLogs);

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
        // Reports require authentication. Skip while signed out so the public
        // landing page never spams the console with 401s.
        const isSignedIn = Boolean(sessionStorage.getItem('sortv2_token'));

        if (isSignedIn) {
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
              if (
                localMatch &&
                localMatch.status === 'DISPATCHED' &&
                sr.status !== 'DISPATCHED' &&
                // Never resurrect a report the server has finished: terminal
                // statuses are immutable and must win over a stale optimistic
                // DISPATCHED left over from an older session.
                !isTerminalReport(sr)
              ) {
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
              // Only locally-minted optimistic reports (id `rep-…`) are retained.
              // A server-authored report (UUID) missing from the server response
              // was deleted or scoped out and must not be resurrected from cache.
              if (!pr.id.startsWith('rep-')) return;
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
        }

        // Sync users from backend (public endpoint, keeps the landing leaderboard live)
        const serverUsers = await apiService.getUsers();
        if (serverUsers && Array.isArray(serverUsers) && serverUsers.length > 0) {
          const formattedUsers = serverUsers.map((u: any) => ({
            ...u,
            certificatesEarned: u.certificatesEarned || u.certificates || [],
          }));
          setUsers((prev) => reconcileUsers(prev, formattedUsers));
          // Cache only the full projection (see mount effect above).
          if (isFullUserProjection(formattedUsers)) {
            localStorage.setItem('sort_users', JSON.stringify(formattedUsers));
          }
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
      const newValue = e.newValue;
      try {
        if (e.key) skipStorageKeysRef.current.add(e.key);
        if (e.key === 'sort_reports') setReports(JSON.parse(newValue));
        if (e.key === 'sort_users') setUsers((prev) => reconcileUsersFromStorage(prev, JSON.parse(newValue)));
        if (e.key === 'sort_bins') setBins(JSON.parse(newValue));
        if (e.key === 'sort_locations') {
          skipStorageKeysRef.current.add('sort_bins');
          setBins(locationsToBins(JSON.parse(newValue)));
        }
        if (e.key === 'sort_point_history') setPointHistory(JSON.parse(newValue));
        if (e.key === 'sort_challenges') setChallenges(JSON.parse(newValue));
        if (e.key === 'sort_offenses') setOffenses(JSON.parse(newValue));
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
    } else if (users.length > 0 && isFullUserProjection(users)) {
      // Never persist the anonymised public projection: another tab would ingest
      // it via the storage event and blank its richer admin user list.
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
    } else {
      // Persist even when empty so a term-end wipe is not resurrected on reload.
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

  // Keep server-side settings in sync for every signed-in user. Previously the
  // client only read its own localStorage copy, so an admin changing thresholds
  // (e.g. the certificate target) never reached learners' screens.
  useEffect(() => {
    if (!isAuthenticated) return;
    apiService.getSettings().then((serverSettings) => {
      if (serverSettings && typeof serverSettings === 'object') {
        setSettings(prev => ({ ...prev, ...serverSettings }));
        localStorage.setItem('sort_settings', JSON.stringify(serverSettings));
      }
    }).catch(() => {});
  }, [isAuthenticated]);

  // Fetch tiered point rules from Admin Settings/Database (requires auth)
  useEffect(() => {
    if (!sessionStorage.getItem('sortv2_token')) return;
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
      // Upsert the signed-in user. Cached users may be the anonymous, minimised
      // projection (no `email`), so match on email OR id and never assume email.
      const loggedIn = result.user;
      const keyOf = (user: User) => String(user.email ?? user.id ?? '').toLowerCase();
      const target = keyOf(loggedIn);
      setUsers(prev => {
        const exists = prev.some(u => keyOf(u) === target);
        return exists ? prev.map(u => (keyOf(u) === target ? loggedIn : u)) : [...prev, loggedIn];
      });
    }
    return result;
  };

  const logout = () => {
    // Shared-device hygiene: never leave the signed-out user's personal alerts
    // behind for the next account that signs in on this browser.
    if (currentUser) clearNotificationsForUser(currentUser.id);
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

    // Notify the admin review queue (role-scoped, never the legacy 'admin' id)
    addNotification({
      type: 'REPORT_SUBMITTED',
      title: 'New Report Submitted',
      message: `${currentUser?.name || 'Someone'} reported ${reportData.title} at ${reportData.locationName}`,
      reportId: newReport.id,
      recipientRole: 'ADMIN',
    });
    // Notify the reporter
    addNotification({
      type: 'REPORT_SUBMITTED',
      title: 'Report Submitted',
      message: `Your report "${reportData.title}" at ${reportData.locationName} is pending admin review.`,
      reportId: newReport.id,
      recipientId: currentUserId,
    });

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
        // Keep notification deep links valid after the temp id is replaced.
        setNotifications(prev => prev.map(n =>
          n.reportId === newReport.id ? { ...n, reportId: serverRes.id } : n
        ));
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
              !isTerminalReport(r)
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

    // Generate notifications based on status change (reporter only)
    if (status === 'COLLECTED' || status === 'RESOLVED') {
      addNotification({
        type: 'REPORT_COMPLETED',
        title: 'Cleanup Completed!',
        message: `MRF has completed cleanup at ${targetReport.locationName}.`,
        reportId,
        recipientId: targetReport.reporterId,
      });
    } else if (status === 'DISMISSED') {
      addNotification({
        type: 'REPORT_DISMISSED',
        title: 'Report Dismissed',
        message: `Your report at ${targetReport.locationName} was dismissed by admin.`,
        reportId,
        recipientId: targetReport.reporterId,
      });
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
          setUsers((prev) => reconcileUsers(prev, serverUsers.map((u: any) => ({
            ...u,
            certificatesEarned: u.certificatesEarned || u.certificates || [],
          }))));
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
    setSettings(prev => ({ ...(prev ?? DEFAULT_SETTINGS), ...newSettings }));
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
    localStorage.removeItem(NOTIFICATIONS_STORAGE_KEY);
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

  // Only block rendering while an authenticated session is being restored.
  // Unauthenticated visitors (including a completely fresh browser with empty
  // storage) must always reach the public landing/login screen, otherwise the
  // app hangs on the loader forever with no way in.
  if (isAuthenticated && !currentUser) {
    const handleRecovery = () => {
      // Clear both cached data and session state so a corrupt entry can never
      // wedge startup again.
      Object.keys(localStorage)
        .filter((key) => key.startsWith('sort_') || key.startsWith('sortv2_'))
        .forEach((key) => localStorage.removeItem(key));
      sessionStorage.clear();
      window.location.reload();
    };

    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#F9F3F0] text-[#00271D]">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#00A77C] border-t-transparent"></div>
          <p className="text-lg font-semibold tracking-wider animate-pulse">Restoring session...</p>
          <button
            type="button"
            onClick={handleRecovery}
            className="mt-6 px-4 py-2 rounded-xl border border-[#00A77C]/40 text-[#00A77C] text-xs font-bold hover:bg-[#00A77C]/10 transition-colors"
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

    // Reports newly covered by this verification (whole stream, matching the
    // optimistic update below). Already-verified members are excluded so a
    // repeat click never double-notifies a reporter.
    const newlyVerified = reports.filter(r =>
      !r.isVerified && (
        r.id === reportId ||
        (r.locationName.toLowerCase() === targetReport.locationName.toLowerCase() &&
          r.category === targetReport.category &&
          !isTerminalReport(r))
      )
    );

    // Optimistically mark as verified locally (no point calculations client-side)
    setReports(prev => prev.map(r => {
      if (r.id === reportId || (
        r.locationName.toLowerCase() === targetReport.locationName.toLowerCase() &&
        r.category === targetReport.category &&
        !isTerminalReport(r)
      )) {
        return { ...r, isVerified: true };
      }
      return r;
    }));

    // Send verification to server — server is the single source of truth for points
    apiService.verifyReport(reportId).then(async (result) => {
      // Only the first successful verification notifies the reporters.
      if (result && !result.alreadyProcessed) {
        addNotifications(buildVerifiedNotifications(newlyVerified));
      }
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
          setUsers((prev) => reconcileUsers(prev, serverUsers.map((u: any) => ({
            ...u,
            certificatesEarned: u.certificatesEarned || u.certificates || [],
          }))));
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
    // Skip terminal reports (completed, resolved, dismissed, expired): the
    // server rejects re-dispatching them and the UI must not optimistically
    // "unlock" a finished report either.
    if (!target || isTerminalReport(target)) return;

    // Collect stream members before updating state: notifications are a side
    // effect and must never run inside a setState updater (StrictMode would
    // invoke it twice and duplicate every alert).
    const streamMembers = reports.filter(r => isDispatchableStreamMember(r, target));
    const dispatchDrafts = buildDispatchNotifications(streamMembers, mrfName);

    // Optimistically update local state
    setReports(prev => prev.map(r => isDispatchableStreamMember(r, target) ? {
      ...r,
      isVerified: true,
      status: 'DISPATCHED' as ReportStatus,
      assignedMrfId: mrfId,
      assignedMrfName: mrfName
    } : r));

    // Approve first, then dispatch. The server rejects dispatch of an unverified
    // report, so this preserves the "verify before dispatch" guarantee.
    apiService.verifyReport(reportId)
      .then(() => apiService.updateReportStatus(reportId, {
        status: 'DISPATCHED',
        assignedMrfId: mrfId,
      }))
      .then(async () => {
        // Only notify reporters once the server has accepted the dispatch.
        addNotifications(dispatchDrafts);
        // Full refresh to get authoritative server state
        try {
          const serverReports = await apiService.getReports();
          if (serverReports && Array.isArray(serverReports)) {
            setReports(serverReports);
          }
        } catch (err) {
          console.warn('Sync after dispatch:', err);
        }
      })
      .catch(async (err) => {
        console.warn('Dispatch rejected by server:', err);
        // Reconcile local state so we never show a dispatch the server refused.
        try {
          const serverReports = await apiService.getReports();
          if (serverReports && Array.isArray(serverReports)) {
            setReports(serverReports);
          }
        } catch { /* ignore */ }
      });
  };

  const verifyReportsBatch = async (reportIds: string[]): Promise<void> => {
    const newlyVerified = reports.filter(r => reportIds.includes(r.id) && !r.isVerified);

    // Optimistically mark all as verified locally
    setReports(prev => prev.map(r => {
      if (reportIds.includes(r.id)) {
        return { ...r, isVerified: true };
      }
      return r;
    }));

    try {
      const result = await apiService.verifyReportsBatch(reportIds);
      if (result && result.summary && result.summary.totalProcessed > 0) {
        addNotifications(buildVerifiedNotifications(newlyVerified));
      }

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
        setUsers((prev) => reconcileUsers(prev, serverUsers.map((u: any) => ({
          ...u,
          certificatesEarned: u.certificatesEarned || u.certificates || [],
        }))));
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
      // currentUser is only read inside authenticated subtrees (AppShell gates
      // rendering on it). The public landing/login screens never read it.
      currentUser: currentUser as User,
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
