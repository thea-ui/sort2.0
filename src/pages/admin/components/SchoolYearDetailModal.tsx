import React, { useEffect, useState } from 'react';
import { useSchoolYear } from '../../../hooks/useSchoolYear';
import { X, RefreshCw, AlertTriangle } from 'lucide-react';

interface SchoolYearDetailModalProps {
  schoolYearId: string | null;
  onClose: () => void;
}

export const SchoolYearDetailModal: React.FC<SchoolYearDetailModalProps> = ({ schoolYearId, onClose }) => {
  const { getSchoolYearDetails } = useSchoolYear();
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!schoolYearId) {
      setDetails(null);
      setError(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);
    getSchoolYearDetails(schoolYearId)
      .then((data) => { if (isMounted) setDetails(data); })
      .catch((err: any) => { if (isMounted) setError(err.message || 'Failed to load school year'); })
      .finally(() => { if (isMounted) setLoading(false); });

    return () => { isMounted = false; };
  }, [schoolYearId, getSchoolYearDetails]);

  useEffect(() => {
    if (!schoolYearId) return;
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [schoolYearId, onClose]);

  if (!schoolYearId) return null;

  const statusLabel = details?.isActive ? 'Active' : details?.isArchived ? 'Archived' : 'Inactive';

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden max-h-[85vh] overflow-y-auto">
        <div className="bg-gradient-to-br from-[#00271D] to-[#003a2b] px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <span className="text-[9px] font-bold text-white/50 uppercase tracking-wider">School Year Details</span>
            <h3 className="text-lg font-bold text-white">SY {details?.label || '…'}</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-white/40 hover:text-white cursor-pointer" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {loading && (
            <div className="py-12 text-center">
              <RefreshCw size={20} className="mx-auto text-gray-300 animate-spin" />
              <p className="text-xs text-gray-400 mt-2">Loading details…</p>
            </div>
          )}

          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2 text-xs text-rose-700">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && details && (
            <>
              <div className="flex items-center gap-3 text-xs text-[#00271D]/70">
                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
                  details.isActive ? 'bg-[#00A77C]/10 text-[#00A77C] border border-[#00A77C]/20' :
                  details.isArchived ? 'bg-gray-100 text-gray-500 border border-gray-200' :
                  'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  {statusLabel}
                </span>
                <span>
                  {new Date(details.startDate).toLocaleDateString()} — {new Date(details.endDate).toLocaleDateString()}
                </span>
              </div>

              {details.enrollproId && (
                <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 text-xs text-sky-700">
                  Linked to EnrollPro ID: <strong>{details.enrollproId}</strong>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-black text-[#00271D]">{details._count?.reports || 0}</p>
                  <p className="text-[10px] text-gray-400 font-bold">Reports</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-black text-[#00271D]">{details._count?.pointHistories || 0}</p>
                  <p className="text-[10px] text-gray-400 font-bold">Point Transactions</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-black text-[#00271D]">{details._count?.offenses || 0}</p>
                  <p className="text-[10px] text-gray-400 font-bold">Offenses</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-black text-[#00271D]">{details._count?.saleTransactions || 0}</p>
                  <p className="text-[10px] text-gray-400 font-bold">Sales</p>
                </div>
              </div>

              {details.marketStockSnapshots?.length > 0 && (
                <div>
                  <h5 className="text-xs font-bold text-[#00271D] mb-2">Market Stock Snapshots</h5>
                  <div className="space-y-2">
                    {details.marketStockSnapshots.map((snap: any) => (
                      <div key={snap.id} className="flex justify-between items-center text-xs bg-gray-50 rounded-xl p-3">
                        <span className="font-bold text-[#00271D]">{snap.categoryName}</span>
                        <span className="text-gray-500">
                          {snap.openingKg > 0 && `Opening: ${snap.openingKg}kg · `}
                          Closing: {snap.closingKg}kg
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {details.pointSnapshots?.length > 0 && (
                <div>
                  <h5 className="text-xs font-bold text-[#00271D] mb-2">Top Students (Archived Points)</h5>
                  <div className="space-y-2">
                    {details.pointSnapshots.slice(0, 10).map((snap: any, idx: number) => (
                      <div key={snap.id} className="flex justify-between items-center text-xs bg-gray-50 rounded-xl p-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-gray-400 w-5">#{idx + 1}</span>
                          <span className="font-bold text-[#00271D]">{snap.user?.name || 'Unknown'}</span>
                        </div>
                        <span className="font-black text-[#00A77C]">{snap.closingPoints} pts</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
