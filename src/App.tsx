import { lazy, Suspense, useEffect, useState } from 'react';
import { MockDataProvider, useMockData } from './hooks/useMockData';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { PublicLanding } from './pages/PublicLanding';
import { AdminLogin } from './pages/admin/AdminLogin';
import { MRFLogin } from './pages/mrf/MRFLogin';
import { StudentLayout } from './components/layout/StudentLayout';
import { ToastViewport } from './components/common/Toast';
import { LoadingScreen } from './components/common/LoadingScreen';
import { primeAtlasMapCache } from './hooks/useAtlasMap';
import { usePathRoute } from './hooks/usePathRoute';
import { PwaRuntime } from './pwa/PwaRuntime';

// Route-level code splitting: each role dashboard is loaded on demand so the
// public landing page never ships the admin/MRF bundles.
const StudentDashboard = lazy(() =>
  import('./pages/student/StudentDashboard').then((m) => ({ default: m.StudentDashboard }))
);
const TeacherDashboard = lazy(() =>
  import('./pages/teacher/TeacherDashboard').then((m) => ({ default: m.TeacherDashboard }))
);
const MRFDashboard = lazy(() =>
  import('./pages/mrf/MRFDashboardRoute').then((m) => ({ default: m.MRFDashboardRoute }))
);
const AdminDashboard = lazy(() =>
  import('./pages/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard }))
);
// Standalone printable report page opened in a new tab from the Reports hub.
const ReportPrintPage = lazy(() =>
  import('./pages/report-print/ReportPrintPage').then((m) => ({ default: m.ReportPrintPage }))
);

function RouteFallback() {
  // Loading gate (SMART master handoff Part 1 A4): branded, animated screen
  // instead of a blank page while the session or a role bundle hydrates.
  return <LoadingScreen />;
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
  const { route: currentRoute, navigate } = usePathRoute();

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
    if (currentRoute === 'report-print') {
      // Standalone print view: no dashboard chrome, opened in its own tab.
      return (
        <Suspense fallback={<RouteFallback />}>
          <ReportPrintPage />
        </Suspense>
      );
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
      return <AdminLogin onNavigate={navigate} />;
    case 'mrf-login':
      return <MRFLogin onNavigate={navigate} />;
    case 'report-print':
      // The page renders its own "session not found" guidance when signed out.
      return (
        <Suspense fallback={<RouteFallback />}>
          <ReportPrintPage />
        </Suspense>
      );
    default:
      return <PublicLanding onNavigate={navigate} />;
  }
}

function App() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    // The boundary wraps the data provider too: effect-time crashes inside the
    // provider (e.g. an unexpected storage failure) must surface the recovery
    // screen instead of unmounting the entire tree into a white page.
    <ErrorBoundary>
      <MockDataProvider>
        <AppShell activeTab={activeTab} setActiveTab={setActiveTab} />
        <PwaRuntime />
        <ToastViewport />
      </MockDataProvider>
    </ErrorBoundary>
  );
}

export default App;
