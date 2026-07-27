import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Report, BinStatus, Challenge, PointHistory, Offense, SystemSettings, CalendarEvent, SyncLog, Role, ReportStatus } from '../types';

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
  login: (employeeId: string, email: string) => boolean;
  logout: () => void;
  changeRole: (newRole: Role) => void;
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
  { id: '1', name: 'Clara Green', email: 'clara.g@campus.edu', employeeId: 'STU-2026-081', role: 'STUDENT', points: 850, warningsCount: 0, certificatesEarned: ['Recycling Sentinel'] },
  { id: '2', name: 'Prof. Marcus Thorne', email: 'm.thorne@campus.edu', employeeId: 'TEA-2026-012', role: 'TEACHER', points: 720, warningsCount: 0, certificatesEarned: ['Eco Educator', 'Clean Classroom Award'] },
  { id: '3', name: 'Leo Ramirez', email: 'leo.r@campus.edu', employeeId: 'STU-2026-104', role: 'STUDENT', points: 650, warningsCount: 1, certificatesEarned: [] },
  { id: '4', name: 'MRF Dispatch Team', email: 'mrf.operations@campus.edu', employeeId: 'MRF-2026-001', role: 'MRF', points: 0, warningsCount: 0, certificatesEarned: [] },
  { id: '5', name: 'EcoAdmin Chief', email: 'admin.sort@campus.edu', employeeId: 'ADM-2026-007', role: 'ADMIN', points: 0, warningsCount: 0, certificatesEarned: [] },
  { id: 'current', name: 'Alex Mercer', email: 'alex.mercer@campus.edu', employeeId: 'STU-2026-999', role: 'STUDENT', points: 340, warningsCount: 0, certificatesEarned: ['Initial Onboarder'] }
];

const DEFAULT_BINS: BinStatus[] = [
  { id: 'bin-1', name: 'Quad Courable Recycle Bin', locationName: 'Main Courtyard (Quad)', fillLevel: 85, type: 'RECYCLABLE', coordinates: { lat: 14.5995, lng: 120.9842 }, activeDispatch: false, lastEmptied: '2026-07-16 09:30' },
  { id: 'bin-2', name: 'Bio-Waste Collector B', locationName: 'Science Hall Cafeteria Side', fillLevel: 92, type: 'ORGANIC', coordinates: { lat: 14.6012, lng: 120.9856 }, activeDispatch: true, lastEmptied: '2026-07-17 14:15' },
  { id: 'bin-3', name: 'Chem Hazard Drum C', locationName: 'Chemistry Building Room 302 Entrance', fillLevel: 15, type: 'HAZARDOUS', coordinates: { lat: 14.5982, lng: 120.9830 }, activeDispatch: false, lastEmptied: '2026-07-10 11:00' },
  { id: 'bin-4', name: 'Lobby General Container', locationName: 'Main Library Lobby Entrance', fillLevel: 45, type: 'GENERAL', coordinates: { lat: 14.6001, lng: 120.9870 }, activeDispatch: false, lastEmptied: '2026-07-18 07:45' },
  { id: 'bin-5', name: 'Gym Recyclables Center', locationName: 'Sports Complex Entrance B', fillLevel: 60, type: 'RECYCLABLE', coordinates: { lat: 14.6025, lng: 120.9821 }, activeDispatch: false, lastEmptied: '2026-07-15 16:30' }
];

const DEFAULT_CHALLENGES: Challenge[] = [
  { id: 'ch-1', title: 'Eco Sentinel Campaign', description: 'Report 3 active waste overflows or bin issues across campus.', pointsAwarded: 150, target: 3, progress: 1, completed: false, iconName: 'AlertTriangle' },
  { id: 'ch-2', title: 'Hazard Spotter', description: 'Record at least 1 chemical or hazardous waste container that requires immediate attention.', pointsAwarded: 200, target: 1, progress: 0, completed: false, iconName: 'Flame' },
  { id: 'ch-3', title: 'MRF Supporter', description: 'Log a waste collection report that results in at least 25 kilograms of materials gathered.', pointsAwarded: 250, target: 25, progress: 10, completed: false, iconName: 'Scale' }
];

const DEFAULT_REPORTS: Report[] = [
  {
    id: 'rep-1',
    title: 'Recycling Bin Overflowing in Quad',
    description: 'The green recycling container is spilling plastic bottles all over the pavement near the bench.',
    status: 'PENDING',
    urgency: 'MEDIUM',
    category: 'RECYCLABLE',
    coordinates: { lat: 14.5995, lng: 120.9842 },
    locationName: 'Main Courtyard (Quad)',
    reporterId: 'current',
    reporterName: 'Alex Mercer',
    pointsAwarded: 50,
    timestamp: '2026-07-18 09:12'
  },
  {
    id: 'rep-2',
    title: 'Organic Food Waste Bin Nearing Limit',
    description: 'The cafeteria compost collector smells strongly and has surpassed the fill mark.',
    status: 'DISPATCHED',
    urgency: 'HIGH',
    category: 'ORGANIC',
    coordinates: { lat: 14.6012, lng: 120.9856 },
    locationName: 'Science Hall Cafeteria Side',
    reporterId: '3',
    reporterName: 'Leo Ramirez',
    pointsAwarded: 50,
    timestamp: '2026-07-17 11:34'
  },
  {
    id: 'rep-3',
    title: 'Safe disposal of Chem solvents',
    description: 'Empty bottles of chemical solvents left beside laboratory waste bins.',
    status: 'RESOLVED',
    urgency: 'HIGH',
    category: 'HAZARDOUS',
    coordinates: { lat: 14.5982, lng: 120.9830 },
    locationName: 'Chemistry Building Room 302 Entrance',
    reporterId: '2',
    reporterName: 'Prof. Marcus Thorne',
    pointsAwarded: 50,
    timestamp: '2026-07-16 15:40',
    weightCollected: 12
  }
];

const DEFAULT_CALENDAR: CalendarEvent[] = [
  { id: 'ev-1', title: 'Weekly Recyclables Dispatch', date: '2026-07-19', type: 'COLLECTION', description: 'Mass collections for plastic, cardboard and paper containers in academic buildings.' },
  { id: 'ev-2', title: 'Chemistry Lab Waste Audit', date: '2026-07-22', type: 'MAINTENANCE', description: 'MRF hazardous dispatch teams check all warning sensors and empty liquid storage containers.' },
  { id: 'ev-3', title: 'Campus Eco Clean-Up Drive', date: '2026-07-25', type: 'EVENT', description: 'Student volunteers and teachers gather to earn double rewards points by auditing student plazas.' }
];

const DEFAULT_HISTORY: PointHistory[] = [
  { id: 'h-1', userId: 'current', amount: 50, reason: 'Reported chemical solvent disposal issue', timestamp: '2026-07-15 14:02' },
  { id: 'h-2', userId: 'current', amount: 150, reason: 'Earned Recycle Shield Certificate', timestamp: '2026-07-16 10:15' },
  { id: 'h-3', userId: 'current', amount: 40, reason: 'Eco Quiz Participation points', timestamp: '2026-07-17 16:30' }
];

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
    function loadFromStorage<T>(key: string, defaultValue: T): T {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    }

    const loadedSettings = loadFromStorage('sort_settings', DEFAULT_SETTINGS);
    const loadedUsers = loadFromStorage('sort_users', DEFAULT_USERS);
    const loadedReports = loadFromStorage('sort_reports', DEFAULT_REPORTS);
    const loadedBins = loadFromStorage('sort_bins', DEFAULT_BINS);
    const loadedChallenges = loadFromStorage('sort_challenges', DEFAULT_CHALLENGES);
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

    // Set current user
    const curr = loadedUsers.find(u => u.id === 'current') || loadedUsers[5];
    setCurrentUser(curr);
  }, []);

  // Save to localStorage when state changes
  useEffect(() => {
    if (settings) localStorage.setItem('sort_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (users.length > 0) {
      localStorage.setItem('sort_users', JSON.stringify(users));
      const curr = users.find(u => u.id === 'current');
      if (curr) setCurrentUser(curr);
    }
  }, [users]);

  useEffect(() => {
    if (reports.length > 0) localStorage.setItem('sort_reports', JSON.stringify(reports));
  }, [reports]);

  useEffect(() => {
    if (bins.length > 0) localStorage.setItem('sort_bins', JSON.stringify(bins));
  }, [bins]);

  useEffect(() => {
    if (challenges.length > 0) localStorage.setItem('sort_challenges', JSON.stringify(challenges));
  }, [challenges]);

  useEffect(() => {
    if (pointHistory.length > 0) localStorage.setItem('sort_point_history', JSON.stringify(pointHistory));
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
  const login = (employeeId: string, email: string): boolean => {
    const matchedUser = users.find(u => 
      u.employeeId.toLowerCase() === employeeId.trim().toLowerCase() && 
      u.email.toLowerCase() === email.trim().toLowerCase()
    );
    
    if (matchedUser) {
      setUsers(prev => prev.map(u => u.id === 'current' ? {
        ...u,
        name: matchedUser.name,
        email: matchedUser.email,
        employeeId: matchedUser.employeeId,
        role: matchedUser.role,
        points: matchedUser.points,
        warningsCount: matchedUser.warningsCount,
        certificatesEarned: matchedUser.certificatesEarned,
        classroomSection: matchedUser.classroomSection
      } : u));
      
      setIsAuthenticated(true);
      localStorage.setItem('sort_auth', 'true');
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.setItem('sort_auth', 'false');
  };

  const changeRole = (newRole: Role) => {
    setUsers(prev => prev.map(u => u.id === 'current' ? { ...u, role: newRole } : u));
  };

  const createReport = (reportData: Omit<Report, 'id' | 'status' | 'reporterId' | 'reporterName' | 'pointsAwarded' | 'timestamp'>) => {
    const pointsAwarded = settings ? settings.pointsPerReport : 50;
    const newReport: Report = {
      ...reportData,
      id: `rep-${Date.now()}`,
      status: 'PENDING',
      reporterId: 'current',
      reporterName: currentUser?.name || 'Alex Mercer',
      pointsAwarded,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
    };

    setReports(prev => [newReport, ...prev]);

    // Reward points to current user
    setUsers(prev => prev.map(u => {
      if (u.id === 'current') {
        const newPoints = u.points + pointsAwarded;
        const certs = [...u.certificatesEarned];
        // Gamification certificate logic
        if (newPoints >= (settings?.certificatePointThreshold || 500) && !certs.includes('Green Ambassador')) {
          certs.push('Green Ambassador');
        }
        return { ...u, points: newPoints, certificatesEarned: certs };
      }
      return u;
    }));

    // Record point history
    const newHistory: PointHistory = {
      id: `h-${Date.now()}`,
      userId: 'current',
      amount: pointsAwarded,
      reason: `Submitted report: "${reportData.title}"`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
    };
    setPointHistory(prev => [newHistory, ...prev]);

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
      if (u.id === 'current') {
        return { ...u, points: u.points + amount };
      }
      return u;
    }));

    setPointHistory(prev => [
      {
        id: `h-challenge-${Date.now()}`,
        userId: 'current',
        amount,
        reason: `Completed challenge: "${challengeTitle}"`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
      },
      ...prev
    ]);
  };

  const updateReportStatus = (reportId: string, status: ReportStatus, weightCollected?: number) => {
    setReports(prev => prev.map(r => {
      if (r.id === reportId) {
        const updatedReport = { ...r, status, weightCollected: weightCollected ?? r.weightCollected };
        
        // If transitioning to COLLECTED/RESOLVED and weight was added, award additional points to reporter
        if ((status === 'COLLECTED' || status === 'RESOLVED') && weightCollected && r.category === 'RECYCLABLE') {
          const mult = settings?.pointsPerKgRecyclable || 10;
          const additionalPoints = Math.round(weightCollected * mult);
          
          setUsers(usersPrev => usersPrev.map(u => {
            if (u.id === r.reporterId) {
              const newPoints = u.points + additionalPoints;
              return { ...u, points: newPoints };
            }
            return u;
          }));

          setPointHistory(historyPrev => [
            {
              id: `h-weight-${Date.now()}`,
              userId: r.reporterId,
              amount: additionalPoints,
              reason: `MRF weighed recyclable payload: ${weightCollected}kg`,
              timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
            },
            ...historyPrev
          ]);
          
          // Increment "MRF Supporter" challenge progress if reporting user is active user
          if (r.reporterId === 'current') {
            setChallenges(challengesPrev => challengesPrev.map(c => {
              if (c.id === 'ch-3' && !c.completed) {
                const newProg = c.progress + weightCollected;
                const comp = newProg >= c.target;
                if (comp) {
                  setTimeout(() => addChallengeRewardPoints(c.pointsAwarded, c.title), 100);
                }
                return { ...c, progress: Math.min(newProg, c.target), completed: comp };
              }
              return c;
            }));
          }
        }
        
        return updatedReport;
      }
      return r;
    }));
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

    setSettings(DEFAULT_SETTINGS);
    setUsers(DEFAULT_USERS);
    setReports(DEFAULT_REPORTS);
    setBins(DEFAULT_BINS);
    setChallenges(DEFAULT_CHALLENGES);
    setPointHistory(DEFAULT_HISTORY);
    setOffenses([]);
    setCalendarEvents(DEFAULT_CALENDAR);
    setSyncLogs([]);
    
    setCurrentUser(DEFAULT_USERS[5]);
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
