import React from 'react';
import { Award, BadgeAlert, CheckCircle2, Hash, Mail, Sparkles } from 'lucide-react';
import { User } from '../../../../types';
import { AppModal } from '../../../../components/common/AppModal';
import { ROLE_CONFIG, ROLE_PERMISSIONS, getUserSectionLabel } from './userRoleConfig';

interface UserProfileInspectorModalProps {
  user: User;
  onClose: () => void;
}

const DetailRow: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string;
  tone?: string;
}> = ({ icon: Icon, label, value, tone = 'text-[var(--text-strong)]' }) => (
  <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
    <span className="flex shrink-0 items-center gap-2 text-xs font-semibold text-[var(--text-strong)]/50">
      <Icon size={13} className="shrink-0" />
      {label}
    </span>
    <span className={`min-w-0 truncate font-mono text-xs font-bold ${tone}`}>{value}</span>
  </div>
);

export const UserProfileInspectorModal: React.FC<UserProfileInspectorModalProps> = ({
  user,
  onClose,
}) => {
  const rc = ROLE_CONFIG[user.role];
  const perms = ROLE_PERMISSIONS[user.role];
  const section = getUserSectionLabel(user);
  const isSuspended = user.accountStatus === 'SUSPENDED';

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
      <div className="space-y-4">
        {/* Identity & status */}
        <div className="flex items-center gap-3">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 bg-white text-xl font-black ${rc.text} ${rc.border}`}
          >
            {user.name.charAt(0)}
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                isSuspended
                  ? 'border-rose-200 bg-rose-50 text-rose-600'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-600'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${isSuspended ? 'bg-rose-500' : 'bg-emerald-500'}`}
              />
              {isSuspended ? 'Suspended' : 'Active'}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--accent)]/20 bg-[color-mix(in_srgb,var(--accent)_8%,white)] px-2.5 py-1 text-[11px] font-bold text-[var(--accent)]">
              <CheckCircle2 size={11} />
              EnrollPro
            </span>
            {section && (
              <span className="rounded-full border border-[var(--primary)]/10 bg-[color-mix(in_srgb,var(--primary)_5%,white)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-strong)]/70">
                {section}
              </span>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="divide-y divide-[var(--primary)]/5 overflow-hidden rounded-2xl border border-[var(--primary)]/10 bg-[color-mix(in_srgb,var(--primary)_3%,white)]">
          <DetailRow icon={Mail} label="Email" value={user.email} />
          <DetailRow icon={Hash} label="Employee ID" value={user.employeeId} />
          {user.role === 'STUDENT' && (
            <DetailRow
              icon={Sparkles}
              label="Eco-Points"
              value={user.points.toLocaleString()}
              tone="text-[var(--accent)]"
            />
          )}
          {user.warningsCount > 0 && (
            <DetailRow
              icon={BadgeAlert}
              label="Warnings"
              value={String(user.warningsCount)}
              tone="text-rose-600"
            />
          )}
        </div>

        {/* Access */}
        <div className="space-y-2">
          <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--text-strong)]/40">
            {perms.title}
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {perms.items.map((item) => (
              <span
                key={item}
                className="rounded-full border border-[var(--primary)]/10 bg-[color-mix(in_srgb,var(--primary)_4%,white)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-strong)]/70"
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* Certificates */}
        {(user.certificatesEarned?.length ?? 0) > 0 && (
          <div className="space-y-2">
            <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--text-strong)]/40">
              Certificates Earned
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {user.certificatesEarned.map((cert, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--gold)]/25 bg-[color-mix(in_srgb,var(--gold)_8%,white)] px-2.5 py-1 text-[11px] font-bold text-[var(--gold)]"
                >
                  <Award size={11} />
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
