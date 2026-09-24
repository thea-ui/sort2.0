import React, { useEffect, useState } from 'react';
import {
  Award,
  Calendar,
  Loader2,
  RefreshCw,
  Save,
  ShieldCheck,
  Trophy,
  Medal,
  Leaf,
  History,
} from 'lucide-react';
import { Certificate, SystemSettings, TermStatus, TermStanding } from '../../../../types';
import { apiService } from '../../../../services/api';

interface AdminCertificateTabProps {
  settings: SystemSettings;
  updateSettings: (newSettings: Partial<SystemSettings>) => void;
}

interface FormState {
  certificatePointThreshold: number;
  certificateGraceDays: number;
  certificateMilestoneName: string;
  certificateChampionName: string;
  certificateLeaderName: string;
  certificateAdvocateName: string;
}

const TIER_META = [
  { key: 'certificateChampionName' as const, label: 'Rank 1', Icon: Trophy, color: 'text-amber-600' },
  { key: 'certificateLeaderName' as const, label: 'Rank 2', Icon: Award, color: 'text-[var(--text-strong)]' },
  { key: 'certificateAdvocateName' as const, label: 'Rank 3', Icon: Medal, color: 'text-[var(--gold)]' },
];

export const AdminCertificateTab: React.FC<AdminCertificateTabProps> = ({ settings, updateSettings }) => {
  const [form, setForm] = useState<FormState>({
    certificatePointThreshold: settings.certificatePointThreshold ?? 500,
    certificateGraceDays: settings.certificateGraceDays ?? 3,
    certificateMilestoneName: settings.certificateMilestoneName ?? 'Eco-Milestone Certificate',
    certificateChampionName: settings.certificateChampionName ?? 'Eco-Champion Certificate',
    certificateLeaderName: settings.certificateLeaderName ?? 'Eco-Leader Certificate',
    certificateAdvocateName: settings.certificateAdvocateName ?? 'Eco-Advocate Certificate',
  });
  const [saved, setSaved] = useState(false);
  const [termStatus, setTermStatus] = useState<TermStatus | null>(null);
  const [standings, setStandings] = useState<TermStanding[]>([]);
  const [history, setHistory] = useState<Certificate[]>([]);
  const [issuing, setIssuing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setRefreshing(true);
    try {
      const [status, hist] = await Promise.all([
        apiService.getTermStatus().catch(() => null),
        apiService.getCertificateHistory(25).catch(() => [] as Certificate[]),
      ]);
      setTermStatus(status);
      setHistory(Array.isArray(hist) ? hist : []);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      certificatePointThreshold: Number(form.certificatePointThreshold),
      certificateGraceDays: Number(form.certificateGraceDays),
      certificateMilestoneName: form.certificateMilestoneName.trim(),
      certificateChampionName: form.certificateChampionName.trim(),
      certificateLeaderName: form.certificateLeaderName.trim(),
      certificateAdvocateName: form.certificateAdvocateName.trim(),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleIssue = async (force = false) => {
    setIssuing(true);
    setResult(null);
    setError(null);
    try {
      const res = await apiService.issueTermCertificates({ force });
      setResult(res.message);
      setStandings(res.standings || []);
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to issue term certificates');
    } finally {
      setIssuing(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Term status + issuance */}
      <div className="bg-[var(--primary)]/10 border border-[var(--primary)]/30 rounded-3xl p-8 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h3 className="text-2xl font-black text-[var(--text-strong)] flex items-center gap-2">
              <Calendar size={22} className="text-[var(--text-strong)]" />
              Term-End Ranked Awards
            </h3>
            <p className="text-sm text-[var(--text-strong)]/50 mt-1">
              Top 3 students by term eco-points receive Eco-Champion, Eco-Leader, and Eco-Advocate
              certificates. Awards are issued only after the term ends and the grace window closes.
            </p>
          </div>
          <button
            type="button"
            onClick={loadData}
            disabled={refreshing}
            className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-500 hover:text-[var(--accent)] text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
          >
            {refreshing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            Refresh
          </button>
        </div>

        {termStatus ? (
          <div className="p-4 bg-white rounded-2xl border border-gray-200 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
            <span className="font-extrabold text-[var(--text-strong)]">{termStatus.quarterName || 'No active term'}</span>
            <span className="text-[var(--text-strong)]/50">
              {termStatus.startDate} → {termStatus.endDate}
            </span>
            <span className="font-bold text-[var(--accent)]">State: {termStatus.state}</span>
            <span className="text-[var(--text-strong)]/50">Grace: {termStatus.graceDays} days</span>
            <span className="text-[var(--text-strong)]/50">Issued: {termStatus.awardedCount}</span>
          </div>
        ) : (
          <div className="p-4 bg-white rounded-2xl border border-gray-200 text-xs text-[var(--text-strong)]/50 font-medium">
            No academic term configured. Set one in Academic Calendar.
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => handleIssue(false)}
            disabled={issuing}
            className="px-6 py-3 bg-[var(--gold)] hover:brightness-95 text-white text-sm font-bold rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
          >
            {issuing ? <Loader2 size={14} className="animate-spin" /> : <Trophy size={14} />}
            {issuing ? 'Issuing...' : 'Issue Term Awards'}
          </button>
          <button
            type="button"
            onClick={() => handleIssue(true)}
            disabled={issuing}
            className="px-4 py-3 bg-white border border-amber-300 text-amber-700 text-xs font-bold rounded-xl hover:bg-amber-50 flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
            title="Bypass the grace window (testing / manual override)"
          >
            <ShieldCheck size={13} />
            Force Issue (skip grace)
          </button>
        </div>

        {result && (
          <div className="p-4 rounded-xl border text-sm font-medium bg-emerald-50 border-emerald-200 text-emerald-700">
            {result}
          </div>
        )}
        {error && (
          <div className="p-4 rounded-xl border text-sm font-medium bg-rose-50 border-rose-200 text-rose-700">
            {error}
          </div>
        )}

        {standings.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <p className="px-4 py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-strong)]/40 bg-gray-50 border-b border-gray-100">
              Term Standings (Top 10)
            </p>
            <div className="divide-y divide-gray-50">
              {standings.map((s, i) => (
                <div key={s.userId} className="px-4 py-2.5 flex items-center justify-between text-xs">
                  <span className="font-bold text-[var(--text-strong)]">
                    <span className="text-[var(--text-strong)]/40 mr-2">#{i + 1}</span>
                    {s.name}
                  </span>
                  <span className="font-extrabold text-[var(--accent)]">{s.termPoints} pts</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Settings */}
      <form onSubmit={handleSave} className="bg-[var(--gold)]/10 border border-[var(--gold)]/30 rounded-3xl p-8 shadow-sm space-y-5">
        <div>
          <h3 className="text-2xl font-black text-[var(--text-strong)] flex items-center gap-2">
            <Leaf size={22} className="text-emerald-600" />
            Certificate Configuration
          </h3>
          <p className="text-sm text-[var(--text-strong)]/50 mt-1">
            Milestone certificates are instant. Ranked certificates use distinct names per rank.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-[var(--text-strong)]/50 uppercase">Milestone Point Threshold</label>
            <input
              type="number"
              min={0}
              value={form.certificatePointThreshold}
              onChange={(e) => setForm({ ...form, certificatePointThreshold: Number(e.target.value) })}
              className="w-full mt-1.5 p-3 bg-white border border-gray-200 rounded-xl text-sm font-semibold outline-none focus:border-[var(--gold)]"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-[var(--text-strong)]/50 uppercase">Grace Window (days after term end)</label>
            <input
              type="number"
              min={0}
              value={form.certificateGraceDays}
              onChange={(e) => setForm({ ...form, certificateGraceDays: Number(e.target.value) })}
              className="w-full mt-1.5 p-3 bg-white border border-gray-200 rounded-xl text-sm font-semibold outline-none focus:border-[var(--gold)]"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-[var(--text-strong)]/50 uppercase">Milestone Certificate Name</label>
          <input
            type="text"
            value={form.certificateMilestoneName}
            onChange={(e) => setForm({ ...form, certificateMilestoneName: e.target.value })}
            className="w-full mt-1.5 p-3 bg-white border border-gray-200 rounded-xl text-sm font-semibold outline-none focus:border-[var(--gold)]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {TIER_META.map(({ key, label, Icon, color }) => (
            <div key={key}>
              <label className={`text-xs font-bold uppercase flex items-center gap-1.5 ${color}`}>
                <Icon size={12} /> {label}
              </label>
              <input
                type="text"
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="w-full mt-1.5 p-3 bg-white border border-gray-200 rounded-xl text-sm font-semibold outline-none focus:border-[var(--gold)]"
              />
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="px-6 py-3 bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white text-sm font-bold rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all"
          >
            <Save size={14} />
            Save Certificate Settings
          </button>
          {saved && <span className="text-xs font-bold text-emerald-600">Saved!</span>}
        </div>
      </form>

      {/* History */}
      <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm space-y-4">
        <h3 className="text-xl font-black text-[var(--text-strong)] flex items-center gap-2">
          <History size={20} className="text-[var(--text-strong)]/50" />
          Issuance History
        </h3>
        {history.length === 0 ? (
          <p className="text-xs text-[var(--text-strong)]/50 font-medium">No certificates issued yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-[var(--text-strong)]/40 border-b border-gray-100">
                  <th className="py-2 pr-4">Student</th>
                  <th className="py-2 pr-4">Certificate</th>
                  <th className="py-2 pr-4">Rank</th>
                  <th className="py-2 pr-4">Points</th>
                  <th className="py-2 pr-4">Term</th>
                  <th className="py-2 pr-4">Serial</th>
                  <th className="py-2">Issued</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {history.map((c) => (
                  <tr key={c.id} className="text-[var(--text-strong)]">
                    <td className="py-2 pr-4 font-bold">{c.studentName}</td>
                    <td className="py-2 pr-4">{c.name}</td>
                    <td className="py-2 pr-4">{c.rankAtIssue ?? '—'}</td>
                    <td className="py-2 pr-4">{c.pointsAtIssue}</td>
                    <td className="py-2 pr-4">{c.termName || '—'}</td>
                    <td className="py-2 pr-4 font-mono text-[10px] text-[var(--text-strong)]/50">{c.serial}</td>
                    <td className="py-2 text-[var(--text-strong)]/50">{new Date(c.issuedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
