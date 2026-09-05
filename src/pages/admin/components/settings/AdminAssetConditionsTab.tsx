import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, ShieldCheck } from 'lucide-react';
import { apiService } from '../../../../services/api';
import { broadcastPresetChange } from '../../../../hooks/useSystemPresets';

interface ConditionItem {
  id: string;
  name: string;
  code: string;
  description: string;
  badgeStyle: string;
  enabled: boolean;
}

const DEFAULT_CONDITIONS: ConditionItem[] = [
  { id: 'c-1', name: 'Damaged', code: 'DAMAGED', description: 'Broken but may be repairable', badgeStyle: 'bg-blue-100 text-blue-800 border-blue-300', enabled: true },
  { id: 'c-2', name: 'Malfunctioning', code: 'MALFUNCTIONING', description: 'Not working properly', badgeStyle: 'bg-amber-100 text-amber-800 border-amber-300', enabled: true },
  { id: 'c-3', name: 'Worn Out', code: 'WORN_OUT', description: 'Heavy wear, needs replacement', badgeStyle: 'bg-orange-100 text-orange-800 border-orange-300', enabled: true },
  { id: 'c-4', name: 'Missing Parts', code: 'MISSING_PARTS', description: 'Incomplete, parts missing', badgeStyle: 'bg-purple-100 text-purple-800 border-purple-300', enabled: true },
];

export const AdminAssetConditionsTab: React.FC = () => {
  const [conditions, setConditions] = useState<ConditionItem[]>(DEFAULT_CONDITIONS);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ConditionItem | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    apiService.getAssetConditions().then((data) => {
      if (Array.isArray(data) && data.length > 0) {
        setConditions(data);
      }
    }).catch(err => console.warn('Failed to fetch asset conditions:', err));
  }, []);

  const handleAddCondition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setShowAddModal(false);
    const newName = name.trim();
    const newDesc = description.trim();
    setName('');
    setDescription('');

    try {
      const created = await apiService.createAssetCondition({
        name: newName,
        description: newDesc,
        badgeStyle: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      });
      setConditions(prev => [...prev, created]);
    } catch (err) {
      console.error('Failed to create condition:', err);
    } finally {
      broadcastPresetChange();
    }
  };

  const handleSaveEditCondition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem.name.trim()) return;

    const id = editingItem.id;
    const updateData = {
      name: editingItem.name.trim(),
      description: editingItem.description.trim(),
    };

    setEditingItem(null);
    setConditions(prev => prev.map(c => c.id === id ? { ...c, ...updateData } : c));

    try {
      await apiService.updateAssetCondition(id, updateData);
    } catch (err) {
      console.error('Failed to update asset condition:', err);
    } finally {
      broadcastPresetChange();
    }
  };

  const handleToggleEnabled = async (id: string, currentEnabled: boolean) => {
    const nextEnabled = !currentEnabled;
    setConditions(prev => prev.map(c => c.id === id ? { ...c, enabled: nextEnabled } : c));

    try {
      await apiService.updateAssetCondition(id, { enabled: nextEnabled });
    } catch (err) {
      console.error('Failed to toggle condition:', err);
    } finally {
      broadcastPresetChange();
    }
  };

  const handleDeleteCondition = async (id: string) => {
    setConditions(prev => prev.filter(c => c.id !== id));
    try {
      await apiService.deleteAssetCondition(id);
    } catch (err) {
      console.error('Failed to delete condition:', err);
    } finally {
      broadcastPresetChange();
    }
  };

  return (
    <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl p-8 shadow-sm space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-black text-[#00271D] flex items-center gap-2">
            <ShieldCheck size={22} className="text-[#00A77C]" />
            Asset Conditions
          </h3>
          <p className="text-sm text-[#00271D]/50 mt-1 font-medium">Condition presets for faculty asset maintenance tickets</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="px-5 py-2.5 bg-[#00A77C] hover:bg-[#008f6a] text-white rounded-xl text-sm font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-all"
        >
          <Plus size={16} /> Add Condition Preset
        </button>
      </div>

      <div className="space-y-3">
        {conditions.map((cond) => (
          <div key={cond.id || cond.code} className="p-4 bg-[#F9F3F0] rounded-2xl flex items-center justify-between border border-gray-200/60">
            <div>
              <div className="flex items-center gap-2.5">
                <span className={`font-extrabold text-[#00271D] text-sm ${cond.enabled ? '' : 'line-through opacity-50'}`}>{cond.name}</span>
                <span className={`text-xs font-black px-3 py-0.5 rounded-full border ${cond.badgeStyle}`}>{cond.code}</span>
              </div>
              <p className="text-xs text-[#00271D]/60 mt-0.5 font-medium">{cond.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleToggleEnabled(cond.id, cond.enabled)}
                className={`text-xs font-bold px-3 py-1 rounded-full border cursor-pointer transition-all ${
                  cond.enabled
                    ? 'text-emerald-700 bg-emerald-100 border-emerald-200 hover:bg-emerald-200'
                    : 'text-gray-500 bg-gray-200 border-gray-300 hover:bg-gray-300'
                }`}
              >
                {cond.enabled ? 'Active' : 'Disabled'}
              </button>
              <button type="button" onClick={() => setEditingItem(cond)} className="text-[#00271D]/40 hover:text-blue-600 cursor-pointer p-1.5">
                <Edit2 size={15} />
              </button>
              <button type="button" onClick={() => handleDeleteCondition(cond.id)} className="text-[#00271D]/40 hover:text-rose-600 cursor-pointer p-1.5">
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Condition Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl border border-white space-y-5 animate-fade-in">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <h3 className="text-2xl font-black text-[#00271D]">Add Asset Condition</h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-[#00271D]/40 hover:text-[#00271D]">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddCondition} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#00271D]/50 uppercase">Condition Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Scratched Surface"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full mt-1.5 p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold outline-none focus:border-[#00A77C]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#00271D]/50 uppercase">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Surface damage but functional"
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
                  Save Condition
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Condition Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl border border-white space-y-5 animate-fade-in">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <h3 className="text-2xl font-black text-[#00271D]">Edit Asset Condition</h3>
              <button type="button" onClick={() => setEditingItem(null)} className="text-[#00271D]/40 hover:text-[#00271D]">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEditCondition} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#00271D]/50 uppercase">Condition Name</label>
                <input
                  type="text"
                  required
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
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
