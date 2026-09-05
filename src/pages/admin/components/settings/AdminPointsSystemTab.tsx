import React, { useState, useEffect } from 'react';
import { Award, Edit2, Check, X, Trophy } from 'lucide-react';
import { apiService } from '../../../../services/api';
import { broadcastPresetChange } from '../../../../hooks/useSystemPresets';

interface PointRuleItem {
  id: string;
  rank: number;
  title: string;
  pointsAwarded: number;
  description: string;
}

const DEFAULT_POINT_RULES: PointRuleItem[] = [
  { id: 'p-1', rank: 1, title: '1st Reporter', pointsAwarded: 15, description: '🔥 15 points awarded' },
  { id: 'p-2', rank: 2, title: '2nd Reporter', pointsAwarded: 10, description: '🔥 10 points awarded' },
  { id: 'p-3', rank: 3, title: '3rd Reporter', pointsAwarded: 5, description: '🔥 5 points awarded' },
  { id: 'p-4', rank: 4, title: '4th+ Reporter', pointsAwarded: 0, description: 'No points awarded' },
];

export const AdminPointsSystemTab: React.FC = () => {
  const [pointRules, setPointRules] = useState<PointRuleItem[]>(DEFAULT_POINT_RULES);
  const [editingRule, setEditingRule] = useState<PointRuleItem | null>(null);

  useEffect(() => {
    apiService.getPointRules().then((data) => {
      if (Array.isArray(data) && data.length > 0) {
        setPointRules(data);
      }
    }).catch(err => console.warn('Failed to fetch point rules:', err));
  }, []);

  const handleSavePoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRule) return;

    const id = editingRule.id;
    const pointsAwarded = Number(editingRule.pointsAwarded);
    const description = pointsAwarded > 0 ? `🔥 ${pointsAwarded} points awarded` : 'No points awarded';

    setPointRules(prev => prev.map(r => r.id === id ? { ...r, pointsAwarded, description } : r));
    setEditingRule(null);

    try {
      await apiService.updatePointRule(id, { pointsAwarded, description });
    } catch (err) {
      console.error('Failed to update point rule:', err);
    } finally {
      broadcastPresetChange();
    }
  };

  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-3xl p-8 shadow-sm space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-black text-amber-900 flex items-center gap-2">
            <Trophy size={22} className="text-amber-600" />
            Points System Rules
          </h3>
          <p className="text-sm text-amber-900/50 mt-1">
            When the same bin is reported by multiple users, points are awarded based on rank priority after admin verification.
          </p>
        </div>
      </div>

      <div className="space-y-3 pt-2">
        {pointRules.map((rule) => {
          const borderClass =
            rule.rank === 1
              ? 'border-amber-200'
              : rule.rank === 2
              ? 'border-sky-200'
              : rule.rank === 3
              ? 'border-orange-200'
              : 'border-gray-200 opacity-60';

          const textClass =
            rule.rank === 1
              ? 'text-amber-600'
              : rule.rank === 2
              ? 'text-sky-600'
              : rule.rank === 3
              ? 'text-orange-600'
              : 'text-gray-500';

          return (
            <div key={rule.id || rule.rank} className={`p-5 bg-white rounded-2xl border ${borderClass} flex justify-between items-center shadow-xs`}>
              <div>
                <p className="font-bold text-[#00271D] text-sm">{rule.title}</p>
                <p className="text-xs text-[#00271D]/50">{rule.description}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className={`text-xl font-black ${textClass}`}>{rule.pointsAwarded} pts</span>
                <button
                  type="button"
                  onClick={() => setEditingRule(rule)}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
                >
                  <Edit2 size={14} /> Edit
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Points Modal */}
      {editingRule && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl border border-white space-y-5 animate-fade-in">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <h3 className="text-2xl font-black text-[#00271D]">Edit Points for {editingRule.title}</h3>
              <button type="button" onClick={() => setEditingRule(null)} className="text-[#00271D]/40 hover:text-[#00271D]">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSavePoints} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#00271D]/50 uppercase">Points Awarded</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={editingRule.pointsAwarded}
                  onChange={(e) => setEditingRule({ ...editingRule, pointsAwarded: Number(e.target.value) })}
                  className="w-full mt-1.5 p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold outline-none focus:border-amber-500 text-amber-700"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditingRule(null)} className="px-5 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 cursor-pointer text-sm">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-xl shadow-md cursor-pointer text-sm">
                  Save Points
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
