import React, { useState, useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { apiService } from '../../../services/api';
import { DataTable } from '../../../components/data-table';
import type { TableColumn } from '../../../components/data-table';
import { PageHeader } from '../../../components/layout/PageHeader';

interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: string;
  actionType: string;
  details: string;
}

const ACTION_TYPE_STYLE = (type: string): string => {
  switch (type) {
    case 'AUTH':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'DISMISSAL':
      return 'bg-[color-mix(in_srgb,var(--primary)_5%,white)] text-[var(--text-strong)]/60 border-[var(--primary)]/10';
    case 'VERIFICATION':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'DISPATCH':
      return 'bg-[color-mix(in_srgb,var(--primary)_10%,white)] text-[var(--text-strong)] border-[var(--primary)]/25';
    case 'SYNC':
      return 'bg-[color-mix(in_srgb,var(--gold)_10%,white)] text-[var(--gold)] border-[var(--gold)]/25';
    case 'REPORT':
      return 'bg-[color-mix(in_srgb,var(--primary)_10%,white)] text-[var(--text-strong)] border-[var(--primary)]/25';
    default:
      return 'bg-[color-mix(in_srgb,var(--primary)_5%,white)] text-[var(--text-strong)]/70 border-[var(--primary)]/10';
  }
};

export const AdminAuditLogsTab: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [actionFilter, setActionFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getAuditLogs();
      if (Array.isArray(data)) {
        setLogs(
          data.map((l: any) => ({
            id: l.id,
            timestamp: new Date(l.createdAt).toLocaleString(),
            actorName: l.actorName,
            actorRole: l.actorRole,
            actionType: l.actionType,
            details: l.details,
          })),
        );
      }
    } catch (err) {
      setError('Failed to load audit logs. Please try again.');
      console.warn('Failed to fetch audit logs:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filtered = logs.filter(
    (log) => actionFilter === 'ALL' || log.actionType === actionFilter,
  );

  const columns: TableColumn<AuditLogEntry>[] = [
    {
      key: 'timestamp',
      header: 'Timestamp',
      skeleton: 'date',
      cell: (log) => (
        <span className="font-mono text-xs font-bold text-[var(--text-strong)]/60 whitespace-nowrap">
          {log.timestamp}
        </span>
      ),
    },
    {
      key: 'actor',
      header: 'Actor',
      skeleton: 'avatar',
      cell: (log) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-[color-mix(in_srgb,var(--primary)_10%,white)] text-[var(--text-strong)]/60 flex items-center justify-center">
            <span className="text-[10px] font-black">{log.actorName.charAt(0)}</span>
          </div>
          <div>
            <p className="leading-tight font-bold">{log.actorName}</p>
            <p className="text-[10px] text-[var(--text-strong)]/40 font-black uppercase">
              {log.actorRole}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      skeleton: 'pill',
      cell: (log) => (
        <span
          className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${ACTION_TYPE_STYLE(
            log.actionType,
          )}`}
        >
          {log.actionType}
        </span>
      ),
    },
    {
      key: 'details',
      header: 'Details',
      skeleton: 'text',
      cell: (log) => (
        <span className="text-[var(--text-strong)]/70 font-medium">{log.details}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Audit Logs"
        description="Monitor all system activities and administrative changes"
        actions={
          <button
            type="button"
            onClick={loadLogs}
            aria-label="Refresh audit logs"
            className="p-2.5 bg-white border border-[var(--primary)]/10 text-[var(--text-strong)]/60 rounded-xl shadow-sm hover:bg-[color-mix(in_srgb,var(--primary)_5%,white)] cursor-pointer transition-colors"
          >
            <RefreshCw size={14} />
          </button>
        }
      />

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(log) => log.id}
        loading={loading}
        error={error}
        onRetry={loadLogs}
        searchable
        searchPlaceholder="Search by actor name or details..."
        searchText={(log) => `${log.actorName} ${log.details}`}
        filters={[
          {
            label: 'Action',
            value: actionFilter,
            onChange: setActionFilter,
            options: [
              { label: 'All Actions', value: 'ALL' },
              { label: 'Login / Auth', value: 'AUTH' },
              { label: 'Report', value: 'REPORT' },
              { label: 'Dispatch', value: 'DISPATCH' },
              { label: 'Sync', value: 'SYNC' },
            ],
          },
        ]}
        emptyTitle="No audit logs found"
        emptyHint="System activity will appear here as it happens."
      />

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-center gap-4">
        <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl shrink-0">
          <AlertCircle size={22} />
        </div>
        <div>
          <h4 className="text-sm font-black uppercase tracking-wider text-amber-800">
            Security Advisory
          </h4>
          <p className="text-sm text-amber-700/80 mt-0.5">
            Audit logs are stored securely. System-level events are logged automatically.
          </p>
        </div>
      </div>
    </div>
  );
};
