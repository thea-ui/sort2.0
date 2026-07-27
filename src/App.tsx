import { useState } from 'react';
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
      return <StudentDashboard activeTab={activeTab} />;
    case 'TEACHER':
      return <TeacherDashboard activeTab={activeTab} setActiveTab={setActiveTab} />;
    case 'MRF':
      return <MRFDashboard activeTab={activeTab} />;
    case 'ADMIN':
      return <AdminDashboard activeTab={activeTab} />;
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

  if (isAuthenticated) {
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
