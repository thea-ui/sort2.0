import React, { useState, useEffect } from 'react';
import { ClipboardList, RefreshCw, Download, Search, AlertCircle, User as UserIcon } from 'lucide-react';
import { apiService } from '../../../services/api';

interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: string;
  actionType: string;
  details: string;
}

export const AdminAuditLogsTab: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await apiService.getAuditLogs();
      if (Array.isArray(data)) {
        setLogs(data.map((l: any) => ({
          id: l.id,
          timestamp: new Date(l.createdAt).toLocaleString(),
          actorName: l.actorName,
          actorRole: l.actorRole,
          actionType: l.actionType,
          details: l.details,
        })));
      }
    } catch (err) {
      console.warn('Failed to fetch audit logs:', err);
    }
    setLoading(false);
  };

  useEffect(() => { loadLogs(); }, []);

  const filtered = logs.filter(log => {
    const matchesSearch =
      log.actorName.toLowerCase().includes(search.toLowerCase()) ||
      log.details.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = actionFilter === 'ALL' || log.actionType === actionFilter;
    return matchesSearch && matchesFilter;
  });

  const getActionTypeStyle = (type: string) => {
    switch (type) {
      case 'AUTH': return 'bg-amber-100/80 text-amber-800 border-amber-200';
      case 'DISMISSAL': return 'bg-gray-100 text-gray-600 border-gray-200';
      case 'VERIFICATION': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'DISPATCH': return 'bg-[var(--primary)]/10 text-[var(--text-strong)] border-[var(--primary)]/25';
      case 'SYNC': return 'bg-[var(--gold)]/10 text-[var(--gold)] border-[var(--gold)]/25';
      case 'REPORT': return 'bg-[var(--primary)]/10 text-[var(--text-strong)] border-[var(--primary)]/25';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-[var(--text-strong)] tracking-tight flex items-center gap-2">
            <ClipboardList className="text-[var(--accent)]" size={24} />
            Audit Logs
          </h2>
          <p className="text-sm text-[var(--text-strong)]/50 mt-0.5">
            Monitor all system activities and administrative changes
          </p>
        </div>
        <button
          type="button"
          onClick={loadLogs}
          className="p-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl shadow-sm hover:bg-gray-50 cursor-pointer"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-3 text-[var(--text-strong)]/40" />
          <input
            type="text"
            placeholder="Search by actor name or details..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white border border-[var(--primary)]/10 rounded-2xl pl-9 pr-3 py-2.5 text-sm text-[var(--text-strong)] outline-none focus:border-[var(--accent)]"
          />
        </div>
        <select
          value={actionFilter}
          onChange={e => setActionFilter(e.target.value)}
          className="bg-white border border-[var(--primary)]/10 rounded-2xl px-4 py-2.5 text-sm text-[var(--text-strong)] outline-none cursor-pointer"
        >
          <option value="ALL">All Actions</option>
          <option value="AUTH">Login / Auth</option>
          <option value="REPORT">Report</option>
          <option value="DISPATCH">Dispatch</option>
          <option value="SYNC">Sync</option>
        </select>
      </div>

      <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-[var(--primary)]/8 text-[var(--text-strong)]/40 font-bold uppercase tracking-wider bg-gray-50/50">
                <th className="py-3.5 px-6">Timestamp</th>
                <th className="py-3.5 px-6">Actor</th>
                <th className="py-3.5 px-6">Action</th>
                <th className="py-3.5 px-6">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--primary)]/5">
              {loading ? (
                <tr><td colSpan={4} className="py-12 text-center text-[var(--text-strong)]/40">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={4} className="py-12 text-center text-[var(--text-strong)]/40">No audit logs found</td></tr>
              ) : filtered.map(log => (
                <tr key={log.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="py-4 px-6 font-mono text-xs font-bold text-[var(--text-strong)]/60 whitespace-nowrap">
                    {log.timestamp}
                  </td>
                  <td className="py-4 px-6 font-bold text-[var(--text-strong)]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center">
                        <UserIcon size={14} />
                      </div>
                      <div>
                        <p className="leading-tight">{log.actorName}</p>
                        <p className="text-[10px] text-[var(--text-strong)]/40 font-black uppercase">{log.actorRole}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${getActionTypeStyle(log.actionType)}`}>
                      {log.actionType}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-[var(--text-strong)]/70 font-medium">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-[#0b141a] text-white rounded-3xl p-5 shadow-lg flex items-center gap-4 border border-white/10">
        <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl shrink-0">
          <AlertCircle size={22} />
        </div>
        <div>
          <h4 className="text-sm font-black uppercase tracking-wider text-white">Security Advisory</h4>
          <p className="text-sm text-white/60 mt-0.5">Audit logs are stored securely. System-level events are logged automatically.</p>
        </div>
      </div>
    </div>
  );
};
