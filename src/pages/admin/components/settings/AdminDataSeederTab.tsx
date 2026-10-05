import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  DatabaseZap,
  Info,
  Loader2,
  RefreshCw,
  Trash2,
  Users,
} from 'lucide-react';
import { apiService } from '../../../../services/api';
import type {
  DataSeedInclude,
  DataSeedResult,
  DataSeedStatus,
  DataSeedVolume,
} from '../../../../services/api';
import { useToast } from '../../../../hooks/useToast';
import { LoadingState } from '../../../../components/common/LoadingState';
import { AppModal } from '../../../../components/common/AppModal';

const VOLUMES: { id: DataSeedVolume; label: string; hint: string }[] = [
  { id: 'LIGHT', label: 'Light', hint: '~120 reports — quick smoke test' },
  { id: 'NORMAL', label: 'Normal', hint: '~350 reports — recommended for demos' },
  { id: 'HEAVY', label: 'Heavy', hint: '~700 reports — defense-ready dataset' },
];

const INCLUDE_OPTIONS: { key: keyof DataSeedInclude; label: string; hint: string }[] = [
  { key: 'walkIns', label: 'Walk-in bottle turnovers', hint: 'MRF station visits + milestone claims' },
  { key: 'marketSales', label: 'Recycle market stock & sales', hint: 'Vendor sales, ending inventory' },
  { key: 'assetScrap', label: 'Asset scrap recovery', hint: 'Weighed scrap items, stock and one sale (asset ledger records are always written)' },
  { key: 'offenses', label: 'Warnings & offenses', hint: 'A few real warning/deduct records' },
];

const formatNumber = (n: number) => n.toLocaleString('en-US');
const formatPeso = (n: number) => `₱${n.toLocaleString('en-US')}`;
const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

export const AdminDataSeederTab: React.FC = () => {
  const [status, setStatus] = useState<DataSeedStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [volume, setVolume] = useState<DataSeedVolume>('NORMAL');
  const [include, setInclude] = useState<DataSeedInclude>({
    walkIns: true,
    marketSales: true,
    offenses: true,
    assetScrap: true,
  });
  const [reseed, setReseed] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [clearOpen, setClearOpen] = useState(false);
  const [clearText, setClearText] = useState('');
  const [seeding, setSeeding] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [result, setResult] = useState<DataSeedResult | null>(null);
  const toast = useToast();

  const loadStatus = async () => {
    try {
      setStatus(await apiService.getDataSeedStatus());
    } catch (err: any) {
      console.warn('Failed to load data seeder status:', err);
      toast.error(err?.message || 'Failed to load seeder status');
    }
  };

  useEffect(() => {
    let cancelled = false;
    apiService
      .getDataSeedStatus()
      .then((next) => {
        if (!cancelled) setStatus(next);
      })
      .catch((err: any) => console.warn('Failed to load data seeder status:', err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const hasYearData = Boolean(
    status &&
      status.counts.reports +
        status.counts.pointHistories +
        status.counts.walkIns +
        status.counts.offenses +
        status.counts.sales +
        status.counts.assetRecords >
        0
  );

  const canSeed = Boolean(status?.schoolYear) && (status?.students.active ?? 0) > 0 && !seeding && !clearing;

  const handleRunSeed = async () => {
    setSeeding(true);
    try {
      const res = await apiService.runDataSeed({
        mode: reseed ? 'RESEED_YEAR' : 'SEED_EMPTY',
        volume,
        include,
      });
      setResult(res);
      setConfirmOpen(false);
      setConfirmText('');
      toast.success(`Generated ${formatNumber(res.reports)} reports for ${res.schoolYearLabel}`);
      await loadStatus();
    } catch (err: any) {
      toast.error(err?.message || 'Data generation failed');
    } finally {
      setSeeding(false);
    }
  };

  const handleClearYear = async () => {
    setClearing(true);
    try {
      const res = await apiService.clearActiveYearData();
      setResult(null);
      setClearOpen(false);
      setClearText('');
      toast.success(`Cleared ${formatNumber(res.reports)} reports from the active school year`);
      await loadStatus();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to clear the active year');
    } finally {
      setClearing(false);
    }
  };

  if (loading) {
    return <LoadingState label="Loading data seeder…" />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          <DatabaseZap size={22} className="text-[var(--accent)]" />
          Data Seeder
        </h3>
        <p className="text-sm text-[var(--text-strong)]/50 mt-0.5">
          Generate a full school year of realistic activity using the real EnrollPro-synced accounts —
          for demos and consecutive rollover tests.
        </p>
      </div>

      {/* Status card */}
      <div className="rounded-2xl border border-[var(--primary)]/10 bg-white p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h4 className="text-lg font-bold text-[var(--text-strong)]">Current School Year</h4>
          <button
            type="button"
            onClick={loadStatus}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--primary)]/10 bg-white text-xs font-bold text-[var(--text-strong)]/60 hover:bg-[color-mix(in_srgb,var(--primary)_5%,white)] cursor-pointer transition-colors"
          >
            <RefreshCw size={12} />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-[10px] font-bold text-[var(--text-strong)]/40 uppercase tracking-wider">Active Year</p>
            <p className="text-lg font-black text-[var(--text-strong)]">
              {status?.schoolYear?.label || 'None'}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-[var(--text-strong)]/40 uppercase tracking-wider">Active Students</p>
            <p className="text-lg font-black text-[var(--text-strong)]">
              {formatNumber(status?.students.active ?? 0)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-[var(--text-strong)]/40 uppercase tracking-wider">Staff Accounts</p>
            <p className="text-lg font-black text-[var(--text-strong)]">{formatNumber(status?.staff ?? 0)}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-[var(--text-strong)]/40 uppercase tracking-wider">Year Activity</p>
            <p className="text-lg font-black text-[var(--text-strong)]">
              {formatNumber(status?.counts.reports ?? 0)} <span className="text-xs font-bold text-[var(--text-strong)]/40">reports</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-[var(--text-strong)]/50">
          <span>{formatNumber(status?.counts.pointHistories ?? 0)} point entries</span>
          <span>{formatNumber(status?.counts.walkIns ?? 0)} walk-ins</span>
          <span>{formatNumber(status?.counts.offenses ?? 0)} offenses</span>
          <span>{formatNumber(status?.counts.sales ?? 0)} market sales</span>
          <span>{formatNumber(status?.counts.assetRecords ?? 0)} asset ledger records</span>
        </div>

        {status?.lastSeed && (
          <div className="p-3 bg-[color-mix(in_srgb,var(--primary)_5%,white)] border border-[var(--primary)]/15 rounded-xl text-xs text-[var(--text-strong)]/70">
            <span className="font-bold">Last run:</span> {status.lastSeed.details}{' '}
            <span className="text-[var(--text-strong)]/40">
              ({status.lastSeed.actorName}, {formatDate(status.lastSeed.at)})
            </span>
          </div>
        )}

        {!status?.schoolYear && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-800 flex items-start gap-2">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            No active school year. Sync the school year from EnrollPro first.
          </div>
        )}

        {(status?.students.active ?? 0) === 0 && status?.schoolYear && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-800 flex items-start gap-2">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            No active enrolled students. Enroll learners in EnrollPro, run the bulk sync, then generate data.
          </div>
        )}
      </div>

      {/* Configuration */}
      <div className="rounded-2xl border border-[var(--primary)]/10 bg-white p-6 space-y-5">
        <h4 className="text-lg font-bold text-[var(--text-strong)]">Generation Settings</h4>

        <div className="space-y-2">
          <p className="text-xs font-bold text-[var(--text-strong)]/50 uppercase tracking-wider">Volume</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {VOLUMES.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setVolume(option.id)}
                className={`text-left px-4 py-3 rounded-xl border-2 transition-all cursor-pointer ${
                  volume === option.id
                    ? 'border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_5%,white)]'
                    : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                }`}
              >
                <span
                  className={`block text-sm font-bold ${
                    volume === option.id ? 'text-[var(--accent)]' : 'text-[var(--text-strong)]/70'
                  }`}
                >
                  {option.label}
                </span>
                <span className="block text-[11px] text-[var(--text-strong)]/45 mt-0.5">{option.hint}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-bold text-[var(--text-strong)]/50 uppercase tracking-wider">Include</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {INCLUDE_OPTIONS.map((option) => (
              <label
                key={option.key}
                className="flex items-start gap-2.5 p-3 rounded-xl border border-[var(--primary)]/10 bg-[color-mix(in_srgb,var(--background)_60%,white)] cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={include[option.key]}
                  onChange={(e) => setInclude((prev) => ({ ...prev, [option.key]: e.target.checked }))}
                  className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
                />
                <span>
                  <span className="block text-sm font-bold text-[var(--text-strong)]">{option.label}</span>
                  <span className="block text-[11px] text-[var(--text-strong)]/45">{option.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <label className="flex items-start gap-2.5 p-3 rounded-xl border border-[var(--primary)]/10 bg-[color-mix(in_srgb,var(--background)_60%,white)] cursor-pointer">
          <input
            type="checkbox"
            checked={reseed}
            onChange={(e) => setReseed(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[var(--rose,#dc2626)]"
          />
          <span>
            <span className="block text-sm font-bold text-[var(--text-strong)]">
              Replace this year's activity (reseed)
            </span>
            <span className="block text-[11px] text-[var(--text-strong)]/45">
              Deletes the active year's reports, points, walk-ins, offenses and sales before generating. Accounts and
              audit history are never touched.
            </span>
          </span>
        </label>

        <div className="flex items-start gap-2 p-3 bg-[color-mix(in_srgb,var(--primary)_5%,white)] border border-[var(--primary)]/15 rounded-xl text-xs text-[var(--text-strong)]/60">
          <Info size={14} className="shrink-0 mt-0.5" />
          <span>
            Records are written to the active school year with dates spread across the year, ranked points, MRF
            collections, walk-ins, challenge progress and market sales — indistinguishable from real activity. Each run
            is recorded in the audit log.
          </span>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={!canSeed}
            onClick={() => {
              if (hasYearData && !reseed) {
                toast.error('This school year already has activity. Enable “Replace this year’s activity” to reseed.');
                return;
              }
              setConfirmOpen(true);
            }}
            className="px-6 py-3 bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white text-sm font-bold rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <DatabaseZap size={16} />
            Generate Year Data
          </button>
        </div>
      </div>

      {/* Result summary */}
      {result && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6 space-y-4">
          <h4 className="text-lg font-bold text-emerald-800 flex items-center gap-2">
            <CheckCircle2 size={18} />
            Generated for {result.schoolYearLabel}
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ResultStat label="Reports" value={`${formatNumber(result.reports)}`} sub={`${formatNumber(result.collectedReports)} collected`} />
            <ResultStat label="Points Awarded" value={formatNumber(result.pointsAwarded)} sub={`${formatNumber(result.studentsCredited)} students`} />
            <ResultStat label="Walk-ins" value={formatNumber(result.walkIns)} sub={`${formatNumber(result.walkInPoints)} pts earned`} />
            <ResultStat label="Reward Claims" value={formatNumber(result.rewardClaims)} sub="milestones unlocked" />
            <ResultStat label="Market Sales" value={formatNumber(result.sales)} sub={formatPeso(result.salesRevenue)} />
            <ResultStat label="Asset Ledger" value={formatNumber(result.assetRecords)} sub="MRF disposition records" />
            <ResultStat label="Offenses" value={formatNumber(result.offenses)} sub="warnings / deducts" />
            <ResultStat label="Challenge Completions" value={formatNumber(result.challengeCompletions)} sub="this term" />
            <ResultStat label="Duration" value={`${(result.durationMs / 1000).toFixed(1)}s`} sub={result.mode === 'RESEED_YEAR' ? 'reseeded' : 'seeded'} />
          </div>
        </div>
      )}

      {/* Danger: clear year */}
      <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-6 space-y-4">
        <h4 className="text-lg font-bold text-rose-700 flex items-center gap-2">
          <Trash2 size={18} />
          Clear This Year's Activity
        </h4>
        <p className="text-sm text-rose-700/70">
          Deletes all reports, points, walk-ins, claims, offenses and market sales for the active school year, and
          resets student points and market inventory to zero. Accounts, school years and audit logs are preserved.
        </p>
        <button
          type="button"
          disabled={!status?.schoolYear || clearing || seeding || !hasYearData}
          onClick={() => setClearOpen(true)}
          className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold rounded-xl shadow-sm flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {clearing ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          {clearing ? 'Clearing…' : 'Clear Activity'}
        </button>
      </div>

      {/* Confirm generate */}
      <AppModal
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          if (!open) setConfirmText('');
        }}
        icon={<DatabaseZap className="w-6 h-6" />}
        title={reseed ? 'Replace and regenerate this year?' : 'Generate year data?'}
        description={
          reseed
            ? 'Existing activity for the active school year will be deleted, then a fresh dataset will be generated.'
            : 'A full dataset will be generated for the active school year using real synced accounts.'
        }
        size="sm"
        confirmLabel={seeding ? 'Generating…' : 'Generate'}
        loading={seeding}
        confirmDisabled={reseed && confirmText.trim().toUpperCase() !== 'RESEED'}
        onConfirm={handleRunSeed}
      >
        <div className="space-y-3 text-sm text-[var(--text-strong)]/70">
          <div className="flex items-center gap-2">
            <Users size={14} className="text-[var(--accent)]" />
            <span>
              {formatNumber(status?.students.active ?? 0)} active students · {volume.toLowerCase()} volume
            </span>
          </div>
          {reseed && (
            <label className="block space-y-1">
              <span className="text-xs font-bold text-[var(--text-strong)]/50 uppercase tracking-wider">
                Type RESEED to confirm
              </span>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="RESEED"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--primary)]/10 bg-[color-mix(in_srgb,var(--background)_60%,white)] text-sm text-[var(--text-strong)] outline-none focus:border-[var(--accent)] focus:bg-white transition-all"
              />
            </label>
          )}
        </div>
      </AppModal>

      {/* Confirm clear */}
      <AppModal
        open={clearOpen}
        onOpenChange={(open) => {
          setClearOpen(open);
          if (!open) setClearText('');
        }}
        icon={<Trash2 className="w-6 h-6" />}
        title="Clear the active year's activity?"
        description="This permanently deletes the active school year's reports, points, walk-ins, claims, offenses and sales."
        size="sm"
        destructive
        confirmLabel={clearing ? 'Clearing…' : 'Clear Activity'}
        loading={clearing}
        confirmDisabled={clearText.trim().toUpperCase() !== 'CLEAR'}
        onConfirm={handleClearYear}
      >
        <label className="block space-y-1">
          <span className="text-xs font-bold text-[var(--text-strong)]/50 uppercase tracking-wider">
            Type CLEAR to confirm
          </span>
          <input
            type="text"
            value={clearText}
            onChange={(e) => setClearText(e.target.value)}
            placeholder="CLEAR"
            className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--primary)]/10 bg-[color-mix(in_srgb,var(--background)_60%,white)] text-sm text-[var(--text-strong)] outline-none focus:border-rose-400 focus:bg-white transition-all"
          />
        </label>
      </AppModal>
    </div>
  );
};

const ResultStat: React.FC<{ label: string; value: string; sub: string }> = ({ label, value, sub }) => (
  <div>
    <p className="text-[10px] font-bold text-emerald-700/50 uppercase tracking-wider">{label}</p>
    <p className="text-xl font-black text-emerald-900">{value}</p>
    <p className="text-[11px] text-emerald-700/60">{sub}</p>
  </div>
);
