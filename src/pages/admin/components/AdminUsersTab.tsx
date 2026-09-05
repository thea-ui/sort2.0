import React, { useState, useMemo } from 'react';
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
  AlertOctagon,
  Sparkles,
  CheckCircle,
  BadgeAlert,
  ShieldAlert,
} from 'lucide-react';
import { User, Role } from '../../../types';
import { useMockData } from '../../../hooks/useMockData';

interface AdminUsersTabProps {
  users: User[];
  addOffense?: (userId: string, description: string, severity: 'WARNING' | 'DEDUCT' | 'SUSPENSION') => void;
  deductPoints?: (targetEmail: string, amount: number, reason?: string) => void;
}

const ROLE_ORDER: Record<Role, number> = {
  ADMIN: 1,
  MRF: 2,
  TEACHER: 3,
  STUDENT: 4,
};

const ROLE_CONFIG: Record<
  Role,
  { label: string; bg: string; border: string; text: string; icon: React.ElementType; badgeBg: string }
> = {
  ADMIN: {
    label: 'Administrator',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/30',
    text: 'text-violet-700',
    icon: ShieldCheck,
    badgeBg: 'bg-violet-50 text-violet-700 border-violet-200',
  },
  MRF: {
    label: 'MRF Logistics',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/30',
    text: 'text-sky-700',
    icon: Truck,
    badgeBg: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  TEACHER: {
    label: 'Faculty Advisor',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    text: 'text-purple-700',
    icon: Building2,
    badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  STUDENT: {
    label: 'Student Eco-Rep',
    bg: 'bg-[#00A77C]/10',
    border: 'border-[#00A77C]/30',
    text: 'text-[#00A77C]',
    icon: GraduationCap,
    badgeBg: 'bg-[#00A77C]/10 text-[#00A77C] border-[#00A77C]/20',
  },
};

type SortField = 'role' | 'name' | 'points' | 'warnings' | 'email';
type SortDirection = 'asc' | 'desc';
type ViewMode = 'table' | 'grouped';

export const AdminUsersTab: React.FC<AdminUsersTabProps> = ({
  users,
  addOffense,
  deductPoints,
}) => {
  const { currentUser } = useMockData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role | 'ALL'>('ALL');
  const [sortField, setSortField] = useState<SortField>('role');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  // Selected user for modal view/actions
  const [inspectUser, setInspectUser] = useState<User | null>(null);
  const [warningReason, setWarningReason] = useState('');
  const [warningSuccess, setWarningSuccess] = useState(false);
  const [deductAmount, setDeductAmount] = useState<number>(50);

  // Strict guardrail: Only EnrollPro-synced accounts are displayed
  const enrollProUsers = useMemo(() => {
    return users.filter((u: any) => u.syncSource === 'ENROLLPRO');
  }, [users]);

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

  const handleIssueWarning = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectUser || !warningReason.trim() || !addOffense) return;

    await addOffense(inspectUser.id, warningReason);
    setWarningSuccess(true);
    setWarningReason('');
    setTimeout(() => setWarningSuccess(false), 3000);
  };

  const handleDeductPoints = async () => {
    if (!inspectUser || deductAmount <= 0 || !deductPoints) return;
    await deductPoints(inspectUser.id, deductAmount, `Admin deduction from user panel`);
    setWarningSuccess(true);
    setTimeout(() => setWarningSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-[#00A77C] bg-[#00A77C]/10 border border-[#00A77C]/20 px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
              <Sparkles size={11} />
              Role Database Audit
            </span>
            <span className="text-[10px] font-bold text-[#C69B26] bg-[#C69B26]/10 border border-[#C69B26]/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
              {enrollProUsers.length} Registered Accounts
            </span>
          </div>
          <h2 className="text-2xl font-extrabold text-[#00271D] tracking-tight mt-1.5 flex items-center gap-2">
            <Users className="text-[#00A77C]" size={26} />
            User & Role Management
          </h2>
          <p className="text-xs text-[#00271D]/60 mt-0.5">
            Audit user accounts sorted by system role hierarchy (Admin → MRF → Faculty → Student).
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 bg-white/80 border border-white/80 p-1 rounded-2xl shadow-sm self-start md:self-auto">
          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              viewMode === 'table'
                ? 'bg-[#00271D] text-white shadow'
                : 'text-[#00271D]/60 hover:text-[#00271D] hover:bg-white/60'
            }`}
          >
            <List size={14} />
            Table View
          </button>
          <button
            onClick={() => setViewMode('grouped')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              viewMode === 'grouped'
                ? 'bg-[#00271D] text-white shadow'
                : 'text-[#00271D]/60 hover:text-[#00271D] hover:bg-white/60'
            }`}
          >
            <Grid size={14} />
            Grouped by Role
          </button>
        </div>
      </div>

      {/* ROLE BREAKDOWN KPI CARDS (Interactive Role Filters) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* ALL */}
        <button
          onClick={() => setSelectedRole('ALL')}
          className={`p-3.5 rounded-2xl text-left border transition-all ${
            selectedRole === 'ALL'
              ? 'bg-[#00271D] text-white border-[#00271D] shadow-md ring-2 ring-[#00271D]/20 scale-[1.02]'
              : 'bg-white/90 border-white/80 text-[#00271D] hover:border-[#00A77C]/40 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold opacity-80 uppercase tracking-wider">All Accounts</span>
            <Users size={16} className={selectedRole === 'ALL' ? 'text-[#00A77C]' : 'text-[#00271D]/40'} />
          </div>
          <p className="text-xl font-black mt-1">{counts.ALL}</p>
        </button>

        {/* ADMIN */}
        <button
          onClick={() => setSelectedRole('ADMIN')}
          className={`p-3.5 rounded-2xl text-left border transition-all ${
            selectedRole === 'ADMIN'
              ? 'bg-violet-900 text-white border-violet-900 shadow-md ring-2 ring-violet-500/30 scale-[1.02]'
              : 'bg-white/90 border-white/80 text-[#00271D] hover:border-violet-400/40 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-violet-700 uppercase tracking-wider">Admins</span>
            <ShieldCheck size={16} className="text-violet-600" />
          </div>
          <p className="text-xl font-black text-violet-950 mt-1">{counts.ADMIN}</p>
        </button>

        {/* MRF */}
        <button
          onClick={() => setSelectedRole('MRF')}
          className={`p-3.5 rounded-2xl text-left border transition-all ${
            selectedRole === 'MRF'
              ? 'bg-sky-900 text-white border-sky-900 shadow-md ring-2 ring-sky-500/30 scale-[1.02]'
              : 'bg-white/90 border-white/80 text-[#00271D] hover:border-sky-400/40 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-sky-700 uppercase tracking-wider">MRF Logistics</span>
            <Truck size={16} className="text-sky-600" />
          </div>
          <p className="text-xl font-black text-sky-950 mt-1">{counts.MRF}</p>
        </button>

        {/* TEACHER */}
        <button
          onClick={() => setSelectedRole('TEACHER')}
          className={`p-3.5 rounded-2xl text-left border transition-all ${
            selectedRole === 'TEACHER'
              ? 'bg-purple-900 text-white border-purple-900 shadow-md ring-2 ring-purple-500/30 scale-[1.02]'
              : 'bg-white/90 border-white/80 text-[#00271D] hover:border-purple-400/40 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">Faculty</span>
            <Building2 size={16} className="text-purple-600" />
          </div>
          <p className="text-xl font-black text-purple-950 mt-1">{counts.TEACHER}</p>
        </button>

        {/* STUDENT */}
        <button
          onClick={() => setSelectedRole('STUDENT')}
          className={`p-3.5 rounded-2xl text-left border transition-all ${
            selectedRole === 'STUDENT'
              ? 'bg-[#00271D] text-white border-[#00271D] shadow-md ring-2 ring-[#00A77C]/30 scale-[1.02]'
              : 'bg-white/90 border-white/80 text-[#00271D] hover:border-[#00A77C]/40 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#00A77C] uppercase tracking-wider">Students</span>
            <GraduationCap size={16} className="text-[#00A77C]" />
          </div>
          <p className="text-xl font-black text-[#00271D] mt-1">{counts.STUDENT}</p>
        </button>
      </div>

      {/* TOOLBAR: SEARCH & SORT CONTROLS */}
      <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-3 text-[#00271D]/40" />
          <input
            type="text"
            placeholder="Search by user name, email, employee ID, section..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#F9F3F0] border border-[#00271D]/10 rounded-xl pl-10 pr-4 py-2 text-xs text-[#00271D] placeholder-[#00271D]/40 outline-none focus:border-[#00A77C] focus:ring-1 focus:ring-[#00A77C] transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-2.5 text-[#00271D]/40 hover:text-[#00271D]"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Sort & Role Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Role Filter */}
          <div className="flex items-center gap-1.5 bg-[#F9F3F0] px-3 py-1.5 rounded-xl border border-[#00271D]/10">
            <Filter size={13} className="text-[#00271D]/50" />
            <span className="text-[11px] font-bold text-[#00271D]/60 uppercase">Role:</span>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as Role | 'ALL')}
              className="bg-transparent text-xs font-extrabold text-[#00271D] outline-none cursor-pointer"
            >
              <option value="ALL">All Roles ({counts.ALL})</option>
              <option value="ADMIN">Admins ({counts.ADMIN})</option>
              <option value="MRF">MRF Logistics ({counts.MRF})</option>
              <option value="TEACHER">Faculty ({counts.TEACHER})</option>
              <option value="STUDENT">Students ({counts.STUDENT})</option>
            </select>
          </div>

          {/* Sort By Field */}
          <div className="flex items-center gap-1.5 bg-[#F9F3F0] px-3 py-1.5 rounded-xl border border-[#00271D]/10">
            <ArrowUpDown size={13} className="text-[#00271D]/50" />
            <span className="text-[11px] font-bold text-[#00271D]/60 uppercase">Sort:</span>
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
              className="bg-transparent text-xs font-extrabold text-[#00271D] outline-none cursor-pointer"
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
            className="px-3 py-1.5 bg-[#00A77C]/10 text-[#00A77C] border border-[#00A77C]/20 hover:bg-[#00A77C]/20 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
            title="Toggle Ascending / Descending"
          >
            {sortDirection === 'asc' ? 'ASC ↑' : 'DESC ↓'}
          </button>
        </div>
      </div>

      {/* RESULTS SUMMARY */}
      <div className="flex items-center justify-between text-xs text-[#00271D]/50 px-1">
        <span>
          Showing <strong className="text-[#00271D]">{processedUsers.length}</strong> of{' '}
          <strong className="text-[#00271D]">{enrollProUsers.length}</strong> users
          {selectedRole !== 'ALL' && <span> (Filtered by role: <strong>{selectedRole}</strong>)</span>}
        </span>
        <span>Sorted by <strong className="text-[#00271D]">{sortField.toUpperCase()}</strong> ({sortDirection.toUpperCase()})</span>
      </div>

      {/* VIEW MODE 1: TABLE VIEW */}
      {viewMode === 'table' && (
        <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#00271D]/8 text-[#00271D]/50 font-extrabold uppercase tracking-wider bg-[#00A77C]/5">
                  <th
                    onClick={() => toggleSort('name')}
                    className="py-3.5 px-4 cursor-pointer hover:text-[#00271D]"
                  >
                    User Name {sortField === 'name' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th
                    onClick={() => toggleSort('role')}
                    className="py-3.5 px-4 cursor-pointer hover:text-[#00271D]"
                  >
                    Role & Type {sortField === 'role' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th
                    onClick={() => toggleSort('email')}
                    className="py-3.5 px-4 cursor-pointer hover:text-[#00271D]"
                  >
                    Contact & Employee ID {sortField === 'email' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="py-3.5 px-4">Section / Dept</th>
                  <th
                    onClick={() => toggleSort('warnings')}
                    className="py-3.5 px-4 text-center cursor-pointer hover:text-[#00271D]"
                  >
                    Warnings {sortField === 'warnings' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th
                    onClick={() => toggleSort('points')}
                    className="py-3.5 px-4 text-right cursor-pointer hover:text-[#00271D]"
                  >
                    Points {sortField === 'points' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="py-3.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#00271D]/5">
                {processedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#00271D]/40 font-medium">
                      No user accounts found matching your filter criteria.
                    </td>
                  </tr>
                ) : (
                  processedUsers.map((u) => {
                    const roleCfg = ROLE_CONFIG[u.role];
                    const IconComponent = roleCfg.icon;
  // Admin-only access guard
  if (currentUser?.role !== 'ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4 animate-fade-in">
        <div className="p-4 rounded-full bg-rose-50 border border-rose-200">
          <ShieldAlert size={40} className="text-rose-500" />
        </div>
        <h3 className="text-lg font-extrabold text-[#00271D]">Access Denied</h3>
        <p className="text-sm text-[#00271D]/50 text-center max-w-sm">
          User & Role Management is restricted to System Administrators only. Your role (<strong>{currentUser?.role || 'Unknown'}</strong>) does not have permission to view this panel.
        </p>
      </div>
    );
  }

  return (
                      <tr key={u.id} className="hover:bg-[#00A77C]/5 transition-colors">
                        {/* Name & Avatar */}
                        <td className="py-3.5 px-4 font-bold text-[#00271D]">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full ${roleCfg.bg} ${roleCfg.text} font-black flex items-center justify-center text-xs shrink-0 border ${roleCfg.border}`}>
                              {u.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-extrabold text-[#00271D] leading-tight">{u.name}</p>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border inline-flex items-center gap-1.5 ${roleCfg.badgeBg}`}>
                            <IconComponent size={12} />
                            {u.role}
                          </span>
                        </td>

                        {/* Email & ID */}
                        <td className="py-3.5 px-4">
                          <div className="font-mono text-[11px] text-[#00271D]/70">{u.email}</div>
                          <div className="font-mono text-[10px] text-[#00271D]/40 mt-0.5">{u.employeeId}</div>
                        </td>

                        {/* Grade Level / Section */}
                        <td className="py-3.5 px-4 text-[#00271D]/70">
                          {(u as any).gradeLevel ? (
                            <span className="px-2 py-0.5 bg-gray-100 border border-gray-200 rounded-md text-[10px] font-bold text-gray-700">
                              {(u as any).gradeLevel} — {(u as any).sectionName || '—'}
                            </span>
                          ) : u.classroomSection ? (
                            <span className="px-2 py-0.5 bg-gray-100 border border-gray-200 rounded-md text-[10px] font-bold text-gray-700">
                              {u.classroomSection}
                            </span>
                          ) : (
                            <span className="text-[#00271D]/30 italic text-[11px]">—</span>
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
                            <span className="text-[#00271D]/30 font-medium text-[11px]">0</span>
                          )}
                        </td>

                        {/* Points */}
                        <td className="py-3.5 px-4 text-right font-black text-xs">
                          {u.role === 'STUDENT' ? (
                            <span className="text-[#00A77C]">{u.points.toLocaleString()} pts</span>
                          ) : (
                            <span className="text-[#00271D]/30 italic font-medium">—</span>
                          )}
                        </td>

                        {/* Action */}
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => setInspectUser(u)}
                            className="p-1.5 text-[#00271D]/60 hover:text-[#00A77C] hover:bg-[#00A77C]/10 rounded-xl transition-all"
                            title="Inspect User Details & Manage Sanctions"
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
                <div className="flex items-center justify-between border-b border-[#00271D]/5 pb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-2xl ${group.config.bg} ${group.config.text} border ${group.config.border}`}>
                      <IconComponent size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-[#00271D]">
                        {group.config.label}s ({group.role})
                      </h3>
                      <p className="text-xs text-[#00271D]/40 font-medium">
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
                  <p className="text-xs text-[#00271D]/40 italic py-4">No users match this role query.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {group.list.map((u) => (
                      <div
                        key={u.id}
                        className="p-4 bg-[#F9F3F0] border border-[#00271D]/5 rounded-2xl flex flex-col justify-between space-y-3 hover:border-[#00A77C]/30 transition-all"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-9 h-9 rounded-full ${group.config.bg} ${group.config.text} font-black flex items-center justify-center text-xs shrink-0 border ${group.config.border}`}>
                              {u.name.charAt(0)}
                            </div>
                            <div>
                              <h4 className="text-xs font-extrabold text-[#00271D]">{u.name}</h4>
                              <p className="text-[10px] font-mono text-[#00271D]/50">{u.email}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => setInspectUser(u)}
                            className="p-1 text-[#00271D]/40 hover:text-[#00A77C] rounded-lg"
                          >
                            <Eye size={15} />
                          </button>
                        </div>

                        <div className="flex items-center justify-between text-[11px] pt-2 border-t border-[#00271D]/5">
                          <span className="font-mono text-[#00271D]/50 text-[10px]">{u.employeeId}</span>
                          <div className="flex items-center gap-2">
                            {u.warningsCount > 0 && (
                              <span className="text-rose-600 font-extrabold text-[10px] flex items-center gap-0.5 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-full">
                                <BadgeAlert size={10} /> {u.warningsCount}
                              </span>
                            )}
                            {u.role === 'STUDENT' && (
                              <span className="font-black text-[#00A77C]">{u.points.toLocaleString()} pts</span>
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

      {/* USER INSPECT & SANCTION MODAL */}
      {inspectUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-white/80 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-scale-up relative">
            <button
              onClick={() => setInspectUser(null)}
              className="absolute top-4 right-4 text-[#00271D]/40 hover:text-[#00271D] p-1.5 rounded-full bg-[#F9F3F0]"
            >
              <X size={16} />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full ${ROLE_CONFIG[inspectUser.role].bg} ${ROLE_CONFIG[inspectUser.role].text} font-black flex items-center justify-center text-base border ${ROLE_CONFIG[inspectUser.role].border}`}>
                {inspectUser.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-[#00271D]">{inspectUser.name}</h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${ROLE_CONFIG[inspectUser.role].badgeBg}`}>
                  {inspectUser.role}
                </span>
              </div>
            </div>

            {/* Quick Details */}
            <div className="bg-[#F9F3F0] p-4 rounded-2xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#00271D]/50 font-medium">Email:</span>
                <span className="font-mono font-bold text-[#00271D]">{inspectUser.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#00271D]/50 font-medium">Employee / Badge ID:</span>
                <span className="font-mono font-bold text-[#00271D]">{inspectUser.employeeId}</span>
              </div>
              {(inspectUser as any).gradeLevel ? (
                <div className="flex justify-between">
                  <span className="text-[#00271D]/50 font-medium">Grade & Section:</span>
                  <span className="font-bold text-[#00271D]">{(inspectUser as any).gradeLevel} — {(inspectUser as any).sectionName || '—'}</span>
                </div>
              ) : inspectUser.classroomSection ? (
                <div className="flex justify-between">
                  <span className="text-[#00271D]/50 font-medium">Section:</span>
                  <span className="font-bold text-[#00271D]">{inspectUser.classroomSection}</span>
                </div>
              ) : null}
              {inspectUser.role === 'STUDENT' && (
                <div className="flex justify-between">
                  <span className="text-[#00271D]/50 font-medium">Total Eco-Points:</span>
                  <span className="font-black text-[#00A77C]">{inspectUser.points.toLocaleString()} pts</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[#00271D]/50 font-medium">Warning History:</span>
                <span className={`font-bold ${inspectUser.warningsCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {inspectUser.warningsCount} warnings logged
                </span>
              </div>
            </div>

            {/* Alert message if action taken */}
            {warningSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle size={16} className="text-emerald-600" />
                <span>Account record updated successfully!</span>
              </div>
            )}

            {/* Fast Sanction / Offense Logger Form */}
            {addOffense && (
              <form onSubmit={handleIssueWarning} className="pt-2 border-t border-[#00271D]/10 space-y-3">
                <h4 className="text-xs font-heading font-extrabold text-[#00271D] flex items-center gap-1.5">
                  <AlertOctagon size={14} className="text-rose-500" />
                  Issue Offense
                </h4>
                <input
                  type="text"
                  placeholder="Reason for offense (e.g. Improper Sorting)"
                  value={warningReason}
                  onChange={(e) => setWarningReason(e.target.value)}
                  className="w-full bg-[#F9F3F0] border border-[#00271D]/10 rounded-xl px-3 py-2 text-xs text-[#00271D] outline-none focus:border-rose-500"
                />
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1.5 rounded-xl text-xs font-bold ${
                    (inspectUser?.warningsCount ?? 0) + 1 === 1 ? 'bg-yellow-100 text-yellow-800' :
                    (inspectUser?.warningsCount ?? 0) + 1 === 2 ? 'bg-orange-100 text-orange-800' :
                    'bg-rose-100 text-rose-800'
                  }`}>
                    {(inspectUser?.warningsCount ?? 0) + 1 === 1 ? '1st Warning' :
                     (inspectUser?.warningsCount ?? 0) + 1 === 2 ? '2nd = Deduct Pts' :
                     '3rd+ = Suspension'}
                  </span>
                  <button
                    type="submit"
                    className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-1.5 px-3 rounded-xl text-xs transition-all shadow-sm"
                  >
                    Log Offense
                  </button>
                </div>
              </form>
            )}

            {/* Close Button */}
            <button
              onClick={() => setInspectUser(null)}
              className="w-full py-2.5 bg-[#00271D] text-white rounded-xl text-xs font-bold hover:bg-[#00271D]/90 transition-all"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

