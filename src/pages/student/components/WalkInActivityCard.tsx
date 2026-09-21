import React, { useEffect, useState } from 'react';
import { Recycle, Loader2, Scale } from 'lucide-react';
import { apiService } from '../../../services/api';
import { WalkInProgress, WalkInTurnover } from '../../../types';
import { formatLitres } from '../../../hooks/useWalkInTurnover';

export const WalkInActivityCard: React.FC = () => {
  const [turnovers, setTurnovers] = useState<WalkInTurnover[]>([]);
  const [progress, setProgress] = useState<WalkInProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    apiService
      .getMyWalkIns(10)
      .then((res) => {
        if (cancelled) return;
        setTurnovers(res.turnovers || []);
        setProgress(res.progress || null);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-[#00271D]/50 uppercase tracking-widest flex items-center gap-2">
          <Recycle size={14} className="text-[#00A77C]" />
          <span>Bottle Turn-ins</span>
        </h3>
        {progress && progress.yearGrams > 0 && (
          <span className="flex items-center gap-1 text-[10px] font-black text-[#00A77C] bg-[#00A77C]/10 border border-[#00A77C]/25 px-2.5 py-1 rounded-full">
            <Scale size={11} /> {(progress.yearGrams / 1000).toFixed(2)} kg this year
          </span>
        )}
      </div>

      {loading ? (
        <div className="py-6 text-center">
          <Loader2 size={18} className="mx-auto text-[#00A77C] animate-spin" />
        </div>
      ) : turnovers.length === 0 ? (
        <p className="text-xs text-[#00271D]/50 font-medium text-center py-6">
          No bottle turn-ins yet. Bring plastic bottles to the MRF Walk-in Station to earn points and
          unlock prizes!
        </p>
      ) : (
        <div className="space-y-2">
          {turnovers.map((turnover) => (
            <div
              key={turnover.id}
              className="flex items-center justify-between gap-3 bg-gray-50 rounded-xl px-3.5 py-2.5 border border-gray-100"
            >
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#00271D]">
                  {new Date(turnover.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}{' '}
                  · {turnover.totalBottles} bottle{turnover.totalBottles === 1 ? '' : 's'}
                </p>
                <p className="text-[10px] text-[#00271D]/50 font-semibold">
                  {formatLitres(turnover.totalMl)} L · {(turnover.totalGrams / 1000).toFixed(2)} kg
                </p>
              </div>
              <span className="text-xs font-black text-[#00A77C] shrink-0">+{turnover.pointsAwarded} pts</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
