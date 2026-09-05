import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Recycle } from 'lucide-react';
import { apiService } from '../../../../services/api';
import { broadcastPresetChange } from '../../../../hooks/useSystemPresets';

interface WasteTypeItem {
  id: string;
  name: string;
  code: string;
  description: string;
  hexColor: string;
  enabled: boolean;
}

const DEFAULT_WASTE_TYPES: WasteTypeItem[] = [
  { id: 'wt-1', name: 'Biodegradable', code: 'BIODEGRADABLE', description: 'Food scraps, organic matter, garden waste', hexColor: '#10B981', enabled: true },
  { id: 'wt-2', name: 'Non-Biodegradable', code: 'NON_BIODEGRADABLE', description: 'Wrappers, plastic films, sanitary residual', hexColor: '#FF5722', enabled: true },
  { id: 'wt-3', name: 'Recyclable', code: 'RECYCLABLE', description: 'PET bottles, aluminum cans, glass & cardboard', hexColor: '#0091EA', enabled: true },
];

export const AdminWasteTypesTab: React.FC = () => {
  const [wasteTypes, setWasteTypes] = useState<WasteTypeItem[]>(DEFAULT_WASTE_TYPES);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingType, setEditingType] = useState<WasteTypeItem | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [hexColor, setHexColor] = useState('#10B981');

  useEffect(() => {
    apiService.getWasteTypes().then((data) => {
      if (Array.isArray(data) && data.length > 0) {
        setWasteTypes(data);
      }
    }).catch(err => console.warn('Failed to fetch waste types:', err));
  }, []);

  const handleAddWasteType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setShowAddModal(false);
    const newName = name.trim();
    const newDesc = description.trim();
    const newHex = hexColor;

    setName('');
    setDescription('');

    try {
      const created = await apiService.createWasteType({ name: newName, description: newDesc, hexColor: newHex });
      setWasteTypes(prev => [...prev, created]);
    } catch (err) {
      console.error('Failed to create waste type:', err);
    } finally {
      broadcastPresetChange();
    }
  };

  const handleSaveEditWasteType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingType || !editingType.name.trim()) return;

    const id = editingType.id;
    const updateData = {
      name: editingType.name.trim(),
      description: editingType.description.trim(),
      hexColor: editingType.hexColor,
    };

    setEditingType(null);
    setWasteTypes(prev => prev.map(wt => wt.id === id ? { ...wt, ...updateData } : wt));

    try {
      await apiService.updateWasteType(id, updateData);
    } catch (err) {
      console.error('Failed to update waste type:', err);
    } finally {
      broadcastPresetChange();
    }
  };

  const handleToggleEnabled = async (id: string, currentEnabled: boolean) => {
    const nextEnabled = !currentEnabled;
    setWasteTypes(prev => prev.map(wt => wt.id === id ? { ...wt, enabled: nextEnabled } : wt));

    try {
      await apiService.updateWasteType(id, { enabled: nextEnabled });
    } catch (err) {
      console.error('Failed to toggle waste type:', err);
    } finally {
      broadcastPresetChange();
    }
  };

  const handleDeleteWasteType = async (id: string) => {
    setWasteTypes(prev => prev.filter(wt => wt.id !== id));
    try {
      await apiService.deleteWasteType(id);
    } catch (err) {
      console.error('Failed to delete waste type:', err);
    } finally {
      broadcastPresetChange();
    }
  };

  return (
    <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl p-8 shadow-sm space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-black text-[#00271D] flex items-center gap-2">
            <Recycle size={22} className="text-[#00A77C]" />
            Waste Stream Categories
          </h3>
          <p className="text-sm text-[#00271D]/50 mt-1">Configure waste stream definitions, color tokens & collection handlers</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="px-5 py-2.5 bg-[#00A77C] hover:bg-[#008f6a] text-white rounded-xl text-sm font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-all"
        >
          <Plus size={16} /> Add Waste Type
        </button>
      </div>

      <div className="space-y-3">
        {wasteTypes.map((wt) => (
          <div key={wt.id || wt.code} className="p-4 bg-[#F9F3F0] rounded-2xl flex items-center justify-between border border-gray-200/60">
            <div className="flex items-center gap-3">
              <span className="h-4 w-4 rounded-full border border-white shadow-xs" style={{ backgroundColor: wt.hexColor || '#10B981' }} />
              <div>
                <p className={`font-extrabold text-sm ${wt.enabled ? 'text-[#00271D]' : 'text-[#00271D]/40 line-through'}`}>{wt.name}</p>
                <p className="text-xs text-[#00271D]/50">{wt.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleToggleEnabled(wt.id, wt.enabled)}
                className={`text-xs font-bold px-3 py-1 rounded-full border cursor-pointer transition-all ${
                  wt.enabled
                    ? 'text-emerald-700 bg-emerald-100 border-emerald-200 hover:bg-emerald-200'
                    : 'text-gray-500 bg-gray-200 border-gray-300 hover:bg-gray-300'
                }`}
              >
                {wt.enabled ? 'Active' : 'Disabled'}
              </button>
              <button type="button" onClick={() => setEditingType(wt)} className="text-[#00271D]/40 hover:text-blue-600 cursor-pointer p-1.5">
                <Edit2 size={15} />
              </button>
              <button type="button" onClick={() => handleDeleteWasteType(wt.id)} className="text-[#00271D]/40 hover:text-rose-600 cursor-pointer p-1.5">
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Waste Type Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl border border-white space-y-5 animate-fade-in">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <h3 className="text-2xl font-black text-[#00271D]">Add Waste Type</h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-[#00271D]/40 hover:text-[#00271D]">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddWasteType} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#00271D]/50 uppercase">Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. E-Waste"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full mt-1.5 p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold outline-none focus:border-[#00A77C]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#00271D]/50 uppercase">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Batteries, circuit boards"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full mt-1.5 p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold outline-none focus:border-[#00A77C]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#00271D]/50 uppercase">Badge Color Hex</label>
                <div className="flex items-center gap-2 mt-1.5">
                  <input
                    type="color"
                    value={hexColor}
                    onChange={(e) => setHexColor(e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer border border-gray-200"
                  />
                  <input
                    type="text"
                    value={hexColor}
                    onChange={(e) => setHexColor(e.target.value)}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold uppercase"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-5 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 cursor-pointer text-sm">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-2.5 bg-[#00A77C] text-white font-extrabold rounded-xl shadow-md hover:bg-[#008f6a] cursor-pointer text-sm">
                  Save Waste Type
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Waste Type Modal */}
      {editingType && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl border border-white space-y-5 animate-fade-in">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <h3 className="text-2xl font-black text-[#00271D]">Edit Waste Type</h3>
              <button type="button" onClick={() => setEditingType(null)} className="text-[#00271D]/40 hover:text-[#00271D]">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEditWasteType} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#00271D]/50 uppercase">Name</label>
                <input
                  type="text"
                  required
                  value={editingType.name}
                  onChange={(e) => setEditingType({ ...editingType, name: e.target.value })}
                  className="w-full mt-1.5 p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold outline-none focus:border-[#00A77C]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#00271D]/50 uppercase">Description</label>
                <input
                  type="text"
                  value={editingType.description}
                  onChange={(e) => setEditingType({ ...editingType, description: e.target.value })}
                  className="w-full mt-1.5 p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold outline-none focus:border-[#00A77C]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#00271D]/50 uppercase">Badge Color Hex</label>
                <div className="flex items-center gap-2 mt-1.5">
                  <input
                    type="color"
                    value={editingType.hexColor || '#10B981'}
                    onChange={(e) => setEditingType({ ...editingType, hexColor: e.target.value })}
                    className="w-10 h-10 rounded-lg cursor-pointer border border-gray-200"
                  />
                  <input
                    type="text"
                    value={editingType.hexColor || '#10B981'}
                    onChange={(e) => setEditingType({ ...editingType, hexColor: e.target.value })}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold uppercase"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditingType(null)} className="px-5 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 cursor-pointer text-sm">
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
