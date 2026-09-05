import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Gauge } from 'lucide-react';
import { apiService } from '../../../../services/api';
import { broadcastPresetChange } from '../../../../hooks/useSystemPresets';

interface UrgencyItem {
  id: string;
  level: string;
  code: string;
  slaHours: number;
  description: string;
  badgeStyle: string;
  enabled: boolean;
}

const DEFAULT_URGENCIES: UrgencyItem[] = [
  { id: 'u-1', level: 'Low', code: 'LOW', slaHours: 48, description: 'Minor issue, no immediate impact', badgeStyle: 'bg-slate-100 text-slate-700 border-slate-300', enabled: true },
  { id: 'u-2', level: 'Normal', code: 'MEDIUM', slaHours: 24, description: 'Needs repair or attention soon', badgeStyle: 'bg-amber-100 text-amber-800 border-amber-300', enabled: true },
  { id: 'u-3', level: 'Urgent', code: 'HIGH', slaHours: 4, description: 'Dangerous condition (e.g. broken glass, unstable)', badgeStyle: 'bg-rose-100 text-rose-800 border-rose-300', enabled: true },
];

export const AdminUrgencyLevelsTab: React.FC = () => {
  const [urgencyLevels, setUrgencyLevels] = useState<UrgencyItem[]>(DEFAULT_URGENCIES);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<UrgencyItem | null>(null);

  const [level, setLevel] = useState('');
  const [slaHours, setSlaHours] = useState(24);
  const [description, setDescription] = useState('');

  useEffect(() => {
    apiService.getUrgencyLevels().then((data) => {
      if (Array.isArray(data) && data.length > 0) {
        setUrgencyLevels(data);
      }
    }).catch(err => console.warn('Failed to fetch urgency levels:', err));
  }, []);

  const handleAddUrgency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!level.trim()) return;

    setShowAddModal(false);
    const newLevel = level.trim();
    const newSla = Number(slaHours || 24);
    const newDesc = description.trim();

    setLevel('');
    setDescription('');

    try {
      const created = await apiService.createUrgencyLevel({
        level: newLevel,
        slaHours: newSla,
        description: newDesc,
        badgeStyle: 'bg-purple-100 text-purple-800 border-purple-300',
      });
      setUrgencyLevels(prev => [...prev, created]);
    } catch (err) {
      console.error('Failed to create urgency level:', err);
    } finally {
      broadcastPresetChange();
    }
  };

  const handleSaveEditUrgency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem.level.trim()) return;

    const id = editingItem.id;
    const updateData = {
      level: editingItem.level.trim(),
      slaHours: Number(editingItem.slaHours),
      description: editingItem.description.trim(),
    };

    setEditingItem(null);
    setUrgencyLevels(prev => prev.map(u => u.id === id ? { ...u, ...updateData } : u));

    try {
      await apiService.updateUrgencyLevel(id, updateData);
    } catch (err) {
      console.error('Failed to update urgency level:', err);
    } finally {
      broadcastPresetChange();
    }
  };

  const handleToggleEnabled = async (id: string, currentEnabled: boolean) => {
    const nextEnabled = !currentEnabled;
    setUrgencyLevels(prev => prev.map(u => u.id === id ? { ...u, enabled: nextEnabled } : u));

    try {
      await apiService.updateUrgencyLevel(id, { enabled: nextEnabled });
    } catch (err) {
      console.error('Failed to toggle urgency level:', err);
    } finally {
      broadcastPresetChange();
    }
  };

  const handleDeleteUrgency = async (id: string) => {
    setUrgencyLevels(prev => prev.filter(u => u.id !== id));
    try {
      await apiService.deleteUrgencyLevel(id);
    } catch (err) {
      console.error('Failed to delete urgency level:', err);
    } finally {
      broadcastPresetChange();
    }
  };

  return (
    <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl p-8 shadow-sm space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-black text-[#00271D] flex items-center gap-2">
            <Gauge size={22} className="text-[#00A77C]" />
            Urgency Priority Levels
          </h3>
          <p className="text-sm text-[#00271D]/50 mt-1 font-medium">SLA response targets and resolution priority scoring</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="px-5 py-2.5 bg-[#00A77C] hover:bg-[#008f6a] text-white rounded-xl text-sm font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-all"
        >
          <Plus size={16} /> Add Urgency Level
        </button>
      </div>

      <div className="space-y-3">
        {urgencyLevels.map((urg) => (
          <div key={urg.id || urg.code} className="p-4 bg-[#F9F3F0] rounded-2xl flex items-center justify-between border border-gray-200/60">
            <div>
              <div className="flex items-center gap-2.5">
                <span className={`font-extrabold text-[#00271D] text-sm ${urg.enabled ? '' : 'line-through opacity-50'}`}>{urg.level}</span>
                <span className={`text-xs font-black px-3 py-0.5 rounded-full border ${urg.badgeStyle}`}>{urg.slaHours}h SLA</span>
              </div>
              <p className="text-xs text-[#00271D]/60 mt-0.5 font-medium">{urg.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleToggleEnabled(urg.id, urg.enabled)}
                className={`text-xs font-bold px-3 py-1 rounded-full border cursor-pointer transition-all ${
                  urg.enabled
                    ? 'text-emerald-700 bg-emerald-100 border-emerald-200 hover:bg-emerald-200'
                    : 'text-gray-500 bg-gray-200 border-gray-300 hover:bg-gray-300'
                }`}
              >
                {urg.enabled ? 'Active' : 'Disabled'}
              </button>
              <button type="button" onClick={() => setEditingItem(urg)} className="text-[#00271D]/40 hover:text-blue-600 cursor-pointer p-1.5">
                <Edit2 size={15} />
              </button>
              <button type="button" onClick={() => handleDeleteUrgency(urg.id)} className="text-[#00271D]/40 hover:text-rose-600 cursor-pointer p-1.5">
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Urgency Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl border border-white space-y-5 animate-fade-in">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <h3 className="text-2xl font-black text-[#00271D]">Add Urgency Level</h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-[#00271D]/40 hover:text-[#00271D]">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddUrgency} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#00271D]/50 uppercase">Level Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Critical"
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="w-full mt-1.5 p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold outline-none focus:border-[#00A77C]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#00271D]/50 uppercase">SLA Resolution Target (Hours)</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={slaHours}
                  onChange={(e) => setSlaHours(Number(e.target.value))}
                  className="w-full mt-1.5 p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold outline-none focus:border-[#00A77C]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#00271D]/50 uppercase">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Immediate safety hazard"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full mt-1.5 p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold outline-none focus:border-[#00A77C]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-5 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 cursor-pointer text-sm">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-2.5 bg-[#00A77C] text-white font-extrabold rounded-xl shadow-md hover:bg-[#008f6a] cursor-pointer text-sm">
                  Save Urgency Level
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Urgency Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl border border-white space-y-5 animate-fade-in">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <h3 className="text-2xl font-black text-[#00271D]">Edit Urgency Level</h3>
              <button type="button" onClick={() => setEditingItem(null)} className="text-[#00271D]/40 hover:text-[#00271D]">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEditUrgency} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#00271D]/50 uppercase">Level Name</label>
                <input
                  type="text"
                  required
                  value={editingItem.level}
                  onChange={(e) => setEditingItem({ ...editingItem, level: e.target.value })}
                  className="w-full mt-1.5 p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold outline-none focus:border-[#00A77C]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#00271D]/50 uppercase">SLA Resolution Target (Hours)</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={editingItem.slaHours}
                  onChange={(e) => setEditingItem({ ...editingItem, slaHours: Number(e.target.value) })}
                  className="w-full mt-1.5 p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold outline-none focus:border-[#00A77C]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#00271D]/50 uppercase">Description</label>
                <input
                  type="text"
                  value={editingItem.description}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  className="w-full mt-1.5 p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold outline-none focus:border-[#00A77C]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditingItem(null)} className="px-5 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 cursor-pointer text-sm">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-2.5 bg-[#00A77C] text-white font-extrabold rounded-xl shadow-md hover:bg-[#008f6a] cursor-pointer text-sm">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
