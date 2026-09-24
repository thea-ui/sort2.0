import React from 'react';
import { useMockData } from '../../hooks/useMockData';
import { AdminReportsTab } from './components/AdminReportsTab';
import { AdminRewardsTab } from './components/AdminRewardsTab';
import { AdminImpactTab } from './components/AdminImpactTab';
import { AdminLeaderboardTab } from './components/AdminLeaderboardTab';
import { AdminCollectionsTab } from './components/AdminCollectionsTab';
import { AdminBinMapTab } from './components/AdminBinMapTab';
import { AdminSettingsTab } from './components/AdminSettingsTab';
import { AdminCampusNewsTab } from './components/AdminCampusNewsTab';
import { AdminUsersTab } from './components/AdminUsersTab';
import { AdminAuditLogsTab } from './components/AdminAuditLogsTab';
import { AdminLedgerPage } from './components/AdminLedgerPage';
import { AdminOverviewTab } from './components/overview/AdminOverviewTab';
import { AdminWarningsTab } from './components/warnings/AdminWarningsTab';
import { AdminSyncLogsTab } from './components/sync/AdminSyncLogsTab';
import { SETTINGS_SUBITEMS } from '../../components/layout/DashboardLayout';
import { useToast } from '../../hooks/useToast';

export interface AdminDashboardProps {
  activeTab: string;
  setActiveTab?: (tab: string) => void;
}

/**
 * Admin console shell. Views live in dedicated modules:
 * overview/AdminOverviewTab, warnings/AdminWarningsTab, sync/AdminSyncLogsTab,
 * plus the per-domain tabs under components/.
 */
export const AdminDashboard: React.FC<AdminDashboardProps> = ({ activeTab, setActiveTab }) => {
  const {
    users,
    reports,
    bins,
    offenses,
    settings,
    syncLogs,
    updateSettings,
    resetDatabase,
    addOffense,
    deductPoints,
    triggerSync,
    verifyReport,
    verifyReportsBatch,
    dispatchReport,
    updateReportStatus,
  } = useMockData();

  const toast = useToast();
  const showAdminToast = (msg: string) => toast.success(msg);

  return (
    <div className="space-y-6">
      {/* OVERVIEW / ANALYTICS DASHBOARD VIEW FOR ADMIN */}
      {(activeTab === 'overview' || activeTab === 'admin-analytics') && (
        <AdminOverviewTab
          reports={reports}
          users={users}
          onNavigate={(tab) => setActiveTab?.(tab)}
        />
      )}

      {/* OPERATIONAL ANALYTICS / IMPACT TAB */}
      {activeTab === 'admin-impact' && (
        <AdminImpactTab
          reports={reports}
          users={users}
          onNavigate={(tab) => setActiveTab?.(tab)}
        />
      )}

      {/* LEADERBOARD TAB */}
      {activeTab === 'admin-leaderboard' && <AdminLeaderboardTab users={users} reports={reports} />}

      {/* ALL REPORTS MANAGEMENT VIEW */}
      {activeTab === 'admin-reports' && (
        <AdminReportsTab
          reports={reports}
          users={users}
          settings={settings}
          verifyReport={verifyReport}
          verifyReportsBatch={verifyReportsBatch}
          dispatchReport={dispatchReport}
          updateReportStatus={updateReportStatus}
          addOffense={addOffense}
          deductPoints={deductPoints}
        />
      )}

      {/* COLLECTIONS MANAGEMENT TAB */}
      {activeTab === 'admin-collections' && (
        <AdminCollectionsTab reports={reports} users={users} settings={settings} />
      )}

      {/* REWARDS & PRIZE CLAIMS TAB */}
      {activeTab === 'admin-rewards' && <AdminRewardsTab showToast={showAdminToast} />}

      {/* BIN MAP MANAGEMENT TAB */}
      {activeTab === 'admin-bin-map' && <AdminBinMapTab bins={bins} reports={reports} />}

      {/* CAMPUS NEWS TAB */}
      {activeTab === 'admin-campus-news' && <AdminCampusNewsTab />}

      {/* SCHOOL YEAR LEDGER + MANAGEMENT */}
      {activeTab === 'admin-ledger' && <AdminLedgerPage showToast={showAdminToast} />}

      {/* USER ACCOUNTS & ROLE MANAGEMENT */}
      {activeTab === 'admin-users' && <AdminUsersTab users={users} />}

      {activeTab === 'admin-audit-logs' && <AdminAuditLogsTab />}

      {/* WARNINGS & OFFENSES */}
      {activeTab === 'admin-warnings' && (
        <AdminWarningsTab users={users} offenses={offenses} addOffense={addOffense} />
      )}

      {/* SYSTEM CONFIGS & SETTINGS TABS */}
      {(activeTab === 'admin-settings' || SETTINGS_SUBITEMS.some((sub) => sub.id === activeTab)) && (
        <AdminSettingsTab
          subTab={activeTab === 'admin-settings' ? 'locations' : activeTab}
          settings={settings}
          updateSettings={updateSettings}
          resetDatabase={resetDatabase}
        />
      )}

      {/* SYNC LOGS VIEW */}
      {activeTab === 'admin-sync' && (
        <AdminSyncLogsTab syncLogs={syncLogs} onTriggerSync={() => triggerSync('MAIN_SERVER')} />
      )}
    </div>
  );
};
