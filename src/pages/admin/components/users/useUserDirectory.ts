import { useEffect, useMemo, useState } from 'react';
import { Role, User } from '../../../../types';
import { ROLE_CONFIG, ROLE_ORDER } from './userRoleConfig';

export type UserStatusFilter = 'ACTIVE' | 'ARCHIVED' | 'ALL';

export interface UserRoleGroup {
  role: Role;
  config: (typeof ROLE_CONFIG)[Role];
  list: User[];
}

/**
 * Directory state for the Users tab: EnrollPro-only filtering, role counts,
 * search, status scope, and role-grouped view data.
 */
export function useUserDirectory(users: User[]) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<UserStatusFilter>('ACTIVE');

  // The user list arrives asynchronously, so the first paint used to show
  // "0 Registered Accounts" / "No user accounts found" before data landed.
  const [hasLoadedUsers, setHasLoadedUsers] = useState(users.length > 0);
  useEffect(() => {
    if (users.length > 0) setHasLoadedUsers(true);
  }, [users.length]);

  // Strict guardrail: only EnrollPro-synced accounts are displayed. Graduated/
  // archived accounts cannot sign in, so "Active" is the default view.
  const enrollProUsers = useMemo(
    () =>
      users.filter((u: any) => {
        if (u.syncSource !== 'ENROLLPRO') return false;
        if (statusFilter === 'ALL') return true;
        const isArchived = Boolean(u.archivedAt);
        return statusFilter === 'ARCHIVED' ? isArchived : !isArchived;
      }),
    [users, statusFilter],
  );

  const counts = useMemo(
    () => ({
      ALL: enrollProUsers.length,
      ADMIN: enrollProUsers.filter((u) => u.role === 'ADMIN').length,
      MRF: enrollProUsers.filter((u) => u.role === 'MRF').length,
      TEACHER: enrollProUsers.filter((u) => u.role === 'TEACHER').length,
      STUDENT: enrollProUsers.filter((u) => u.role === 'STUDENT').length,
    }),
    [enrollProUsers],
  );

  // Base ordering is the system role hierarchy (Admin → MRF → Faculty →
  // Student); column headers in the table can re-sort on top of this.
  const processedUsers = useMemo(() => {
    return enrollProUsers
      .filter((u) => {
        const matchesRole = selectedRole === 'ALL' || u.role === selectedRole;
        const query = searchTerm.toLowerCase().trim();
        const matchesSearch =
          !query ||
          u.name.toLowerCase().includes(query) ||
          u.email.toLowerCase().includes(query) ||
          u.employeeId.toLowerCase().includes(query) ||
          (u.classroomSection && u.classroomSection.toLowerCase().includes(query)) ||
          ((u as any).gradeLevel && (u as any).gradeLevel.toLowerCase().includes(query)) ||
          ((u as any).sectionName && (u as any).sectionName.toLowerCase().includes(query));
        return matchesRole && matchesSearch;
      })
      .sort(
        (a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || a.name.localeCompare(b.name),
      );
  }, [enrollProUsers, selectedRole, searchTerm]);

  const groupedUsers: UserRoleGroup[] = useMemo(() => {
    const rolesOrder: Role[] = ['ADMIN', 'MRF', 'TEACHER', 'STUDENT'];
    return rolesOrder.map((role) => ({
      role,
      config: ROLE_CONFIG[role],
      list: processedUsers.filter((u) => u.role === role),
    }));
  }, [processedUsers]);

  return {
    searchTerm,
    setSearchTerm,
    selectedRole,
    setSelectedRole,
    statusFilter,
    setStatusFilter,
    enrollProUsers,
    counts,
    processedUsers,
    groupedUsers,
    isLoadingUsers: !hasLoadedUsers,
  };
}
