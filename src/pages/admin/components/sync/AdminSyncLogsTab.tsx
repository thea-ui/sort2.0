import React, { useState } from 'react';
import { Activity, RefreshCw } from 'lucide-react';
import type { SyncLog } from '../../../../types';

interface AdminSyncLogsTabProps {
  syncLogs: SyncLog[];
  onTriggerSync: () => void;
}

export const AdminSyncLogsTab: React.FC<AdminSyncLogsTabProps> = ({ syncLogs, onTriggerSync }) => {
  const [syncing, setSyncing] = useState(false);

  const handleSyncClick = () => {
    setSyncing(true);
    setTimeout(() => {
      onTriggerSync();
      setSyncing(false);
    }, 1500);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <span className="text-[10px] font-bold text-[var(--accent)] bg-[var(--accent)]/10 border border-[var(--accent)]/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
          Sync Logs
        </span>
        <h3 className="text-xl font-bold text-[var(--text-strong)] tracking-tight mt-1.5">
          Simulated Sync Transmissions
        </h3>
        <p className="text-xs text-[var(--text-strong)]/50 mt-0.5">
          Monitor and trigger data synchronization between campus systems and the main server.
        </p>
      </div>

      <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-[var(--accent)]" />
            <h4 className="text-sm font-bold text-[var(--text-strong)]">Database Transmissions Log</h4>
          </div>

          <button
            type="button"
            onClick={handleSyncClick}
            disabled={syncing}
            className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-dark)] disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-md shadow-[var(--accent)]/20 flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing...' : 'Simulate Synchronization'}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[var(--primary)]/10 text-[var(--text-strong)]/40 font-bold uppercase tracking-wider bg-[var(--accent)]/5">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Target System</th>
                <th className="py-3 px-4">Records Synced</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--primary)]/5">
              {syncLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center">
                    <div className="space-y-2">
                      <div className="h-10 w-10 mx-auto rounded-xl bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center">
                        <RefreshCw size={20} />
                      </div>
                      <p className="text-sm font-bold text-[var(--text-strong)]">No sync tasks logged yet.</p>
                      <p className="text-xs text-[var(--text-strong)]/40">
                        Trigger a sync above to see logs appear here.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                syncLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[var(--accent)]/5 transition-colors">
                    <td className="py-3 px-4 font-mono text-[var(--text-strong)]/60 text-[11px]">
                      {log.timestamp}
                    </td>
                    <td className="py-3 px-4 font-bold text-[var(--text-strong)]">{log.system}</td>
                    <td className="py-3 px-4 font-mono text-[var(--text-strong)]/70">
                      {log.recordsSynced}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/20 px-2.5 py-0.5 text-[9px] font-black uppercase text-[var(--accent)]">
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
