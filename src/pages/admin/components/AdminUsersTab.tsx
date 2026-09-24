import React, { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { User } from '../../../types';
import { useMockData } from '../../../hooks/useMockData';
import { useUserDirectory } from './users/useUserDirectory';
import { UsersHeader } from './users/UsersHeader';
import { UsersToolbar } from './users/UsersToolbar';
import { UsersTableView } from './users/UsersTableView';
import { UsersGroupedView } from './users/UsersGroupedView';
import { UserProfileInspectorModal } from './users/UserProfileInspectorModal';

interface AdminUsersTabProps {
  users: User[];
}

/**
 * User & Role Management: EnrollPro-synced directory with table/grouped views
 * and a read-only profile inspector. Sorting is owned by the DataTable column
 * headers (replaced the old sort-field select + direction toggle).
 */
export const AdminUsersTab: React.FC<AdminUsersTabProps> = ({ users }) => {
  const { currentUser } = useMockData();
  const directory = useUserDirectory(users);
  const [viewMode, setViewMode] = useState<'table' | 'grouped'>('table');
  const [inspectUser, setInspectUser] = useState<User | null>(null);

  if (currentUser?.role !== 'ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4 animate-fade-in">
        <div className="p-4 rounded-full bg-rose-50 border border-rose-200">
          <ShieldAlert size={40} className="text-rose-500" />
        </div>
        <h3 className="text-lg font-extrabold text-[var(--text-strong)]">Access Denied</h3>
        <p className="text-sm text-[var(--text-strong)]/50 text-center max-w-sm">
          User &amp; Role Management is restricted to System Administrators only. Your role (
          <strong>{currentUser?.role || 'Unknown'}</strong>) does not have permission to view this
          panel.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <UsersHeader
        accountCount={directory.enrollProUsers.length}
        isLoading={directory.isLoadingUsers}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      <UsersToolbar
        searchTerm={directory.searchTerm}
        onSearchChange={directory.setSearchTerm}
        selectedRole={directory.selectedRole}
        onRoleChange={directory.setSelectedRole}
        counts={directory.counts}
        statusFilter={directory.statusFilter}
        onStatusChange={directory.setStatusFilter}
        isLoading={directory.isLoadingUsers}
        shownCount={directory.processedUsers.length}
        totalCount={directory.enrollProUsers.length}
      />

      {viewMode === 'table' ? (
        <UsersTableView
          users={directory.processedUsers}
          loading={directory.isLoadingUsers}
          onInspect={setInspectUser}
        />
      ) : (
        <UsersGroupedView
          groups={directory.groupedUsers}
          selectedRole={directory.selectedRole}
          onInspect={setInspectUser}
        />
      )}

      {inspectUser && (
        <UserProfileInspectorModal user={inspectUser} onClose={() => setInspectUser(null)} />
      )}
    </div>
  );
};
