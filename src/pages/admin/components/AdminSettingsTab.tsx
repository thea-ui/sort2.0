import React, { useState } from 'react';
import {
  Settings,
  Calendar,
  Layers,
  Package,
  MapPin,
  Award,
  Trash2,
  AlertTriangle,
  Plus,
  Edit2,
  Check,
  RefreshCw,
  Sliders,
  Sparkles,
  X,
} from 'lucide-react';
import { SystemSettings } from '../../../types';
import { CampusBlueprintEditor } from './map/CampusBlueprintEditor';
import { apiService } from '../../../services/api';
import { broadcastPresetChange } from '../../../hooks/useSystemPresets';
import { AdminAssetCategoriesTab } from './settings/AdminAssetCategoriesTab';
import { AdminWasteTypesTab } from './settings/AdminWasteTypesTab';
import { AdminUrgencyLevelsTab } from './settings/AdminUrgencyLevelsTab';
import { AdminAssetConditionsTab } from './settings/AdminAssetConditionsTab';
import { AdminPointsSystemTab } from './settings/AdminPointsSystemTab';
import { AdminAcademicCalendarTab } from './settings/AdminAcademicCalendarTab';

const DEFAULT_PRESET_GROUPS = [
  {
    category: 'Furniture',
    items: [
      { id: 'f-1', name: 'Arm Chair (Plastic)', enabled: true },
      { id: 'f-2', name: 'Arm Chair (Wooden)', enabled: true },
      { id: 'f-3', name: 'Office Chair', enabled: true },
      { id: 'f-4', name: 'Student Desk', enabled: true },
      { id: 'f-5', name: "Teacher's Table", enabled: true },
      { id: 'f-6', name: 'Wooden Table', enabled: true },
      { id: 'f-7', name: 'Filing Cabinet', enabled: true },
      { id: 'f-8', name: 'Bookshelf', enabled: true },
      { id: 'f-9', name: 'Whiteboard Stand', enabled: true },
      { id: 'f-10', name: 'Lecture Podium', enabled: true },
    ],
  },
  {
    category: 'Electronics',
    items: [
      { id: 'e-1', name: 'Desktop Computer', enabled: true },
      { id: 'e-2', name: 'Laptop', enabled: true },
      { id: 'e-3', name: 'LCD Projector', enabled: true },
      { id: 'e-4', name: 'LED TV/Monitor', enabled: true },
      { id: 'e-5', name: 'Speaker / PA Sound System', enabled: true },
      { id: 'e-6', name: 'Printer / Scanner', enabled: true },
      { id: 'e-7', name: 'Wireless Router / Access Point', enabled: true },
      { id: 'e-8', name: 'Document Camera', enabled: true },
    ],
  },
  {
    category: 'Fixtures',
    items: [
      { id: 'fx-1', name: 'Ceiling Fan', enabled: true },
      { id: 'fx-2', name: 'Air Conditioner Unit (Split/Window)', enabled: true },
      { id: 'fx-3', name: 'LED Tube Light / Panel Light', enabled: true },
      { id: 'fx-4', name: 'Wall Light Switch', enabled: true },
      { id: 'fx-5', name: 'Electrical Power Outlet', enabled: true },
      { id: 'fx-6', name: 'Door Lock / Handle Assembly', enabled: true },
      { id: 'fx-7', name: 'Window Blinds / Curtain Rod', enabled: true },
      { id: 'fx-8', name: 'Plumbing Faucet / Sink Assembly', enabled: true },
    ],
  },
  {
    category: 'Equipment',
    items: [
      { id: 'eq-1', name: 'Science Microscope', enabled: true },
      { id: 'eq-2', name: 'Bunsen Burner / Gas Hose', enabled: true },
      { id: 'eq-3', name: 'Laboratory Centrifuge', enabled: true },
      { id: 'eq-4', name: 'Fire Extinguisher (CO2/Dry Chemical)', enabled: true },
      { id: 'eq-5', name: 'First Aid Kit Box', enabled: true },
      { id: 'eq-6', name: 'Oscilloscope / Multimeter', enabled: true },
      { id: 'eq-7', name: 'Paper Shredder Machine', enabled: true },
    ],
  },
  {
    category: 'Other',
    items: [
      { id: 'ot-1', name: 'Trash Can / Litter Bin (General)', enabled: true },
      { id: 'ot-2', name: 'Whiteboard / Cork Board', enabled: true },
      { id: 'ot-3', name: 'Cleaning Broom / Mop Stand', enabled: true },
      { id: 'ot-4', name: 'Extension Cord Wheel', enabled: true },
      { id: 'ot-5', name: 'Wall Clock (Analog/Digital)', enabled: true },
    ],
  },
];

interface AdminSettingsTabProps {
  subTab?: string;
  settings: SystemSettings;
  updateSettings: (newSettings: Partial<SystemSettings>) => void;
  resetDatabase: () => void;
}

export const AdminSettingsTab: React.FC<AdminSettingsTabProps> = ({
  subTab = 'academic-calendar',
  settings,
  updateSettings,
  resetDatabase,
}) => {
  const [activeSubTab, setActiveSubTab] = useState(subTab);
  const [smartSync, setSmartSync] = useState(true);

  // Item Presets State
  const [presetGroups, setPresetGroups] = useState(() => {
    try {
      const stored = localStorage.getItem('sort_item_presets');
      return stored ? JSON.parse(stored) : DEFAULT_PRESET_GROUPS;
    } catch {
      return DEFAULT_PRESET_GROUPS;
    }
  });

  const [newItemCategory, setNewItemCategory] = useState('Furniture');
  const [newItemName, setNewItemName] = useState('');
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [editingPreset, setEditingPreset] = useState<{ groupCat: string; id: string; name: string } | null>(null);

  // Fetch preset groups from DB on mount
  React.useEffect(() => {
    let isMounted = true;
    apiService.getPresetGroups()
      .then((data) => {
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setPresetGroups(data);
          localStorage.setItem('sort_item_presets', JSON.stringify(data));
        }
      })
      .catch((err) => {
        console.warn('Backend API preset fetch failed, using local storage cache:', err);
      });
    return () => { isMounted = false; };
  }, []);

  const savePresetGroups = (updated: typeof DEFAULT_PRESET_GROUPS) => {
    setPresetGroups(updated);
    localStorage.setItem('sort_item_presets', JSON.stringify(updated));
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('sort_item_presets_updated'));
    broadcastPresetChange();
  };

  const handleTogglePreset = async (catName: string, itemId: string) => {
    const targetGroup = presetGroups.find((g: any) => g.category === catName);
    const targetItem = targetGroup?.items.find((it: any) => it.id === itemId);
    const newStatus = targetItem ? !targetItem.enabled : true;

    const updated = presetGroups.map((g: any) => {
      if (g.category !== catName) return g;
      return {
        ...g,
        items: g.items.map((it: any) => (it.id === itemId ? { ...it, enabled: newStatus } : it)),
      };
    });
    savePresetGroups(updated);

    try {
      await apiService.updatePresetItem(itemId, { enabled: newStatus });
    } catch (err) {
      console.warn('API preset toggle failed:', err);
    }
  };

  const handleAddItemPreset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    const name = newItemName.trim();
    setNewItemName('');
    setShowAddItemModal(false);

    try {
      const created = await apiService.addPresetItem(newItemCategory, name);
      const updated = presetGroups.map((g: any) => {
        if (g.category !== newItemCategory) return g;
        return {
          ...g,
          items: [...g.items, { id: created.id || `preset-${Date.now()}`, name: created.name || name, enabled: true }],
        };
      });
      savePresetGroups(updated);
    } catch (err) {
      console.warn('API add preset failed, adding locally:', err);
      const updated = presetGroups.map((g: any) => {
        if (g.category !== newItemCategory) return g;
        return {
          ...g,
          items: [...g.items, { id: `preset-${Date.now()}`, name, enabled: true }],
        };
      });
      savePresetGroups(updated);
    }
  };

  const handleSaveEditPreset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPreset || !editingPreset.name.trim()) return;

    const { id, groupCat, name } = editingPreset;
    setEditingPreset(null);

    const updated = presetGroups.map((g: any) => {
      if (g.category !== groupCat) return g;
      return {
        ...g,
        items: g.items.map((it: any) => (it.id === id ? { ...it, name: name.trim() } : it)),
      };
    });
    savePresetGroups(updated);

    try {
      await apiService.updatePresetItem(id, { name: name.trim() });
    } catch (err) {
      console.warn('API update preset failed:', err);
    }
  };

  const handleDeletePreset = async (catName: string, itemId: string) => {
    const updated = presetGroups.map((g: any) => {
      if (g.category !== catName) return g;
      return {
        ...g,
        items: g.items.filter((it: any) => it.id !== itemId),
      };
    });
    savePresetGroups(updated);

    try {
      await apiService.deletePresetItem(itemId);
    } catch (err) {
      console.warn('API delete preset failed:', err);
    }
  };



  // Synchronize internal active tab when parent tab changes
  React.useEffect(() => {
    if (subTab) setActiveSubTab(subTab);
  }, [subTab]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* SUB-PAGE: ACADEMIC CALENDAR */}
      {activeSubTab === 'academic-calendar' && <AdminAcademicCalendarTab />}

      {/* SUB-PAGE 2: ASSET CATEGORIES */}
      {activeSubTab === 'asset-categories' && <AdminAssetCategoriesTab />}

      {/* SUB-PAGE 4: LOCATIONS & MAP BLUEPRINT EDITOR */}
      {activeSubTab === 'locations' && <CampusBlueprintEditor />}

      {/* SUB-PAGE 3: ITEM PRESETS */}
      {activeSubTab === 'item-presets' && (
        <div className="space-y-6 animate-fade-in">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-[#00271D] flex items-center gap-3">
                <Package size={28} className="text-[#00A77C]" />
                Asset Item Presets
              </h2>
              <p className="text-sm text-[#00271D]/50 mt-1">Manage default reportable items under each asset category</p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddItemModal(true)}
              className="px-5 py-2.5 bg-[#00A77C] text-white rounded-2xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-[#00A77C]/20 hover:bg-[#008f6a] cursor-pointer"
            >
              <Plus size={16} /> Add Preset Item
            </button>
          </div>

          <div className="space-y-6">
            {presetGroups.map((group: any) => (
              <div key={group.category} className="bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-black text-[#00271D] uppercase tracking-wider">{group.category}</p>
                  <span className="text-xs text-[#00271D]/40 font-bold">{group.items.length} items</span>
                </div>

                <div className="space-y-2">
                  {group.items.map((item: any) => (
                    <div key={item.id} className="p-4 bg-[#F9F3F0] rounded-2xl flex items-center justify-between text-sm">
                      <span className={`font-bold ${item.enabled ? 'text-[#00271D]' : 'text-[#00271D]/40 line-through'}`}>
                        {item.name}
                      </span>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleTogglePreset(group.category, item.id)}
                          className={`text-xs font-bold px-3 py-1 rounded-full border cursor-pointer transition-all ${
                            item.enabled
                              ? 'text-emerald-700 bg-emerald-100 border-emerald-200 hover:bg-emerald-200'
                              : 'text-gray-500 bg-gray-200 border-gray-300 hover:bg-gray-300'
                          }`}
                        >
                          {item.enabled ? 'Enabled' : 'Disabled'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingPreset({ groupCat: group.category, id: item.id, name: item.name })}
                          className="text-[#00271D]/40 hover:text-blue-600 cursor-pointer p-1.5 rounded-xl hover:bg-blue-50 transition-all"
                          title="Edit Item Name"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePreset(group.category, item.id)}
                          className="text-[#00271D]/40 hover:text-rose-600 cursor-pointer p-1.5 rounded-xl hover:bg-rose-50 transition-all"
                          title="Delete Preset Item"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {showAddItemModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl space-y-5 animate-fade-in">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black text-[#00271D]">Add Preset Item</h3>
              <button type="button" onClick={() => setShowAddItemModal(false)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddItemPreset} className="space-y-4">
              <div>
                <label className="text-sm font-bold text-[#00271D]/60">Asset Category</label>
                <select
                  value={newItemCategory}
                  onChange={(e) => setNewItemCategory(e.target.value)}
                  className="w-full mt-1.5 p-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-semibold outline-none cursor-pointer focus:border-[#00A77C]"
                >
                  {presetGroups.map((g: any) => (
                    <option key={g.category} value={g.category}>{g.category}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-bold text-[#00271D]/60">Item Name</label>
                <input type="text" required placeholder="e.g. Science Microscope" value={newItemName} onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full mt-1.5 p-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-semibold outline-none focus:border-[#00A77C] focus:ring-2 focus:ring-[#00A77C]/20" />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAddItemModal(false)} className="px-5 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200 cursor-pointer">Cancel</button>
                <button type="submit" className="px-6 py-2.5 bg-[#00A77C] text-white font-extrabold rounded-2xl shadow-lg shadow-[#00A77C]/20 hover:bg-[#008f6a] cursor-pointer">Add Item</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {editingPreset && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl space-y-5 animate-fade-in">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black text-[#00271D]">Edit Preset Item</h3>
              <button type="button" onClick={() => setEditingPreset(null)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditPreset} className="space-y-4">
              <div>
                <label className="text-sm font-bold text-[#00271D]/60">Category</label>
                <input type="text" disabled value={editingPreset.groupCat}
                  className="w-full mt-1.5 p-3 bg-gray-100 border border-gray-200 rounded-2xl text-sm font-semibold text-gray-500" />
              </div>

              <div>
                <label className="text-sm font-bold text-[#00271D]/60">Item Name</label>
                <input type="text" required value={editingPreset.name} onChange={(e) => setEditingPreset({ ...editingPreset, name: e.target.value })}
                  className="w-full mt-1.5 p-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-semibold outline-none focus:border-[#00A77C] focus:ring-2 focus:ring-[#00A77C]/20" />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setEditingPreset(null)} className="px-5 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200 cursor-pointer">Cancel</button>
                <button type="submit" className="px-6 py-2.5 bg-[#00A77C] text-white font-extrabold rounded-2xl shadow-lg shadow-[#00A77C]/20 hover:bg-[#008f6a] cursor-pointer">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUB-PAGE 6: WASTE TYPES */}
      {activeSubTab === 'waste-types' && <AdminWasteTypesTab />}

      {/* SUB-PAGE 7: URGENCY LEVELS */}
      {activeSubTab === 'urgency-levels' && <AdminUrgencyLevelsTab />}

      {/* SUB-PAGE 8: ASSET CONDITIONS */}
      {activeSubTab === 'asset-conditions' && <AdminAssetConditionsTab />}

      {/* SUB-PAGE 5: POINTS SYSTEM */}
      {activeSubTab === 'points-system' && <AdminPointsSystemTab />}

      {/* SUB-PAGE 9: DANGER ZONE (Screenshot 732) */}
      {activeSubTab === 'danger-zone' && (
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
              <p className="font-extrabold text-sm text-[#00271D]">Reset All App Data</p>
              <p className="text-xs text-[#00271D]/60 mt-0.5">
                Wipe all reports, points, history, and challenges. Every student and reporter will start from 0.
              </p>
            </div>
            <button
              type="button"
              onClick={resetDatabase}
              className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all shrink-0"
            >
              Reset All Data
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
