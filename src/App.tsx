import { lazy, Suspense, useEffect, useState } from 'react';
import { MockDataProvider, useMockData } from './hooks/useMockData';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { PublicLanding } from './pages/PublicLanding';
import { AdminLogin } from './pages/admin/AdminLogin';
import { MRFLogin } from './pages/mrf/MRFLogin';
import { StudentLayout } from './components/layout/StudentLayout';
import { primeAtlasMapCache } from './hooks/useAtlasMap';

// Route-level code splitting: each role dashboard is loaded on demand so the
// public landing page never ships the admin/MRF bundles.
const StudentDashboard = lazy(() =>
  import('./pages/student/StudentDashboard').then((m) => ({ default: m.StudentDashboard }))
);
const TeacherDashboard = lazy(() =>
  import('./pages/teacher/TeacherDashboard').then((m) => ({ default: m.TeacherDashboard }))
);
const MRFDashboard = lazy(() =>
  import('./pages/mrf/MRFDashboard').then((m) => ({ default: m.MRFDashboard }))
);
const AdminDashboard = lazy(() =>
  import('./pages/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard }))
);

function RouteFallback() {
  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center bg-[var(--background)] text-[var(--text-strong)]">
      <div className="flex flex-col items-center space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--accent)] border-t-transparent"></div>
        <p className="text-sm font-semibold tracking-wide">Loading workspace...</p>
      </div>
    </div>
  );
}

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

function AppShell({ activeTab, setActiveTab }: { activeTab: string; setActiveTab: (tab: string) => void }) {
  const { isAuthenticated, currentUser } = useMockData();
  const [currentRoute, setCurrentRoute] = useState<'landing' | 'admin-login' | 'mrf-login'>('landing');

  // Automatically scroll to top of window on login, navigation, or tab changes
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [isAuthenticated, activeTab, currentRoute, currentUser?.role]);

  // Warm the ATLAS mirror cache right after sign-in so map pages open with the
  // real base map instead of flashing the fallback layer.
  useEffect(() => {
    if (isAuthenticated) primeAtlasMapCache();
  }, [isAuthenticated]);

  if (isAuthenticated) {
    if (!currentUser) {
      // Authenticated but user data not yet loaded — show a brief loading state
      return <RouteFallback />;
    }
    if (currentUser?.role === 'STUDENT' || currentUser?.role === 'TEACHER') {
      return (
        <StudentLayout activeTab={activeTab} setActiveTab={setActiveTab}>
          <Suspense fallback={<RouteFallback />}>
            <DashboardContent activeTab={activeTab} setActiveTab={setActiveTab} />
          </Suspense>
        </StudentLayout>
      );
    }

    return (
      <DashboardLayout activeTab={activeTab} setActiveTab={setActiveTab}>
        <Suspense fallback={<RouteFallback />}>
          <DashboardContent activeTab={activeTab} setActiveTab={setActiveTab} />
        </Suspense>
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
      <ErrorBoundary>
        <AppShell activeTab={activeTab} setActiveTab={setActiveTab} />
      </ErrorBoundary>
    </MockDataProvider>
  );
}

export default App;
