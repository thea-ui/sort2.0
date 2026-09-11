import React, { useState, useEffect } from 'react';
import { RefreshCw, Settings, Clock, CheckCircle2, XCircle, AlertTriangle, Loader2, Users, ShieldCheck, Recycle } from 'lucide-react';
import { apiService } from '../../../../services/api';

interface SyncStatus {
  lastSync: {
    id: string;
    status: string;
    recordsPulled: number;
    recordsCreated: number;
    recordsUpdated: number;
    recordsDeleted: number;
    durationMs: number;
    schoolYearLabel: string;
    error: string;
    message: string | null;
    createdAt: string;
  } | null;
  history: Array<{
    id: string;
    status: string;
    recordsPulled: number;
    recordsCreated: number;
    recordsUpdated: number;
    recordsDeleted: number;
    durationMs: number;
    message?: string | null;
    createdAt: string;
  }>;
}

export const AdminSyncSettingsTab: React.FC = () => {
  const [syncMode, setSyncMode] = useState<'MANUAL' | 'AUTO'>('MANUAL');
  const [intervalMinutes, setIntervalMinutes] = useState(60);
  const [binResetEnabled, setBinResetEnabled] = useState(true);
  const [binResetTime, setBinResetTime] = useState('18:00');
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [loginReadiness, setLoginReadiness] = useState<{ ready: number; total: number } | null>(null);

  const loadSettings = async () => {
    try {
      const settings = await apiService.getSettings();
      if (settings) {
        setSyncMode(settings.syncMode || 'MANUAL');
        setIntervalMinutes(settings.syncIntervalMinutes || 60);
        setBinResetEnabled(settings.binResetEnabled !== false);
        setBinResetTime(settings.binResetTime || '18:00');
      }
    } catch (err) {
      console.warn('Failed to load sync settings:', err);
    }
  };

  const loadStatus = async () => {
    try {
      const token = sessionStorage.getItem('sortv2_token');
      const res = await fetch('http://localhost:5000/api/sync/status', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSyncStatus(data);
      }
    } catch (err) {
      console.warn('Failed to load sync status:', err);
    }
  };

  const loadLoginReadiness = async () => {
    try {
      const users = await apiService.getUsers();
      if (users && Array.isArray(users)) {
        const students = users.filter((u: any) => u.role === 'STUDENT' && u.syncSource === 'ENROLLPRO');
        const ready = students.filter((u: any) => u.portalAccountActive !== false).length;
        setLoginReadiness({ ready, total: students.length });
      }
    } catch (err) {
      console.warn('Failed to load login readiness:', err);
    }
  };

  useEffect(() => {
    Promise.all([loadSettings(), loadStatus(), loadLoginReadiness()]).finally(() => setLoading(false));
  }, []);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await apiService.updateSettings({ syncMode, syncIntervalMinutes: intervalMinutes, binResetEnabled, binResetTime });
      showToast('success', 'Settings saved — daily bin reset updated');
    } catch (err) {
      showToast('error', 'Failed to save settings');
    }
    setSaving(false);
  };

  const handleRunSync = async () => {
    setSyncing(true);
    try {
      const token = sessionStorage.getItem('sortv2_token');
      const res = await fetch('http://localhost:5000/api/sync/all', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showToast('success', 'Sync completed successfully');
        await loadStatus();
      } else {
        const data = await res.json().catch(() => ({}));
        showToast('error', data.error || 'Sync failed');
      }
    } catch (err) {
      showToast('error', 'Sync failed — server unreachable');
    }
    setSyncing(false);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
    });
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUCCESS': return <CheckCircle2 size={14} className="text-emerald-500" />;
      case 'PARTIAL': return <AlertTriangle size={14} className="text-amber-500" />;
      case 'FAILED': return <XCircle size={14} className="text-rose-500" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCESS': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'PARTIAL': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'FAILED': return 'text-rose-600 bg-rose-50 border-rose-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-[#00A77C]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-bold ${
          toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div>
        <h3 className="text-2xl font-black text-[#00271D] flex items-center gap-2">
          <Settings size={22} className="text-[#00A77C]" />
          Sync & Integrations
        </h3>
        <p className="text-sm text-[#00271D]/50 mt-0.5">
          Manage EnrollPro synchronization settings and view sync history.
        </p>
      </div>

      {/* Sync Mode Card */}
      <div className="rounded-2xl border border-[#00271D]/10 bg-white p-6 space-y-4">
        <h4 className="text-lg font-bold text-[#00271D]">Sync Mode</h4>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setSyncMode('MANUAL')}
            className={`flex-1 px-4 py-3 rounded-xl text-sm font-bold border-2 transition-all ${
              syncMode === 'MANUAL'
                ? 'border-[#00A77C] bg-[#00A77C]/5 text-[#00A77C]'
                : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300'
            }`}
          >
            Manual
          </button>
          <button
            type="button"
            onClick={() => setSyncMode('AUTO')}
            className={`flex-1 px-4 py-3 rounded-xl text-sm font-bold border-2 transition-all ${
              syncMode === 'AUTO'
                ? 'border-[#00A77C] bg-[#00A77C]/5 text-[#00A77C]'
                : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300'
            }`}
          >
            Automatic
          </button>
        </div>

        {syncMode === 'AUTO' && (
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#00271D]/50 uppercase tracking-wider">
              Sync Interval (minutes)
            </label>
            <input
              type="number"
              min={5}
              max={1440}
              value={intervalMinutes}
              onChange={(e) => setIntervalMinutes(Math.max(5, parseInt(e.target.value) || 60))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#00271D]/10 bg-[#F9F3F0]/60 text-sm text-[#00271D] outline-none focus:border-[#00A77C] focus:bg-white transition-all"
            />
            <p className="text-xs text-[#00271D]/40">
              Minimum 5 minutes. Sync will run automatically at this interval.
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={handleSaveSettings}
          disabled={saving}
          className="px-5 py-2.5 bg-[#00A77C] hover:bg-[#008f6a] text-white text-sm font-bold rounded-xl shadow-sm flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Settings size={14} />}
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Manual Sync Card */}
      <div className="rounded-2xl border border-[#00271D]/10 bg-white p-6 space-y-4">
        <h4 className="text-lg font-bold text-[#00271D]">Run Bulk Sync</h4>
        <p className="text-sm text-[#00271D]/50">
          Pull all users and term calendars from EnrollPro now. This runs the same sync engine as the CLI command.
        </p>
        <button
          type="button"
          onClick={handleRunSync}
          disabled={syncing}
          className="px-6 py-3 bg-[#00A77C] hover:bg-[#008f6a] text-white text-sm font-bold rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
        >
          <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Syncing...' : 'Run Bulk Sync Now'}
        </button>
      </div>

      {/* Daily Bin Reset Card */}
      <div className="rounded-2xl border border-[#00271D]/10 bg-white p-6 space-y-4">
        <h4 className="text-lg font-bold text-[#00271D] flex items-center gap-2">
          <Recycle size={18} className="text-rose-500" />
          Daily Bin Reset
        </h4>
        <p className="text-sm text-[#00271D]/50">
          The school clears all bins at the configured time each day. At reset, bin fill levels return to 0 and
          stale waste reports (pending or dispatched but never collected) are auto-expired — neutral, no penalties,
          no point changes. Asset reports are never touched.
        </p>

        <div className="flex flex-wrap items-center gap-5">
          <label className="flex items-center gap-2 text-sm font-bold text-[#00271D] cursor-pointer">
            <input
              type="checkbox"
              checked={binResetEnabled}
              onChange={(e) => setBinResetEnabled(e.target.checked)}
              className="h-4 w-4 accent-[#00A77C]"
            />
            Enable daily bin reset
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-bold text-[#00271D]/50 uppercase tracking-wider">Reset Time (24h)</span>
            <input
              type="time"
              value={binResetTime}
              onChange={(e) => setBinResetTime(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl border border-[#00271D]/10 bg-[#F9F3F0]/60 text-sm text-[#00271D] outline-none focus:border-[#00A77C] focus:bg-white transition-all"
            />
          </label>
        </div>

        <button
          type="button"
          onClick={handleSaveSettings}
          disabled={saving}
          className="px-5 py-2.5 bg-[#00A77C] hover:bg-[#008f6a] text-white text-sm font-bold rounded-xl shadow-sm flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Settings size={14} />}
          {saving ? 'Saving...' : 'Save Bin Reset'}
        </button>
      </div>

      {/* Last Sync Summary */}
      {syncStatus?.lastSync && (
        <div className="rounded-2xl border border-[#00271D]/10 bg-white p-6 space-y-4">
          <h4 className="text-lg font-bold text-[#00271D]">Last Sync</h4>

          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(syncStatus.lastSync.status)}`}>
            {getStatusIcon(syncStatus.lastSync.status)}
            {syncStatus.lastSync.status}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
            <div>
              <p className="text-[10px] font-bold text-[#00271D]/40 uppercase tracking-wider">Pulled</p>
              <p className="text-xl font-black text-[#00271D]">{syncStatus.lastSync.recordsPulled}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-[#00271D]/40 uppercase tracking-wider">Created</p>
              <p className="text-xl font-black text-emerald-600">{syncStatus.lastSync.recordsCreated}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-[#00271D]/40 uppercase tracking-wider">Updated</p>
              <p className="text-xl font-black text-blue-600">{syncStatus.lastSync.recordsUpdated}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-[#00271D]/40 uppercase tracking-wider">Archived</p>
              <p className="text-xl font-black text-rose-600">{syncStatus.lastSync.recordsDeleted}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-[#00271D]/50">
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {formatDate(syncStatus.lastSync.createdAt)}
            </span>
            <span>Duration: {formatDuration(syncStatus.lastSync.durationMs || 0)}</span>
            {syncStatus.lastSync.schoolYearLabel && <span>SY: {syncStatus.lastSync.schoolYearLabel}</span>}
          </div>

          {syncStatus.lastSync.message && (
            <div className="mt-2 p-3 bg-sky-50 border border-sky-100 rounded-xl text-xs text-sky-700 font-semibold flex items-start gap-2">
              <AlertTriangle size={13} className="text-sky-600 shrink-0 mt-0.5" />
              <span>{syncStatus.lastSync.message}</span>
            </div>
          )}

          {syncStatus.lastSync.error && (
            <div className="mt-2 p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-700">
              {syncStatus.lastSync.error}
            </div>
          )}
        </div>
      )}

      {/* Login Readiness Summary */}
      {loginReadiness && (
        <div className="rounded-2xl border border-[#00271D]/10 bg-white p-6 space-y-4">
          <h4 className="text-lg font-bold text-[#00271D] flex items-center gap-2">
            <ShieldCheck size={18} className="text-[#00A77C]" />
            Student Login Readiness
          </h4>
          <p className="text-sm text-[#00271D]/50">
            Students with active EnrollPro portal accounts who can log in to SORT.
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <Users size={20} className="text-[#00A77C]" />
              <div>
                <p className="text-2xl font-black text-[#00271D]">
                  {loginReadiness.ready}
                  <span className="text-base font-bold text-[#00271D]/40"> / {loginReadiness.total}</span>
                </p>
                <p className="text-[10px] font-bold text-[#00271D]/40 uppercase tracking-wider">Students Login-Ready</p>
              </div>
            </div>
            {loginReadiness.ready < loginReadiness.total && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold">
                <AlertTriangle size={12} />
                {loginReadiness.total - loginReadiness.ready} student{loginReadiness.total - loginReadiness.ready !== 1 ? 's' : ''} without an activated EnrollPro portal account
              </div>
            )}
            {loginReadiness.ready === loginReadiness.total && loginReadiness.total > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                <CheckCircle2 size={12} />
                All students can log in
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sync History */}
      {syncStatus?.history && syncStatus.history.length > 0 && (
        <div className="rounded-2xl border border-[#00271D]/10 bg-white p-6 space-y-4">
          <h4 className="text-lg font-bold text-[#00271D]">Sync History</h4>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {syncStatus.history.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between px-4 py-3 rounded-xl bg-[#F9F3F0]/60 border border-[#00271D]/5"
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(log.status)}
                  <div>
                    <p className="text-xs font-bold text-[#00271D]">{log.status}</p>
                    <p className="text-[10px] text-[#00271D]/40">{formatDate(log.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-[#00271D]/50">
                  <span>{log.recordsPulled} pulled</span>
                  <span>{log.recordsCreated} created</span>
                  <span>{log.recordsUpdated} updated</span>
                  <span>{log.recordsDeleted} archived</span>
                  <span>{formatDuration(log.durationMs || 0)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
