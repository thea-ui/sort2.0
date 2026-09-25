import React, { useState } from 'react';
import { AlertOctagon, CheckCircle } from 'lucide-react';
import type { Offense, User } from '../../../../types';
import { PageHeader } from '../../../../components/layout/PageHeader';

interface AdminWarningsTabProps {
  users: User[];
  offenses: Offense[];
  addOffense: (userId: string, description: string) => void;
}

export const AdminWarningsTab: React.FC<AdminWarningsTabProps> = ({
  users,
  offenses,
  addOffense,
}) => {
  const [targetUserId, setTargetUserId] = useState('');
  const [warnDesc, setWarnDesc] = useState('');
  const [warningSuccess, setWarningSuccess] = useState(false);

  const handleWarningSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserId || !warnDesc.trim()) return;

    addOffense(targetUserId, warnDesc);
    setWarningSuccess(true);
    setWarnDesc('');
    setTargetUserId('');

    setTimeout(() => setWarningSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Offenses & Warnings"
        description="Register improper sorting offenses and manage sanction notices."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* File Warning Form */}
        <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-5 shadow-sm self-start">
          <h4 className="text-sm font-bold text-[var(--text-strong)] mb-4 flex items-center gap-2">
            <AlertOctagon size={16} className="text-rose-500" />
            Log Warning Offense
          </h4>

          {warningSuccess && (
            <div className="p-3 bg-[color-mix(in_srgb,var(--accent)_10%,white)] border border-[var(--accent)]/20 text-[var(--accent)] rounded-xl text-xs flex gap-2 mb-4">
              <CheckCircle size={16} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Sanction Registered!</p>
                <p className="text-[10px] opacity-80 mt-0.5">Offense logged to database successfully.</p>
              </div>
            </div>
          )}

          <form onSubmit={handleWarningSubmit} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[var(--text-strong)]/40 uppercase tracking-wider">
                Target User Account
              </label>
              <select
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                required
                className="w-full rounded-xl border border-[var(--primary)]/10 bg-[var(--background)] px-3.5 py-2.5 text-xs text-[var(--text-strong)] outline-none cursor-pointer focus:border-[var(--accent)] focus:bg-white transition-colors"
              >
                <option value="">-- Choose account --</option>
                {users
                  .filter((u) => u.role === 'STUDENT' || u.role === 'TEACHER')
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.employeeId})
                    </option>
                  ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[var(--text-strong)]/40 uppercase tracking-wider">
                Notice Offense Description
              </label>
              <textarea
                required
                rows={3}
                placeholder="e.g. Mixed food scraps inside plastic sorting containers..."
                value={warnDesc}
                onChange={(e) => setWarnDesc(e.target.value)}
                className="w-full rounded-xl border border-[var(--primary)]/10 bg-[var(--background)] px-3.5 py-2.5 text-xs text-[var(--text-strong)] outline-none resize-none focus:border-[var(--accent)] focus:bg-white transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[var(--text-strong)]/40 uppercase tracking-wider">
                Offense Level (Auto-determined)
              </label>
              <div className="flex gap-2">
                {(['WARNING', 'DEDUCT', 'SUSPENSION'] as const).map((sev, i) => {
                  const targetUser = users.find((u) => u.id === targetUserId);
                  const nextLevel = targetUser ? (targetUser.warningsCount ?? 0) + 1 : 1;
                  const isActive = i + 1 === nextLevel;
                  return (
                    <div
                      key={sev}
                      className={`flex-1 py-2 text-center rounded-xl border font-bold text-[9px] ${
                        isActive
                          ? 'bg-rose-500 border-rose-500 text-white shadow-sm shadow-rose-200'
                          : 'bg-gray-50 border-gray-200 text-gray-400 opacity-50'
                      }`}
                    >
                      {sev === 'WARNING' ? 'Warning' : sev === 'DEDUCT' ? 'Deduct' : 'Suspend'}
                      {isActive && <span className="block text-[8px] font-normal mt-0.5">Next offense</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-rose-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-rose-600 shadow-md shadow-rose-200 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <AlertOctagon size={13} />
              <span>Log Notice of Sanction</span>
            </button>
          </form>
        </div>

        {/* Offense Logs List */}
        <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-5 shadow-sm lg:col-span-2">
          <h4 className="text-sm font-bold text-[var(--text-strong)] mb-4 flex items-center gap-2">
            <AlertOctagon size={15} className="text-rose-500" />
            Recent Sanction Incidents
          </h4>

          {offenses.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <div className="h-12 w-12 mx-auto rounded-2xl bg-rose-50 text-rose-400 flex items-center justify-center">
                <AlertOctagon size={24} />
              </div>
              <p className="text-sm font-bold text-[var(--text-strong)]">No warning incidents on record.</p>
              <p className="text-xs text-[var(--text-strong)]/40">All clear — no sanctions have been filed yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--primary)]/5">
              {offenses.map((off) => (
                <div
                  key={off.id}
                  className="flex justify-between items-start py-3.5 first:pt-0 last:pb-0 gap-3"
                >
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-[var(--text-strong)]">{off.description}</p>
                    <p className="text-[10px] text-[var(--text-strong)]/50 font-semibold">
                      User: {off.userName} · {off.timestamp}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase shrink-0 ${
                      off.severity === 'SUSPENSION'
                        ? 'bg-rose-100 border border-rose-300 text-rose-700'
                        : off.severity === 'DEDUCT'
                          ? 'bg-amber-50 border border-amber-200 text-amber-700'
                          : 'bg-orange-50 border border-orange-200 text-orange-700'
                    }`}
                  >
                    {off.severity === 'WARNING'
                      ? 'Warning'
                      : off.severity === 'DEDUCT'
                        ? 'Deduct'
                        : 'Suspended'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
