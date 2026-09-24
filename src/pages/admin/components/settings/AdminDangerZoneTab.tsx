import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface AdminDangerZoneTabProps {
  onReset: () => void;
}

export const AdminDangerZoneTab: React.FC<AdminDangerZoneTabProps> = ({ onReset }) => (
  <div className="bg-rose-50/80 border border-rose-200 rounded-3xl p-6 shadow-sm space-y-4">
    <div className="flex items-center gap-3">
      <div className="p-2.5 bg-rose-500 text-white rounded-xl">
        <AlertTriangle size={20} />
      </div>
      <div>
        <h3 className="text-sm font-extrabold text-rose-700">Danger Zone</h3>
        <p className="text-xs text-rose-600/80">Actions here are destructive and permanent.</p>
      </div>
    </div>

    <div className="p-5 bg-white border border-rose-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div>
        <p className="font-extrabold text-sm text-[var(--text-strong)]">Reset All App Data</p>
        <p className="text-xs text-[var(--text-strong)]/60 mt-0.5">
          Wipe all reports, points, history, and challenges. Every student and reporter will start
          from 0.
        </p>
      </div>
      <button
        type="button"
        onClick={onReset}
        className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all shrink-0"
      >
        Reset All Data
      </button>
    </div>
  </div>
);
