import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  ShieldCheck,
  Truck,
  GraduationCap,
  Building2,
  Search,
  ArrowUpDown,
  Filter,
  Grid,
  List,
  Eye,
  X,
  Sparkles,
  BadgeAlert,
  ShieldAlert,
  Mail,
  Hash,
  Award,
  CheckCircle2,
  Lock,
  BookOpen,
  ClipboardList,
  Crown,
  Wrench,
  AlertTriangle,
} from 'lucide-react';
import { User, Role } from '../../../types';
import { useMockData } from '../../../hooks/useMockData';

interface AdminUsersTabProps {
  users: User[];
}

const ROLE_ORDER: Record<Role, number> = {
  ADMIN: 1,
  MRF: 2,
  TEACHER: 3,
  STUDENT: 4,
};

const ROLE_CONFIG: Record<
  Role,
  { label: string; bg: string; border: string; text: string; icon: React.ElementType; badgeBg: string; accent: string; gradient: string }
> = {
  ADMIN: {
    label: 'Administrator',
    bg: 'bg-[var(--gold)]/10',
    border: 'border-[var(--gold)]/30',
    text: 'text-[var(--gold)]',
    icon: ShieldCheck,
    badgeBg: 'bg-[var(--gold)]/10 text-[var(--gold)] border-[var(--gold)]/25',
    accent: 'text-[var(--gold)]',
    gradient: 'from-[var(--gold)] to-[var(--gold)]',
  },
  MRF: {
    label: 'MRF Logistics',
    bg: 'bg-[var(--primary)]/10',
    border: 'border-[var(--primary)]/30',
    text: 'text-[var(--text-strong)]',
    icon: Truck,
    badgeBg: 'bg-[var(--primary)]/10 text-[var(--text-strong)] border-[var(--primary)]/25',
    accent: 'text-[var(--text-strong)]',
    gradient: 'from-[var(--primary)] to-[var(--primary)]',
  },
  TEACHER: {
    label: 'Faculty Advisor',
    bg: 'bg-[var(--gold)]/10',
    border: 'border-[var(--gold)]/30',
    text: 'text-[var(--gold)]',
    icon: Building2,
    badgeBg: 'bg-[var(--gold)]/10 text-[var(--gold)] border-[var(--gold)]/25',
    accent: 'text-[var(--gold)]',
    gradient: 'from-[var(--gold)] to-[var(--gold)]',
  },
  STUDENT: {
    label: 'Student Eco-Rep',
    bg: 'bg-[var(--accent)]/10',
    border: 'border-[var(--accent)]/30',
    text: 'text-[var(--accent)]',
    icon: GraduationCap,
    badgeBg: 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/20',
    accent: 'text-[var(--accent)]',
    gradient: 'from-[var(--accent)] to-[var(--accent-darker)]',
  },
};

const ROLE_PERMISSIONS: Record<Role, { title: string; icon: React.ElementType; items: string[] }> = {
  ADMIN: {
    title: 'System Access',
    icon: Crown,
    items: ['Full system configuration', 'User & role management', 'Audit log review', 'Platform-wide analytics'],
  },
  MRF: {
    title: 'Operations Access',
    icon: Wrench,
    items: ['Collection dispatch', 'Waste bin monitoring', 'Route management', 'Weight logging'],
  },
  TEACHER: {
    title: 'Faculty Access',
    icon: BookOpen,
    items: ['Class section oversight', 'Student report review', 'Program participation', 'Achievement tracking'],
  },
  STUDENT: {
    title: 'Eco-Rep Access',
    icon: ClipboardList,
    items: ['Submit waste reports', 'Earn eco-points', 'Claim certificates', 'View leaderboard rank'],
  },
};

type SortField = 'role' | 'name' | 'points' | 'warnings' | 'email';
type SortDirection = 'asc' | 'desc';
type ViewMode = 'table' | 'grouped';

export const AdminUsersTab: React.FC<AdminUsersTabProps> = ({
  users,
}) => {
  const { currentUser } = useMockData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role | 'ALL'>('ALL');
  const [sortField, setSortField] = useState<SortField>('role');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  // The user list arrives asynchronously, so the first paint used to show
  // "0 Registered Accounts" / "No user accounts found" before data landed.
  // Track whether we have ever received accounts and show a loading state
  // instead of a misleading empty state.
  const [hasLoadedUsers, setHasLoadedUsers] = useState(users.length > 0);
  useEffect(() => {
    if (users.length > 0) setHasLoadedUsers(true);
  }, [users.length]);
  const isLoadingUsers = !hasLoadedUsers;

  const [inspectUser, setInspectUser] = useState<User | null>(null);

  // Graduated/archived accounts cannot sign in, so they must not inflate the
  // active counts. "Active" is the default view; staff can switch filters.
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'ARCHIVED' | 'ALL'>('ACTIVE');

  // Strict guardrail: Only EnrollPro-synced accounts are displayed
  const enrollProUsers = useMemo(() => {
    return users.filter((u: any) => {
      if (u.syncSource !== 'ENROLLPRO') return false;
      if (statusFilter === 'ALL') return true;
      const isArchived = Boolean(u.archivedAt);
      return statusFilter === 'ARCHIVED' ? isArchived : !isArchived;
    });
  }, [users, statusFilter]);

  // Role Counts — EnrollPro-synced accounts only
  const counts = useMemo(() => {
    return {
      ALL: enrollProUsers.length,
      ADMIN: enrollProUsers.filter((u) => u.role === 'ADMIN').length,
      MRF: enrollProUsers.filter((u) => u.role === 'MRF').length,
      TEACHER: enrollProUsers.filter((u) => u.role === 'TEACHER').length,
      STUDENT: enrollProUsers.filter((u) => u.role === 'STUDENT').length,
    };
  }, [enrollProUsers]);

  // Filter and Sort Users — EnrollPro-synced accounts only
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
      .sort((a, b) => {
        let comparison = 0;
        if (sortField === 'role') {
          comparison = ROLE_ORDER[a.role] - ROLE_ORDER[b.role];
          if (comparison === 0) {
            comparison = a.name.localeCompare(b.name);
          }
        } else if (sortField === 'name') {
          comparison = a.name.localeCompare(b.name);
        } else if (sortField === 'points') {
          comparison = b.points - a.points;
        } else if (sortField === 'warnings') {
          comparison = b.warningsCount - a.warningsCount;
        } else if (sortField === 'email') {
          comparison = a.email.localeCompare(b.email);
        }

        return sortDirection === 'asc' ? comparison : -comparison;
      });
  }, [enrollProUsers, selectedRole, searchTerm, sortField, sortDirection]);

  // Grouped Users by Role (for Grouped View)
  const groupedUsers = useMemo(() => {
    const rolesOrder: Role[] = ['ADMIN', 'MRF', 'TEACHER', 'STUDENT'];
    return rolesOrder.map((role) => ({
      role,
      config: ROLE_CONFIG[role],
      list: processedUsers.filter((u) => u.role === role),
    }));
  }, [processedUsers]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Admin-only access guard */}
      {currentUser?.role !== 'ADMIN' && (
        <div className="flex flex-col items-center justify-center py-20 space-y-4 animate-fade-in">
          <div className="p-4 rounded-full bg-rose-50 border border-rose-200">
            <ShieldAlert size={40} className="text-rose-500" />
          </div>
          <h3 className="text-lg font-extrabold text-[var(--text-strong)]">Access Denied</h3>
          <p className="text-sm text-[var(--text-strong)]/50 text-center max-w-sm">
            User & Role Management is restricted to System Administrators only. Your role (<strong>{currentUser?.role || 'Unknown'}</strong>) does not have permission to view this panel.
          </p>
        </div>
      )}

      {currentUser?.role === 'ADMIN' && (
      <>
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-[var(--accent)] bg-[var(--accent)]/10 border border-[var(--accent)]/20 px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
              <Sparkles size={11} />
              Role Database Audit
            </span>
            <span className="text-[10px] font-bold text-[var(--gold)] bg-[var(--gold)]/10 border border-[var(--gold)]/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
              {isLoadingUsers ? 'Loading accounts…' : `${enrollProUsers.length} Registered Accounts`}
            </span>
          </div>
          <h2 className="text-2xl font-extrabold text-[var(--text-strong)] tracking-tight mt-1.5 flex items-center gap-2">
            <Users className="text-[var(--accent)]" size={26} />
            User & Role Management
          </h2>
          <p className="text-xs text-[var(--text-strong)]/60 mt-0.5">
            Audit user accounts sorted by system role hierarchy (Admin → MRF → Faculty → Student).
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 bg-white/80 border border-white/80 p-1 rounded-2xl shadow-sm self-start md:self-auto">
          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              viewMode === 'table'
                ? 'bg-[var(--primary)] text-white shadow'
                : 'text-[var(--text-strong)]/60 hover:text-[var(--text-strong)] hover:bg-white/60'
            }`}
          >
            <List size={14} />
            Table View
          </button>
          <button
            onClick={() => setViewMode('grouped')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              viewMode === 'grouped'
                ? 'bg-[var(--primary)] text-white shadow'
                : 'text-[var(--text-strong)]/60 hover:text-[var(--text-strong)] hover:bg-white/60'
            }`}
          >
            <Grid size={14} />
            Grouped by Role
          </button>
        </div>
      </div>

      {/* TOOLBAR: ROLE FILTER, SEARCH & SORT CONTROLS */}
      <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl shadow-sm overflow-hidden">
        {/* Role segmented filter */}
        <div className="flex flex-wrap items-center gap-1.5 p-3 border-b border-[var(--primary)]/5">
          <span className="text-[11px] font-bold text-[var(--text-strong)]/40 uppercase tracking-wider px-1.5 mr-1">Role:</span>
          {([
            { key: 'ALL' as const, label: 'All Accounts', count: counts.ALL, Icon: Users },
            { key: 'ADMIN' as const, label: 'Admins', count: counts.ADMIN, Icon: ShieldCheck },
            { key: 'MRF' as const, label: 'MRF Logistics', count: counts.MRF, Icon: Truck },
            { key: 'TEACHER' as const, label: 'Faculty', count: counts.TEACHER, Icon: Building2 },
            { key: 'STUDENT' as const, label: 'Students', count: counts.STUDENT, Icon: GraduationCap },
          ]).map(({ key, label, count, Icon }) => {
            const active = selectedRole === key;
            return (
              <button
                key={key}
                onClick={() => setSelectedRole(key)}
                aria-pressed={active}
                className={`flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full text-xs font-bold border transition-all ${
                  active
                    ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-sm'
                    : 'bg-[var(--background)] text-[var(--text-strong)]/60 border-transparent hover:text-[var(--text-strong)] hover:border-[var(--accent)]/30'
                }`}
              >
                <Icon size={14} className={active ? 'text-[var(--accent)]' : 'text-[var(--text-strong)]/40'} />
                {label}
                <span
                  className={`text-[10px] font-black min-w-[20px] text-center px-1.5 py-0.5 rounded-full ${
                    active ? 'bg-white/15 text-white' : 'bg-white text-[var(--text-strong)]/50'
                  }`}
                >
                  {isLoadingUsers ? '—' : count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & sort controls */}
        <div className="p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-3 text-[var(--text-strong)]/40" />
            <input
              type="text"
              placeholder="Search by user name, email, employee ID, section..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[var(--background)] border border-[var(--primary)]/10 rounded-xl pl-10 pr-4 py-2 text-xs text-[var(--text-strong)] placeholder-[var(--primary)]/40 outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2.5 text-[var(--text-strong)]/40 hover:text-[var(--text-strong)]"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Sort Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Account status filter — archived accounts are graduated and cannot sign in */}
            <div className="flex items-center gap-1.5 bg-[var(--background)] px-3 py-1.5 rounded-xl border border-[var(--primary)]/10">
              <Filter size={13} className="text-[var(--text-strong)]/50" />
              <span className="text-[11px] font-bold text-[var(--text-strong)]/60 uppercase">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'ACTIVE' | 'ARCHIVED' | 'ALL')}
                className="bg-transparent text-xs font-extrabold text-[var(--text-strong)] outline-none cursor-pointer"
              >
                <option value="ACTIVE">Active</option>
                <option value="ARCHIVED">Archived</option>
                <option value="ALL">All</option>
              </select>
            </div>

            {/* Sort By Field */}
            <div className="flex items-center gap-1.5 bg-[var(--background)] px-3 py-1.5 rounded-xl border border-[var(--primary)]/10">
              <ArrowUpDown size={13} className="text-[var(--text-strong)]/50" />
              <span className="text-[11px] font-bold text-[var(--text-strong)]/60 uppercase">Sort:</span>
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortField)}
                className="bg-transparent text-xs font-extrabold text-[var(--text-strong)] outline-none cursor-pointer"
              >
                <option value="role">Role Hierarchy (Admin → Student)</option>
                <option value="name">Name (A-Z)</option>
                <option value="points">Eco-Points (High → Low)</option>
                <option value="warnings">Warnings Count</option>
                <option value="email">Email Address</option>
              </select>
            </div>

            {/* Sort Direction Toggle */}
            <button
              onClick={() => setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
              className="px-3 py-1.5 bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 hover:bg-[var(--accent)]/20 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
              title="Toggle Ascending / Descending"
            >
              {sortDirection === 'asc' ? 'ASC ↑' : 'DESC ↓'}
            </button>
          </div>
        </div>
      </div>

      {/* RESULTS SUMMARY */}
      <div className="flex items-center justify-between text-xs text-[var(--text-strong)]/50 px-1">
        <span>
          Showing <strong className="text-[var(--text-strong)]">{processedUsers.length}</strong> of{' '}
          <strong className="text-[var(--text-strong)]">{enrollProUsers.length}</strong> users
          {selectedRole !== 'ALL' && <span> (Filtered by role: <strong>{selectedRole}</strong>)</span>}
        </span>
        <span>Sorted by <strong className="text-[var(--text-strong)]">{sortField.toUpperCase()}</strong> ({sortDirection.toUpperCase()})</span>
      </div>

      {/* VIEW MODE 1: TABLE VIEW */}
      {viewMode === 'table' && (
        <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--primary)]/8 text-[var(--text-strong)]/50 font-extrabold uppercase tracking-wider bg-[var(--accent)]/5">
                  <th
                    onClick={() => toggleSort('name')}
                    className="py-3.5 px-4 cursor-pointer hover:text-[var(--text-strong)]"
                  >
                    User Name {sortField === 'name' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th
                    onClick={() => toggleSort('role')}
                    className="py-3.5 px-4 cursor-pointer hover:text-[var(--text-strong)]"
                  >
                    Role & Type {sortField === 'role' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th
                    onClick={() => toggleSort('email')}
                    className="py-3.5 px-4 cursor-pointer hover:text-[var(--text-strong)]"
                  >
                    Contact & Employee ID {sortField === 'email' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="py-3.5 px-4">Section / Dept</th>
                  <th
                    onClick={() => toggleSort('warnings')}
                    className="py-3.5 px-4 text-center cursor-pointer hover:text-[var(--text-strong)]"
                  >
                    Warnings {sortField === 'warnings' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th
                    onClick={() => toggleSort('points')}
                    className="py-3.5 px-4 text-right cursor-pointer hover:text-[var(--text-strong)]"
                  >
                    Points {sortField === 'points' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="py-3.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--primary)]/5">
                {processedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[var(--text-strong)]/40 font-medium">
                      {isLoadingUsers ? 'Loading user accounts…' : 'No user accounts found matching your filter criteria.'}
                    </td>
                  </tr>
                ) : (
                  processedUsers.map((u) => {
                    const roleCfg = ROLE_CONFIG[u.role];
                    const IconComponent = roleCfg.icon;

                    return (
                      <tr key={u.id} className="hover:bg-[var(--accent)]/5 transition-colors">
                        {/* Name & Avatar */}
                        <td className="py-3.5 px-4 font-bold text-[var(--text-strong)]">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full ${roleCfg.bg} ${roleCfg.text} font-black flex items-center justify-center text-xs shrink-0 border ${roleCfg.border}`}>
                              {u.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-extrabold text-[var(--text-strong)] leading-tight">{u.name}</p>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border inline-flex items-center gap-1.5 ${roleCfg.badgeBg}`}>
                            <IconComponent size={12} />
                            {u.role}
                          </span>
                          {u.role === 'STUDENT' && u.portalAccountActive === false && (
                            <span className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <AlertTriangle size={10} />
                              Not login-ready
                            </span>
                          )}
                        </td>

                        {/* Email & ID */}
                        <td className="py-3.5 px-4">
                          <div className="font-mono text-[11px] text-[var(--text-strong)]/70">{u.email}</div>
                          <div className="font-mono text-[10px] text-[var(--text-strong)]/40 mt-0.5">{u.employeeId}</div>
                        </td>

                        {/* Grade Level / Section */}
                        <td className="py-3.5 px-4 text-[var(--text-strong)]/70">
                          {(u as any).gradeLevel ? (
                            <span className="px-2 py-0.5 bg-gray-100 border border-gray-200 rounded-md text-[10px] font-bold text-gray-700">
                              {(u as any).gradeLevel} — {(u as any).sectionName || '—'}
                            </span>
                          ) : u.classroomSection ? (
                            <span className="px-2 py-0.5 bg-gray-100 border border-gray-200 rounded-md text-[10px] font-bold text-gray-700">
                              {u.classroomSection}
                            </span>
                          ) : (
                            <span className="text-[var(--text-strong)]/30 italic text-[11px]">—</span>
                          )}
                        </td>

                        {/* Warnings */}
                        <td className="py-3.5 px-4 text-center">
                          {u.warningsCount > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-50 text-rose-600 border border-rose-200">
                              <BadgeAlert size={12} />
                              {u.warningsCount}
                            </span>
                          ) : (
                            <span className="text-[var(--text-strong)]/30 font-medium text-[11px]">0</span>
                          )}
                        </td>

                        {/* Points */}
                        <td className="py-3.5 px-4 text-right font-black text-xs">
                          {u.role === 'STUDENT' ? (
                            <span className="text-[var(--accent)]">{u.points.toLocaleString()} pts</span>
                          ) : (
                            <span className="text-[var(--text-strong)]/30 italic font-medium">—</span>
                          )}
                        </td>

                        {/* Action */}
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => setInspectUser(u)}
                            className="p-1.5 text-[var(--text-strong)]/60 hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 rounded-xl transition-all"
                            title="Inspect User Profile"
                          >
                            <Eye size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: GROUPED BY ROLE */}
      {viewMode === 'grouped' && (
        <div className="space-y-6">
          {groupedUsers.map((group) => {
            if (selectedRole !== 'ALL' && group.role !== selectedRole) return null;
            const IconComponent = group.config.icon;

            return (
              <div
                key={group.role}
                className="bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl p-5 shadow-sm space-y-4"
              >
                {/* Role Section Header */}
                <div className="flex items-center justify-between border-b border-[var(--primary)]/5 pb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-2xl ${group.config.bg} ${group.config.text} border ${group.config.border}`}>
                      <IconComponent size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-[var(--text-strong)]">
                        {group.config.label}s ({group.role})
                      </h3>
                      <p className="text-xs text-[var(--text-strong)]/40 font-medium">
                        {group.list.length} accounts found
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-black uppercase border ${group.config.badgeBg}`}>
                    Priority Rank #{ROLE_ORDER[group.role]}
                  </span>
                </div>

                {/* Grid of Users in this Role */}
                {group.list.length === 0 ? (
                  <p className="text-xs text-[var(--text-strong)]/40 italic py-4">No users match this role query.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {group.list.map((u) => (
                      <div
                        key={u.id}
                        className="p-4 bg-[var(--background)] border border-[var(--primary)]/5 rounded-2xl flex flex-col justify-between space-y-3 hover:border-[var(--accent)]/30 transition-all"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-9 h-9 rounded-full ${group.config.bg} ${group.config.text} font-black flex items-center justify-center text-xs shrink-0 border ${group.config.border}`}>
                              {u.name.charAt(0)}
                            </div>
                            <div>
                              <h4 className="text-xs font-extrabold text-[var(--text-strong)]">{u.name}</h4>
                              <p className="text-[10px] font-mono text-[var(--text-strong)]/50">{u.email}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => setInspectUser(u)}
                            className="p-1 text-[var(--text-strong)]/40 hover:text-[var(--accent)] rounded-lg"
                          >
                            <Eye size={15} />
                          </button>
                        </div>

                        <div className="flex items-center justify-between text-[11px] pt-2 border-t border-[var(--primary)]/5">
                          <span className="font-mono text-[var(--text-strong)]/50 text-[10px]">{u.employeeId}</span>
                          <div className="flex items-center gap-2">
                            {u.role === 'STUDENT' && u.portalAccountActive === false && (
                              <span className="inline-flex items-center gap-0.5 text-amber-700 font-extrabold text-[10px] bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                                <AlertTriangle size={10} /> Not login-ready
                              </span>
                            )}
                            {u.warningsCount > 0 && (
                              <span className="text-rose-600 font-extrabold text-[10px] flex items-center gap-0.5 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-full">
                                <BadgeAlert size={10} /> {u.warningsCount}
                              </span>
                            )}
                            {u.role === 'STUDENT' && (
                              <span className="font-black text-[var(--accent)]">{u.points.toLocaleString()} pts</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* USER PROFILE INSPECTOR MODAL (Read-Only, Role-Personalized) */}
      {inspectUser && (() => {
        const rc = ROLE_CONFIG[inspectUser.role];
        const RpIcon = rc.icon;
        const perms = ROLE_PERMISSIONS[inspectUser.role];
        const PermIcon = perms.icon;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md animate-fade-in">
            <div className="bg-white border border-white/80 rounded-3xl max-w-lg w-full shadow-2xl animate-scale-up relative overflow-hidden">
              {/* Close Button */}
              <button
                onClick={() => setInspectUser(null)}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[var(--primary)]/5 hover:bg-[var(--primary)]/10 text-[var(--text-strong)] flex items-center justify-center transition-all cursor-pointer z-10"
              >
                <X size={16} />
              </button>

              <div className="px-6 sm:px-7 pt-6 pb-6 sm:pb-7 space-y-5">
                {/* Avatar & Identity */}
                <div className="flex items-center gap-4">
                  <div className={`w-[68px] h-[68px] rounded-full bg-white ${rc.text} font-black flex items-center justify-center text-2xl shrink-0 border-4 border-white shadow-lg ring-2 ${rc.border}`}>
                    {inspectUser.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xl font-heading font-black text-[var(--text-strong)] truncate">{inspectUser.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`rounded-full font-black uppercase text-[10px] tracking-wider px-3 py-1 ${rc.badgeBg}`}>
                        {rc.label}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[var(--accent)] bg-[var(--accent)]/10 border border-[var(--accent)]/20 px-2 py-1 rounded-full">
                        <CheckCircle2 size={10} />
                        EnrollPro
                      </span>
                    </div>
                  </div>
                </div>

                {/* Key Stats Grid — Role-Personalized */}
                <div className="grid grid-cols-3 gap-2.5">
                  {/* Stat 1: Role-specific primary metric */}
                  <div className="bg-[var(--background)] rounded-2xl p-3 border border-[var(--primary)]/5 text-center space-y-1">
                    <div className="flex items-center justify-center">
                      {inspectUser.role === 'STUDENT' ? (
                        <Sparkles size={15} className="text-[var(--accent)]" />
                      ) : inspectUser.role === 'ADMIN' ? (
                        <Crown size={15} className="text-[var(--gold)]" />
                      ) : inspectUser.role === 'TEACHER' ? (
                        <BookOpen size={15} className="text-[var(--gold)]" />
                      ) : (
                        <Truck size={15} className="text-[var(--text-strong)]" />
                      )}
                    </div>
                    {inspectUser.role === 'STUDENT' ? (
                      <p className="text-lg font-black text-[var(--accent)]">{inspectUser.points.toLocaleString()}</p>
                    ) : inspectUser.role === 'ADMIN' ? (
                      <p className="text-sm font-black text-[var(--gold)]">L4</p>
                    ) : inspectUser.role === 'TEACHER' ? (
                      <p className="text-sm font-black text-[var(--gold)]">Faculty</p>
                    ) : (
                      <p className="text-sm font-black text-[var(--text-strong)]">Ops</p>
                    )}
                    <p className="text-[10px] font-bold text-[var(--text-strong)]/50 uppercase tracking-wider">
                      {inspectUser.role === 'STUDENT' ? 'Eco-Points' : inspectUser.role === 'ADMIN' ? 'Clearance' : inspectUser.role === 'TEACHER' ? 'Division' : 'Team'}
                    </p>
                  </div>

                  {/* Stat 2: Warning Status */}
                  <div className="bg-[var(--background)] rounded-2xl p-3 border border-[var(--primary)]/5 text-center space-y-1">
                    <div className="flex items-center justify-center">
                      {inspectUser.warningsCount > 0 ? (
                        <BadgeAlert size={15} className="text-rose-600" />
                      ) : (
                        <ShieldCheck size={15} className="text-emerald-600" />
                      )}
                    </div>
                    {inspectUser.warningsCount > 0 ? (
                      <p className="text-lg font-black text-rose-600">{inspectUser.warningsCount}</p>
                    ) : (
                      <p className="text-sm font-black text-emerald-600">Clean</p>
                    )}
                    <p className="text-[10px] font-bold text-[var(--text-strong)]/50 uppercase tracking-wider">
                      {inspectUser.warningsCount > 0 ? 'Warnings' : 'Record'}
                    </p>
                  </div>

                  {/* Stat 3: Account Status */}
                  <div className="bg-[var(--background)] rounded-2xl p-3 border border-[var(--primary)]/5 text-center space-y-1">
                    <div className="flex items-center justify-center">
                      <span className={`w-2.5 h-2.5 rounded-full animate-pulse shadow-sm ${inspectUser.accountStatus === 'SUSPENDED' ? 'bg-rose-500 shadow-rose-300' : 'bg-emerald-500 shadow-emerald-300'}`} />
                    </div>
                    <p className={`text-sm font-black ${inspectUser.accountStatus === 'SUSPENDED' ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {inspectUser.accountStatus === 'SUSPENDED' ? 'Suspended' : 'Active'}
                    </p>
                    <p className="text-[10px] font-bold text-[var(--text-strong)]/50 uppercase tracking-wider">Status</p>
                  </div>
                </div>

                {/* Detailed Information */}
                <div className="space-y-2.5">
                  <h4 className="text-[11px] font-extrabold text-[var(--text-strong)]/40 uppercase tracking-wider">Profile Details</h4>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-3 px-3 py-2 bg-[var(--background)] rounded-xl border border-[var(--primary)]/5">
                      <Mail size={14} className="text-[var(--text-strong)]/40 shrink-0" />
                      <span className="font-mono text-xs text-[var(--text-strong)] truncate">{inspectUser.email}</span>
                    </div>
                    <div className="flex items-center gap-3 px-3 py-2 bg-[var(--background)] rounded-xl border border-[var(--primary)]/5">
                      <Hash size={14} className="text-[var(--text-strong)]/40 shrink-0" />
                      <span className="font-mono text-xs text-[var(--text-strong)]">{inspectUser.employeeId}</span>
                    </div>
                    {((inspectUser as any).gradeLevel || inspectUser.classroomSection) && (
                      <div className="flex items-center gap-3 px-3 py-2 bg-[var(--background)] rounded-xl border border-[var(--primary)]/5">
                        <GraduationCap size={14} className="text-[var(--text-strong)]/40 shrink-0" />
                        <span className="text-xs font-bold text-[var(--text-strong)]">
                          {(inspectUser as any).gradeLevel
                            ? `${(inspectUser as any).gradeLevel} — ${(inspectUser as any).sectionName || '—'}`
                            : inspectUser.classroomSection}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Role Permissions Callout */}
                <div className="space-y-2.5">
                  <h4 className="text-[11px] font-extrabold text-[var(--text-strong)]/40 uppercase tracking-wider">{perms.title}</h4>
                  <div className={`p-3 rounded-xl border ${rc.border} ${rc.bg}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <PermIcon size={14} className={rc.accent} />
                      <span className={`text-[11px] font-extrabold ${rc.accent} uppercase tracking-wider`}>{rc.label} Privileges</span>
                    </div>
                    <ul className="space-y-1">
                      {perms.items.map((item, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs text-[var(--text-strong)]/70">
                          <Lock size={10} className="text-[var(--text-strong)]/30 shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Certificates — Only if earned */}
                {inspectUser.certificatesEarned?.length > 0 && (
                  <div className="space-y-2.5">
                    <h4 className="text-[11px] font-extrabold text-[var(--text-strong)]/40 uppercase tracking-wider">Certificates Earned</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {inspectUser.certificatesEarned.map((cert, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--gold)]/10 border border-[var(--gold)]/20 rounded-full text-[11px] font-bold text-[var(--gold)]"
                        >
                          <Award size={12} />
                          {cert}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Close Profile Button */}
                <button
                  onClick={() => setInspectUser(null)}
                  className="w-full py-3 bg-[var(--primary)] hover:bg-[var(--accent)] text-white font-bold rounded-xl transition-all shadow-md text-xs uppercase tracking-wider cursor-pointer"
                >
                  Close Profile
                </button>
              </div>
            </div>
          </div>
        );
      })()}
      </>
      )}
    </div>
  );
};

