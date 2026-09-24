import React from 'react';
import {
  Award,
  BadgeAlert,
  BookOpen,
  CheckCircle2,
  Crown,
  GraduationCap,
  Hash,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  Truck,
} from 'lucide-react';
import { User } from '../../../../types';
import { AppModal } from '../../../../components/common/AppModal';
import { ROLE_CONFIG, ROLE_PERMISSIONS, getUserSectionLabel } from './userRoleConfig';

interface UserProfileInspectorModalProps {
  user: User;
  onClose: () => void;
}

export const UserProfileInspectorModal: React.FC<UserProfileInspectorModalProps> = ({
  user,
  onClose,
}) => {
  const rc = ROLE_CONFIG[user.role];
  const perms = ROLE_PERMISSIONS[user.role];
  const PermIcon = perms.icon;
  const section = getUserSectionLabel(user);

  const primaryMetric =
    user.role === 'STUDENT'
      ? {
          icon: <Sparkles size={15} className="text-[var(--accent)]" />,
          value: user.points.toLocaleString(),
          valueClass: 'text-lg font-black text-[var(--accent)]',
          label: 'Eco-Points',
        }
      : user.role === 'ADMIN'
        ? {
            icon: <Crown size={15} className="text-[var(--gold)]" />,
            value: 'L4',
            valueClass: 'text-sm font-black text-[var(--gold)]',
            label: 'Clearance',
          }
        : user.role === 'TEACHER'
          ? {
              icon: <BookOpen size={15} className="text-[var(--gold)]" />,
              value: 'Faculty',
              valueClass: 'text-sm font-black text-[var(--gold)]',
              label: 'Division',
            }
          : {
              icon: <Truck size={15} className="text-[var(--text-strong)]" />,
              value: 'Ops',
              valueClass: 'text-sm font-black text-[var(--text-strong)]',
              label: 'Team',
            };

  return (
    <AppModal
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={user.name}
      description={rc.label}
      size="sm"
      cancelLabel="Close Profile"
    >
      <div className="space-y-5">
        {/* Avatar & identity */}
        <div className="flex items-center gap-4">
          <div
            className={`w-[68px] h-[68px] rounded-full bg-white ${rc.text} font-black flex items-center justify-center text-2xl shrink-0 border-4 border-white shadow-lg ring-2 ${rc.border}`}
          >
            {user.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <span
              className={`rounded-full font-black uppercase text-[10px] tracking-wider px-3 py-1 ${rc.badgeBg}`}
            >
              {rc.label}
            </span>
            <div className="mt-1.5">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[var(--accent)] bg-[var(--accent)]/10 border border-[var(--accent)]/20 px-2 py-1 rounded-full">
                <CheckCircle2 size={10} />
                EnrollPro
              </span>
            </div>
          </div>
        </div>

        {/* Key stats grid */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="bg-[var(--primary)]/5 rounded-2xl p-3 border border-[var(--primary)]/5 text-center space-y-1">
            <div className="flex items-center justify-center">{primaryMetric.icon}</div>
            <p className={primaryMetric.valueClass}>{primaryMetric.value}</p>
            <p className="text-[10px] font-bold text-[var(--text-strong)]/50 uppercase tracking-wider">
              {primaryMetric.label}
            </p>
          </div>

          <div className="bg-[var(--primary)]/5 rounded-2xl p-3 border border-[var(--primary)]/5 text-center space-y-1">
            <div className="flex items-center justify-center">
              {user.warningsCount > 0 ? (
                <BadgeAlert size={15} className="text-rose-600" />
              ) : (
                <ShieldCheck size={15} className="text-emerald-600" />
              )}
            </div>
            {user.warningsCount > 0 ? (
              <p className="text-lg font-black text-rose-600">{user.warningsCount}</p>
            ) : (
              <p className="text-sm font-black text-emerald-600">Clean</p>
            )}
            <p className="text-[10px] font-bold text-[var(--text-strong)]/50 uppercase tracking-wider">
              {user.warningsCount > 0 ? 'Warnings' : 'Record'}
            </p>
          </div>

          <div className="bg-[var(--primary)]/5 rounded-2xl p-3 border border-[var(--primary)]/5 text-center space-y-1">
            <div className="flex items-center justify-center">
              <span
                className={`w-2.5 h-2.5 rounded-full animate-pulse shadow-sm ${
                  user.accountStatus === 'SUSPENDED'
                    ? 'bg-rose-500 shadow-rose-300'
                    : 'bg-emerald-500 shadow-emerald-300'
                }`}
              />
            </div>
            <p
              className={`text-sm font-black ${
                user.accountStatus === 'SUSPENDED' ? 'text-rose-600' : 'text-emerald-600'
              }`}
            >
              {user.accountStatus === 'SUSPENDED' ? 'Suspended' : 'Active'}
            </p>
            <p className="text-[10px] font-bold text-[var(--text-strong)]/50 uppercase tracking-wider">
              Status
            </p>
          </div>
        </div>

        {/* Profile details */}
        <div className="space-y-2.5">
          <h4 className="text-[11px] font-extrabold text-[var(--text-strong)]/40 uppercase tracking-wider">
            Profile Details
          </h4>
          <div className="space-y-1.5">
            <div className="flex items-center gap-3 px-3 py-2 bg-[var(--primary)]/5 rounded-xl border border-[var(--primary)]/5">
              <Mail size={14} className="text-[var(--text-strong)]/40 shrink-0" />
              <span className="font-mono text-xs text-[var(--text-strong)] truncate">{user.email}</span>
            </div>
            <div className="flex items-center gap-3 px-3 py-2 bg-[var(--primary)]/5 rounded-xl border border-[var(--primary)]/5">
              <Hash size={14} className="text-[var(--text-strong)]/40 shrink-0" />
              <span className="font-mono text-xs text-[var(--text-strong)]">{user.employeeId}</span>
            </div>
            {section && (
              <div className="flex items-center gap-3 px-3 py-2 bg-[var(--primary)]/5 rounded-xl border border-[var(--primary)]/5">
                <GraduationCap size={14} className="text-[var(--text-strong)]/40 shrink-0" />
                <span className="text-xs font-bold text-[var(--text-strong)]">{section}</span>
              </div>
            )}
          </div>
        </div>

        {/* Role permissions */}
        <div className="space-y-2.5">
          <h4 className="text-[11px] font-extrabold text-[var(--text-strong)]/40 uppercase tracking-wider">
            {perms.title}
          </h4>
          <div className={`p-3 rounded-xl border ${rc.border} ${rc.bg}`}>
            <div className="flex items-center gap-2 mb-2">
              <PermIcon size={14} className={rc.accent} />
              <span className={`text-[11px] font-extrabold ${rc.accent} uppercase tracking-wider`}>
                {rc.label} Privileges
              </span>
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

        {/* Certificates */}
        {(user.certificatesEarned?.length ?? 0) > 0 && (
          <div className="space-y-2.5">
            <h4 className="text-[11px] font-extrabold text-[var(--text-strong)]/40 uppercase tracking-wider">
              Certificates Earned
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {user.certificatesEarned.map((cert, i) => (
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
      </div>
    </AppModal>
  );
};
