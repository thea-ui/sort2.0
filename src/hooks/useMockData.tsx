import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Report, BinStatus, Challenge, PointHistory, Offense, SystemSettings, CalendarEvent, SyncLog, Role, ReportStatus } from '../types';
import { apiService } from '../services/api';

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
  isAuthenticated: boolean;
  
  // Actions
  login: (employeeId: string, email: string) => Promise<boolean>;
  logout: () => void;
  changeRole: (newRole: Role) => void;
  verifyReport: (reportId: string) => void;
  dispatchReport: (reportId: string, mrfId: string, mrfName: string) => void;
  createReport: (reportData: Omit<Report, 'id' | 'status' | 'reporterId' | 'reporterName' | 'pointsAwarded' | 'timestamp'>) => Report;
  updateReportStatus: (reportId: string, status: ReportStatus, weightCollected?: number) => void;
  updateBinLevel: (binId: string, fillLevel: number) => void;
  toggleBinDispatch: (binId: string) => void;
  triggerSync: (system: string) => void;
  completeChallenge: (challengeId: string) => void;
  updateSettings: (newSettings: Partial<SystemSettings>) => void;
  resetDatabase: () => void;
  addOffense: (userId: string, description: string, severity: 'WARNING' | 'STRIKE' | 'SUSPENSION') => void;
  deductPoints: (userId: string, amount: number) => void;
  claimCertificate: (certName: string) => void;
}

const MockDataContext = createContext<MockDataContextType | undefined>(undefined);

// Initial Seed Data
const DEFAULT_SETTINGS: SystemSettings = {
  pointsPerReport: 50,
  pointsPerKgRecyclable: 10,
  warningThreshold: 3,
  certificatePointThreshold: 500,
  quarterGateActive: true,
};

const DEFAULT_USERS: User[] = [
  { id: '1', name: 'Alex Rivera', email: 'student1@sort.edu', employeeId: 'STU-2026-001', role: 'STUDENT', points: 0, warningsCount: 0, classroomSection: 'BSIT-3A', certificatesEarned: [] },
  { id: '2', name: 'Beatriz Santos', email: 'student2@sort.edu', employeeId: 'STU-2026-002', role: 'STUDENT', points: 0, warningsCount: 0, classroomSection: 'BSIT-3B', certificatesEarned: [] },
  { id: '3', name: 'Carlos Mendoza', email: 'student3@sort.edu', employeeId: 'STU-2026-003', role: 'STUDENT', points: 0, warningsCount: 0, classroomSection: 'BSIT-3A', certificatesEarned: [] },
  { id: '4', name: 'Prof. Eleanor Vance', email: 'teacher1@sort.edu', employeeId: 'TCH-2026-001', role: 'TEACHER', points: 500, warningsCount: 0, classroomSection: 'BSIT-3A', certificatesEarned: ['Green Educator Award', 'Sustainability Advisor'] },
  { id: '5', name: 'System Administrator', email: 'admin@sort.edu', employeeId: 'ADM-2026-001', role: 'ADMIN', points: 1000, warningsCount: 0, certificatesEarned: ['System Master Admin'] },
  { id: '6', name: 'Marcus Vance', email: 'mrf1@sort.edu', employeeId: 'MRF-2026-001', role: 'MRF', points: 450, warningsCount: 0, certificatesEarned: ['MRF Logistics Specialist'] },
  { id: '7', name: 'Sarah Connor', email: 'mrf2@sort.edu', employeeId: 'MRF-2026-002', role: 'MRF', points: 420, warningsCount: 0, certificatesEarned: ['MRF Dispatch Operator'] }
];

const DEFAULT_BINS: BinStatus[] = [
  // ── Station 1: Main Courtyard (Quad) ──
  { id: 'bin-1a', name: 'Bio Bin – Quad', locationName: 'Main Courtyard (Quad)', fillLevel: 72, type: 'BIODEGRADABLE', coordinates: { lat: 14.5995, lng: 120.9842 }, activeDispatch: false, lastEmptied: '2026-07-18 08:00' },
  { id: 'bin-1b', name: 'Non-Bio Bin – Quad', locationName: 'Main Courtyard (Quad)', fillLevel: 85, type: 'NON_BIODEGRADABLE', coordinates: { lat: 14.5995, lng: 120.9842 }, activeDispatch: false, lastEmptied: '2026-07-18 08:00' },
  { id: 'bin-1c', name: 'Recycle Bin – Quad', locationName: 'Main Courtyard (Quad)', fillLevel: 40, type: 'RECYCLABLE', coordinates: { lat: 14.5995, lng: 120.9842 }, activeDispatch: false, lastEmptied: '2026-07-18 08:00' },
  // ── Station 2: Science Hall Cafeteria Side ──
  { id: 'bin-2a', name: 'Bio Bin – Science Hall', locationName: 'Science Hall Cafeteria Side', fillLevel: 92, type: 'BIODEGRADABLE', coordinates: { lat: 14.6012, lng: 120.9856 }, activeDispatch: true, lastEmptied: '2026-07-17 14:15' },
  { id: 'bin-2b', name: 'Non-Bio Bin – Science Hall', locationName: 'Science Hall Cafeteria Side', fillLevel: 60, type: 'NON_BIODEGRADABLE', coordinates: { lat: 14.6012, lng: 120.9856 }, activeDispatch: false, lastEmptied: '2026-07-17 14:15' },
  { id: 'bin-2c', name: 'Recycle Bin – Science Hall', locationName: 'Science Hall Cafeteria Side', fillLevel: 30, type: 'RECYCLABLE', coordinates: { lat: 14.6012, lng: 120.9856 }, activeDispatch: false, lastEmptied: '2026-07-17 14:15' },
  // ── Station 3: Chemistry Building Entrance ──
  { id: 'bin-3a', name: 'Bio Bin – Chem Bldg', locationName: 'Chemistry Building Entrance', fillLevel: 15, type: 'BIODEGRADABLE', coordinates: { lat: 14.5982, lng: 120.9830 }, activeDispatch: false, lastEmptied: '2026-07-16 11:00' },
  { id: 'bin-3b', name: 'Non-Bio Bin – Chem Bldg', locationName: 'Chemistry Building Entrance', fillLevel: 20, type: 'NON_BIODEGRADABLE', coordinates: { lat: 14.5982, lng: 120.9830 }, activeDispatch: false, lastEmptied: '2026-07-16 11:00' },
  { id: 'bin-3c', name: 'Recycle Bin – Chem Bldg', locationName: 'Chemistry Building Entrance', fillLevel: 10, type: 'RECYCLABLE', coordinates: { lat: 14.5982, lng: 120.9830 }, activeDispatch: false, lastEmptied: '2026-07-16 11:00' },
  // ── Station 4: Main Library Lobby ──
  { id: 'bin-4a', name: 'Bio Bin – Library', locationName: 'Main Library Lobby Entrance', fillLevel: 45, type: 'BIODEGRADABLE', coordinates: { lat: 14.6001, lng: 120.9870 }, activeDispatch: false, lastEmptied: '2026-07-18 07:45' },
  { id: 'bin-4b', name: 'Non-Bio Bin – Library', locationName: 'Main Library Lobby Entrance', fillLevel: 88, type: 'NON_BIODEGRADABLE', coordinates: { lat: 14.6001, lng: 120.9870 }, activeDispatch: false, lastEmptied: '2026-07-18 07:45' },
  { id: 'bin-4c', name: 'Recycle Bin – Library', locationName: 'Main Library Lobby Entrance', fillLevel: 55, type: 'RECYCLABLE', coordinates: { lat: 14.6001, lng: 120.9870 }, activeDispatch: false, lastEmptied: '2026-07-18 07:45' },
  // ── Station 5: Sports Complex Entrance ──
  { id: 'bin-5a', name: 'Bio Bin – Sports Complex', locationName: 'Sports Complex Entrance B', fillLevel: 60, type: 'BIODEGRADABLE', coordinates: { lat: 14.6025, lng: 120.9821 }, activeDispatch: false, lastEmptied: '2026-07-15 16:30' },
  { id: 'bin-5b', name: 'Non-Bio Bin – Sports Complex', locationName: 'Sports Complex Entrance B', fillLevel: 35, type: 'NON_BIODEGRADABLE', coordinates: { lat: 14.6025, lng: 120.9821 }, activeDispatch: false, lastEmptied: '2026-07-15 16:30' },
  { id: 'bin-5c', name: 'Recycle Bin – Sports Complex', locationName: 'Sports Complex Entrance B', fillLevel: 90, type: 'RECYCLABLE', coordinates: { lat: 14.6025, lng: 120.9821 }, activeDispatch: true, lastEmptied: '2026-07-15 16:30' },
];


const DEFAULT_CHALLENGES: Challenge[] = [
  { id: 'ch-1', title: 'Eco Sentinel Campaign', description: 'Report 3 active waste overflows or bin issues across campus.', pointsAwarded: 150, target: 3, progress: 0, completed: false, iconName: 'AlertTriangle' },
  { id: 'ch-2', title: 'Hazard Spotter', description: 'Record at least 1 chemical or hazardous waste container that requires immediate attention.', pointsAwarded: 200, target: 1, progress: 0, completed: false, iconName: 'Flame' },
  { id: 'ch-3', title: 'MRF Supporter', description: 'Log a waste collection report that results in at least 25 kilograms of materials gathered.', pointsAwarded: 250, target: 25, progress: 0, completed: false, iconName: 'Scale' }
];

const DEFAULT_REPORTS: Report[] = [];

const DEFAULT_CALENDAR: CalendarEvent[] = [
  { id: 'ev-1', title: 'Weekly Recyclables Dispatch', date: '2026-07-19', type: 'COLLECTION', description: 'Mass collections for plastic, cardboard and paper containers in academic buildings.' },
  { id: 'ev-2', title: 'Chemistry Lab Waste Audit', date: '2026-07-22', type: 'MAINTENANCE', description: 'MRF hazardous dispatch teams check all warning sensors and empty liquid storage containers.' },
  { id: 'ev-3', title: 'Campus Eco Clean-Up Drive', date: '2026-07-25', type: 'EVENT', description: 'Student volunteers and teachers gather to earn double rewards points by auditing student plazas.' }
];

const DEFAULT_HISTORY: PointHistory[] = [];

export const MockDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [bins, setBins] = useState<BinStatus[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [pointHistory, setPointHistory] = useState<PointHistory[]>([]);
  const [offenses, setOffenses] = useState<Offense[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('sort_auth') === 'true';
  });

  // Load database from localStorage or initialize with defaults
  useEffect(() => {
    // Invalidate stale localStorage cache to clear duplicate entries & reset challenge progress
    const cacheVersion = localStorage.getItem('sort_v10_fresh_wipe');
    if (cacheVersion !== 'true') {
      localStorage.removeItem('sort_users');
      localStorage.removeItem('sort_reports');
      localStorage.removeItem('sort_point_history');
      localStorage.removeItem('sort_challenges');
      localStorage.removeItem('sort_bins');
      localStorage.setItem('sort_v10_fresh_wipe', 'true');
    }

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

    if (loadedUsers.length < 3) {
      loadedUsers = DEFAULT_USERS;
      localStorage.setItem('sort_users', JSON.stringify(DEFAULT_USERS));
    }

    const loadedReports = loadFromStorage('sort_reports', DEFAULT_REPORTS);
    const loadedBins = loadFromStorage('sort_bins', DEFAULT_BINS);
    let loadedChallenges = loadFromStorage('sort_challenges', DEFAULT_CHALLENGES);

    // Force challenges to 0 progress for testing
    if (loadedChallenges.some((c: Challenge) => c.progress > 0 || c.completed)) {
      loadedChallenges = DEFAULT_CHALLENGES;
      localStorage.setItem('sort_challenges', JSON.stringify(DEFAULT_CHALLENGES));
    }
    const loadedPointHistory = loadFromStorage('sort_point_history', DEFAULT_HISTORY);
    const loadedOffenses = loadFromStorage('sort_offenses', [] as Offense[]);
    const loadedCalendar = loadFromStorage('sort_calendar', DEFAULT_CALENDAR);
    const loadedSyncLogs = loadFromStorage('sort_sync_logs', [] as SyncLog[]);

    setSettings(loadedSettings);
    setUsers(loadedUsers);
    setReports(loadedReports);
    setBins(loadedBins);
    setChallenges(loadedChallenges);
    setPointHistory(loadedPointHistory);
    setOffenses(loadedOffenses);
    setCalendarEvents(loadedCalendar);
    setSyncLogs(loadedSyncLogs);

    // Set current user based on tab-specific sessionStorage role if available
    const savedTabRole = sessionStorage.getItem('sort_tab_role') as Role | null;
    const initialUser = savedTabRole
      ? loadedUsers.find((u: User) => u.role === savedTabRole) || loadedUsers[0]
      : loadedUsers.find((u: User) => u.email === 'student1@sort.edu') || loadedUsers[0];

    setCurrentUser(initialUser);
  }, []);

  // Check backend session on mount if token exists
  useEffect(() => {
    const token = localStorage.getItem('sortv2_token');
    if (token) {
      apiService.getCurrentUser()
        .then(({ user }) => {
          if (user) {
            const loggedUser: User = {
              ...user,
              certificatesEarned: user.certificatesEarned || (user as any).certificates || [],
            };
            setCurrentUser(loggedUser);
            setIsAuthenticated(true);
            localStorage.setItem('sort_auth', 'true');
          }
        })
        .catch(() => {
          // Token expired or invalid
        });
    }
  }, []);

  // Real-Time Cross-Browser & Multi-Account API Polling (Chrome <-> Brave sync)
  useEffect(() => {
    const syncBackendData = async () => {
      try {
        const serverReports = await apiService.getReports();
        if (serverReports && Array.isArray(serverReports)) {
          setReports(prev => {
            if (serverReports.length === 0) return [];
            
            // Server reports are authoritative
            const result = [...serverReports];

            // Retain any pending local optimistic reports not yet returned by backend
            prev.forEach(pr => {
              const matchesServer = result.some(sr =>
                sr.id === pr.id ||
                (sr.locationName.toLowerCase() === pr.locationName.toLowerCase() &&
                 sr.category === pr.category &&
                 sr.reporterId === pr.reporterId)
              );
              if (!matchesServer) {
                result.unshift(pr);
              }
            });

            return result;
          });
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
        if (e.key === 'sort_reports') setReports(JSON.parse(e.newValue));
        if (e.key === 'sort_users') setUsers(JSON.parse(e.newValue));
        if (e.key === 'sort_bins') setBins(JSON.parse(e.newValue));
        if (e.key === 'sort_point_history') setPointHistory(JSON.parse(e.newValue));
        if (e.key === 'sort_challenges') setChallenges(JSON.parse(e.newValue));
      } catch (err) {
        console.warn('Cross-session sync notice:', err);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Save to localStorage when state changes
  useEffect(() => {
    if (settings) localStorage.setItem('sort_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (users.length > 0) {
      localStorage.setItem('sort_users', JSON.stringify(users));
    }
  }, [users]);

  useEffect(() => {
    localStorage.setItem('sort_reports', JSON.stringify(reports));
  }, [reports]);

  useEffect(() => {
    if (bins.length > 0) localStorage.setItem('sort_bins', JSON.stringify(bins));
  }, [bins]);

  useEffect(() => {
    if (challenges.length > 0) localStorage.setItem('sort_challenges', JSON.stringify(challenges));
  }, [challenges]);

  useEffect(() => {
    localStorage.setItem('sort_point_history', JSON.stringify(pointHistory));
  }, [pointHistory]);

  useEffect(() => {
    if (offenses.length > 0) localStorage.setItem('sort_offenses', JSON.stringify(offenses));
  }, [offenses]);

  useEffect(() => {
    if (calendarEvents.length > 0) localStorage.setItem('sort_calendar', JSON.stringify(calendarEvents));
  }, [calendarEvents]);

  useEffect(() => {
    if (syncLogs.length > 0) localStorage.setItem('sort_sync_logs', JSON.stringify(syncLogs));
  }, [syncLogs]);

  // Actions
  const login = async (employeeId: string, email: string): Promise<boolean> => {
    try {
      // 1. Authenticate against real PostgreSQL Express API
      const res = await apiService.login(email, employeeId);
      if (res && res.token && res.user) {
        localStorage.setItem('sortv2_token', res.token);
        const loggedUser: User = {
          ...res.user,
          certificatesEarned: res.user.certificatesEarned || (res.user as any).certificates || [],
        };
        
        setCurrentUser(loggedUser);
        setUsers(prev => prev.map(u => u.email.toLowerCase() === loggedUser.email.toLowerCase() ? loggedUser : u));
        setIsAuthenticated(true);
        localStorage.setItem('sort_auth', 'true');
        return true;
      }
    } catch (err) {
      console.warn('Backend API authentication notice:', err);
    }

    // 2. Fallback to local user match if server offline
    const matchedUser = users.find(u => 
      (u.employeeId.toLowerCase() === employeeId.trim().toLowerCase() || employeeId.trim().length > 0) && 
      u.email.toLowerCase() === email.trim().toLowerCase()
    );
    
    if (matchedUser) {
      setCurrentUser(matchedUser);
      setIsAuthenticated(true);
      localStorage.setItem('sort_auth', 'true');
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem('sortv2_token');
    setIsAuthenticated(false);
    localStorage.setItem('sort_auth', 'false');
  };

  const changeRole = (newRole: Role) => {
    sessionStorage.setItem('sort_tab_role', newRole);
    const targetUser = users.find(u => u.role === newRole) || (currentUser ? { ...currentUser, role: newRole } : null);
    if (targetUser) {
      setCurrentUser(targetUser);
    }
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
      pointsAwarded: 0, // Points deferred until MRF resolution
      reporterRank: calculatedRank,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
    };

    setReports(prev => [newReport, ...prev]);

    // Persist new report to PostgreSQL Express API
    apiService.createReport({
      title: newReport.title,
      description: newReport.description,
      category: newReport.category,
      urgency: newReport.urgency,
      locationName: newReport.locationName,
      coordinates: newReport.coordinates,
      reporterId: currentUserId,
      imageUrl: newReport.imageUrl,
    }).then(serverRes => {
      if (serverRes && serverRes.id) {
        setReports(prev => prev.map(r => r.id === newReport.id ? { ...r, id: serverRes.id } : r));
      }
    }).catch(err => {
      console.warn('PostgreSQL database create report notice:', err);
    });

    // Update challenges progress (Eco Sentinel)
    setChallenges(prev => prev.map(c => {
      if (c.id === 'ch-1' && !c.completed) {
        const newProg = c.progress + 1;
        const comp = newProg >= c.target;
        if (comp) {
          setTimeout(() => addChallengeRewardPoints(c.pointsAwarded, c.title), 100);
        }
        return { ...c, progress: Math.min(newProg, c.target), completed: comp };
      }
      if (c.id === 'ch-2' && reportData.category === 'HAZARDOUS' && !c.completed) {
        setTimeout(() => addChallengeRewardPoints(c.pointsAwarded, c.title), 100);
        return { ...c, progress: 1, completed: true };
      }
      return c;
    }));

    // If report points out a specific bin, update its fill level as a simulation of overflow
    const matchedBin = bins.find(b => b.locationName === reportData.locationName);
    if (matchedBin) {
      updateBinLevel(matchedBin.id, 95); // set to near overflow
    }

    return newReport;
  };

  const addChallengeRewardPoints = (amount: number, challengeTitle: string) => {
    setUsers(prev => prev.map(u => {
      if (u.id === 'current' || u.id === currentUser?.id) {
        return { ...u, points: u.points + amount };
      }
      return u;
    }));

    setPointHistory(prev => [
      {
        id: `h-challenge-${Date.now()}`,
        userId: currentUser?.id || 'current',
        amount,
        reason: `Completed challenge: "${challengeTitle}"`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
      },
      ...prev
    ]);
  };

  const updateReportStatus = (reportId: string, status: ReportStatus, weightCollected?: number) => {
    // Locate target report to determine location & category
    const targetReport = reports.find(r => r.id === reportId);

    setReports(prev => {
      if (!targetReport) return prev;

      const isFinal = status === 'COLLECTED' || status === 'RESOLVED';
      
      // If marking as final done, resolve all related reports for that bin/location & category
      if (isFinal) {
        // Find all reports in cluster sorted by creation time
        const cluster = prev.filter(r => 
          r.locationName.toLowerCase() === targetReport.locationName.toLowerCase() &&
          r.category === targetReport.category
        ).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        const rankPointsMap = [15, 10, 5]; // 1st = 15, 2nd = 10, 3rd = 5

        const updatedClusterIds = new Set(cluster.map(c => c.id));

        const updatedReports = prev.map(r => {
          if (updatedClusterIds.has(r.id)) {
            const rankIndex = cluster.findIndex(c => c.id === r.id);
            const rank = rankIndex + 1;
            const pts = rankIndex < 3 ? rankPointsMap[rankIndex] : 0;

            // Only award points if not awarded previously
            if (r.pointsAwarded === 0 && pts > 0) {
              // Award points to user
              setUsers(usersPrev => usersPrev.map(u => {
                if (u.id === r.reporterId || (r.reporterId === 'current' && (u.id === 'current' || u.id === currentUser?.id))) {
                  return { ...u, points: u.points + pts };
                }
                return u;
              }));

              // Record point history
              const rankLabel = rank === 1 ? '1st' : rank === 2 ? '2nd' : '3rd';
              setPointHistory(historyPrev => [
                {
                  id: `h-rank-${Date.now()}-${r.id}`,
                  userId: r.reporterId,
                  amount: pts,
                  reason: `MRF Resolution: ${rankLabel} Reporter bonus (+${pts} pts) for ${r.locationName}`,
                  timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
                },
                ...historyPrev
              ]);
            }

            return {
              ...r,
              status,
              weightCollected: weightCollected ?? r.weightCollected,
              pointsAwarded: r.pointsAwarded > 0 ? r.pointsAwarded : pts,
              reporterRank: rank
            };
          }
          return r;
        });

        return updatedReports;
      }

      // Non-final status update (e.g. DISPATCHED)
      return prev.map(r => r.id === reportId ? { ...r, status, weightCollected: weightCollected ?? r.weightCollected } : r);
    });

    // Persist status update to PostgreSQL Express backend
    apiService.updateReportStatus(reportId, {
      status,
      weightCollected,
      isVerified: true
    }).then(async () => {
      // If status is RESOLVED or COLLECTED, fetch updated user points from backend
      if (status === 'COLLECTED' || status === 'RESOLVED') {
        try {
          const serverUsers = await apiService.getUsers();
          if (serverUsers && Array.isArray(serverUsers)) {
            setUsers(prev => prev.map(u => {
              const matched = serverUsers.find(su => su.id === u.id || su.email.toLowerCase() === u.email.toLowerCase());
              return matched ? { ...u, points: matched.points } : u;
            }));
          }
        } catch (err) {
          console.warn('Sync updated user points notice:', err);
        }
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

  const completeChallenge = (challengeId: string) => {
    setChallenges(prev => prev.map(c => {
      if (c.id === challengeId && !c.completed) {
        addChallengeRewardPoints(c.pointsAwarded, c.title);
        return { ...c, progress: c.target, completed: true };
      }
      return c;
    }));
  };

  const updateSettings = (newSettings: Partial<SystemSettings>) => {
    setSettings(prev => prev ? { ...prev, ...newSettings } : null);
  };

  const addOffense = (userId: string, description: string, severity: 'WARNING' | 'STRIKE' | 'SUSPENSION') => {
    const newOffense: Offense = {
      id: `off-${Date.now()}`,
      userId,
      userName: users.find(u => u.id === userId)?.name || 'Unknown User',
      description,
      severity,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    setOffenses(prev => [newOffense, ...prev]);

    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        return { ...u, warningsCount: u.warningsCount + (severity === 'WARNING' || severity === 'STRIKE' ? 1 : 0) };
      }
      return u;
    }));
  };

  const deductPoints = (userId: string, amount: number) => {
    setUsers(prev => prev.map(u => {
      if (u.id === userId || (userId === 'current' && u.id === 'current')) {
        return { ...u, points: Math.max(0, u.points - amount) };
      }
      return u;
    }));
  };

  const claimCertificate = (certName: string) => {
    setUsers(prev => prev.map(u => {
      if (u.id === 'current') {
        const certs = [...u.certificatesEarned];
        if (!certs.includes(certName)) {
          certs.push(certName);
        }
        return { ...u, certificatesEarned: certs };
      }
      return u;
    }));
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
    setChallenges(DEFAULT_CHALLENGES.map(c => ({ ...c, progress: 0, completed: false })));
    setPointHistory([]);
    setOffenses([]);
    setCalendarEvents(DEFAULT_CALENDAR);
    setSyncLogs([]);
    
    // Call Express API to purge backend database tables
    apiService.purgeDatabase().catch(err => {
      console.warn('Backend purge API notice:', err);
    });
  };

  if (!currentUser || !settings) {
    // Prevent rendering until local storage is read and initialized
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-emerald-400">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
          <p className="text-lg font-semibold tracking-wider animate-pulse">Initializing S.O.R.T. Database...</p>
        </div>
      </div>
    );
  }

  const verifyReport = (reportId: string) => {
    setReports(prev => prev.map(r => r.id === reportId ? { ...r, isVerified: true, status: 'DISPATCHED' } : r));
    apiService.updateReportStatus(reportId, { isVerified: true, status: 'DISPATCHED' }).catch(() => {});
  };

  const dispatchReport = (reportId: string, mrfId: string, mrfName: string) => {
    const target = reports.find(r => r.id === reportId);
    setReports(prev => prev.map(r => {
      const isMatch = r.id === reportId || (target && r.locationName.toLowerCase() === target.locationName.toLowerCase() && r.category === target.category);
      if (isMatch) {
        apiService.updateReportStatus(r.id, { isVerified: true, status: 'DISPATCHED', assignedMrfId: mrfId }).catch(() => {});
        return {
          ...r,
          isVerified: true,
          status: 'DISPATCHED',
          assignedMrfId: mrfId,
          assignedMrfName: mrfName
        };
      }
      return r;
    }));
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
      isAuthenticated,
      login,
      logout,
      changeRole,
      verifyReport,
      dispatchReport,
      createReport,
      updateReportStatus,
      updateBinLevel,
      toggleBinDispatch,
      triggerSync,
      completeChallenge,
      updateSettings,
      resetDatabase,
      addOffense,
      deductPoints,
      claimCertificate
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
