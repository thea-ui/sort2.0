import { useEffect, useState } from 'react';
import { MockDataProvider, useMockData } from './hooks/useMockData';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { StudentDashboard } from './pages/student/StudentDashboard';
import { TeacherDashboard } from './pages/teacher/TeacherDashboard';
import { MRFDashboard } from './pages/mrf/MRFDashboard';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { PublicLanding } from './pages/PublicLanding';
import { AdminLogin } from './pages/admin/AdminLogin';
import { MRFLogin } from './pages/mrf/MRFLogin';

function DashboardContent({ activeTab, setActiveTab }: { activeTab: string; setActiveTab: (tab: string) => void }) {
  const { currentUser } = useMockData();

  switch (currentUser.role) {
    case 'STUDENT':
      return <StudentDashboard activeTab={activeTab} setActiveTab={setActiveTab} />;
    case 'TEACHER':
      return <TeacherDashboard activeTab={activeTab} setActiveTab={setActiveTab} />;
    case 'MRF':
      return <MRFDashboard activeTab={activeTab} setActiveTab={setActiveTab} />;
    case 'ADMIN':
      return <AdminDashboard activeTab={activeTab} setActiveTab={setActiveTab} />;
    default:
      return (
        <div className="glass-panel p-6 rounded-2xl border border-red-500/20 text-red-400 font-bold text-center animate-pulse">
          Unauthorized Access: User role is undefined or unrecognized.
        </div>
      );
  }
}

import { StudentLayout } from './components/layout/StudentLayout';

function AppShell({ activeTab, setActiveTab }: { activeTab: string; setActiveTab: (tab: string) => void }) {
  const { isAuthenticated, currentUser } = useMockData();
  const [currentRoute, setCurrentRoute] = useState<'landing' | 'admin-login' | 'mrf-login'>('landing');

  // Automatically scroll to top of window on login, navigation, or tab changes
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [isAuthenticated, activeTab, currentRoute, currentUser?.role]);

  if (isAuthenticated) {
    if (!currentUser) {
      // Authenticated but user data not yet loaded — show a brief loading state
      return (
        <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-emerald-400">
          <div className="flex flex-col items-center space-y-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
            <p className="text-lg font-semibold tracking-wider animate-pulse">Restoring session...</p>
          </div>
        </div>
      );
    }
    if (currentUser?.role === 'STUDENT' || currentUser?.role === 'TEACHER') {
      return (
        <StudentLayout activeTab={activeTab} setActiveTab={setActiveTab}>
          <DashboardContent activeTab={activeTab} setActiveTab={setActiveTab} />
        </StudentLayout>
      );
    }

    return (
      <DashboardLayout activeTab={activeTab} setActiveTab={setActiveTab}>
        <DashboardContent activeTab={activeTab} setActiveTab={setActiveTab} />
      </DashboardLayout>
    );
  }

  switch (currentRoute) {
    case 'admin-login':
      return <AdminLogin onNavigate={(route) => setCurrentRoute(route as any)} />;
    case 'mrf-login':
      return <MRFLogin onNavigate={(route) => setCurrentRoute(route as any)} />;
    default:
      return <PublicLanding onNavigate={(route) => setCurrentRoute(route as any)} />;
  }
}

function App() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <MockDataProvider>
      <AppShell activeTab={activeTab} setActiveTab={setActiveTab} />
    </MockDataProvider>
  );
}

export default App;
