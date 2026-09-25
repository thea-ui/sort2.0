import React, { useEffect, useState } from 'react';
import { Edit2, Package, Plus, Trash2 } from 'lucide-react';
import { apiService } from '../../../../services/api';
import { broadcastPresetChange } from '../../../../hooks/useSystemPresets';
import { AppModal } from '../../../../components/common/AppModal';
import { DEFAULT_PRESET_GROUPS, PresetGroup } from './presetDefaults';

interface EditingPreset {
  groupCat: string;
  id: string;
  name: string;
}

export const AdminItemPresetsTab: React.FC = () => {
  const [presetGroups, setPresetGroups] = useState<PresetGroup[]>(() => {
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
  const [editingPreset, setEditingPreset] = useState<EditingPreset | null>(null);

  // Fetch preset groups from DB on mount
  useEffect(() => {
    let isMounted = true;
    apiService
      .getPresetGroups()
      .then((data) => {
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setPresetGroups(data);
          localStorage.setItem('sort_item_presets', JSON.stringify(data));
        }
      })
      .catch((err) => {
        console.warn('Backend API preset fetch failed, using local storage cache:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const savePresetGroups = (updated: PresetGroup[]) => {
    setPresetGroups(updated);
    localStorage.setItem('sort_item_presets', JSON.stringify(updated));
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('sort_item_presets_updated'));
    broadcastPresetChange();
  };

  const handleTogglePreset = async (catName: string, itemId: string) => {
    const targetGroup = presetGroups.find((g) => g.category === catName);
    const targetItem = targetGroup?.items.find((it) => it.id === itemId);
    const newStatus = targetItem ? !targetItem.enabled : true;

    const updated = presetGroups.map((g) => {
      if (g.category !== catName) return g;
      return {
        ...g,
        items: g.items.map((it) => (it.id === itemId ? { ...it, enabled: newStatus } : it)),
      };
    });
    savePresetGroups(updated);

    try {
      await apiService.updatePresetItem(itemId, { enabled: newStatus });
    } catch (err) {
      console.warn('API preset toggle failed:', err);
    }
  };

  const handleAddItemPreset = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newItemName.trim()) return;

    const name = newItemName.trim();
    setNewItemName('');
    setShowAddItemModal(false);

    try {
      const created = await apiService.addPresetItem(newItemCategory, name);
      const updated = presetGroups.map((g) => {
        if (g.category !== newItemCategory) return g;
        return {
          ...g,
          items: [
            ...g.items,
            { id: created.id || `preset-${Date.now()}`, name: created.name || name, enabled: true },
          ],
        };
      });
      savePresetGroups(updated);
    } catch (err) {
      console.warn('API add preset failed, adding locally:', err);
      const updated = presetGroups.map((g) => {
        if (g.category !== newItemCategory) return g;
        return {
          ...g,
          items: [...g.items, { id: `preset-${Date.now()}`, name, enabled: true }],
        };
      });
      savePresetGroups(updated);
    }
  };

  const handleSaveEditPreset = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!editingPreset || !editingPreset.name.trim()) return;

    const { id, groupCat, name } = editingPreset;
    setEditingPreset(null);

    const updated = presetGroups.map((g) => {
      if (g.category !== groupCat) return g;
      return {
        ...g,
        items: g.items.map((it) => (it.id === id ? { ...it, name: name.trim() } : it)),
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
    const updated = presetGroups.map((g) => {
      if (g.category !== catName) return g;
      return {
        ...g,
        items: g.items.filter((it) => it.id !== itemId),
      };
    });
    savePresetGroups(updated);

    try {
      await apiService.deletePresetItem(itemId);
    } catch (err) {
      console.warn('API delete preset failed:', err);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Section view: `ReportSetupPage` owns the page header, so this section
          only contributes its action row (no nested page header). */}
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => setShowAddItemModal(true)}
          className="px-5 py-2.5 bg-[var(--accent)] text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-[var(--accent)]/20 hover:bg-[var(--accent-dark)] cursor-pointer transition-colors"
        >
          <Plus size={16} /> Add Preset Item
        </button>
      </div>

      <div className="space-y-6">
        {presetGroups.map((group) => (
          <div
            key={group.category}
            className="bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl p-6 shadow-sm space-y-4"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-[var(--text-strong)] uppercase tracking-wider flex items-center gap-2">
                <Package size={15} className="text-[var(--accent)]" />
                {group.category}
              </p>
              <span className="text-xs text-[var(--text-strong)]/40 font-bold">
                {group.items.length} items
              </span>
            </div>

            <div className="space-y-2">
              {group.items.map((item) => (
                <div
                  key={item.id}
                  className="p-4 bg-[color-mix(in_srgb,var(--primary)_5%,white)] rounded-2xl flex items-center justify-between text-sm"
                >
                  <span
                    className={`font-bold ${
                      item.enabled
                        ? 'text-[var(--text-strong)]'
                        : 'text-[var(--text-strong)]/40 line-through'
                    }`}
                  >
                    {item.name}
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleTogglePreset(group.category, item.id)}
                      className={`text-xs font-bold px-3 py-1 rounded-full border cursor-pointer transition-all ${
                        item.enabled
                          ? 'text-emerald-700 bg-emerald-100 border-emerald-200 hover:bg-emerald-200'
                          : 'text-[var(--text-strong)]/50 bg-[color-mix(in_srgb,var(--primary)_10%,white)] border-[var(--primary)]/15 hover:bg-[color-mix(in_srgb,var(--primary)_15%,white)]'
                      }`}
                    >
                      {item.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setEditingPreset({ groupCat: group.category, id: item.id, name: item.name })
                      }
                      className="text-[var(--text-strong)]/40 hover:text-[var(--text-strong)] cursor-pointer p-1.5 rounded-xl hover:bg-[color-mix(in_srgb,var(--primary)_10%,white)] transition-all"
                      title="Edit Item Name"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePreset(group.category, item.id)}
                      className="text-[var(--text-strong)]/40 hover:text-rose-600 cursor-pointer p-1.5 rounded-xl hover:bg-rose-50 transition-all"
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

      <AppModal
        open={showAddItemModal}
        onOpenChange={setShowAddItemModal}
        icon={<Plus size={18} />}
        title="Add Preset Item"
        size="sm"
        confirmLabel="Add Item"
        onConfirm={() => handleAddItemPreset()}
        confirmDisabled={!newItemName.trim()}
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-[var(--text-strong)]/60">Asset Category</label>
            <select
              value={newItemCategory}
              onChange={(e) => setNewItemCategory(e.target.value)}
              className="w-full mt-1.5 p-3 bg-[color-mix(in_srgb,var(--primary)_5%,white)] border border-[var(--primary)]/10 rounded-xl text-sm font-semibold outline-none cursor-pointer focus:border-[var(--accent)]"
            >
              {presetGroups.map((g) => (
                <option key={g.category} value={g.category}>
                  {g.category}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-[var(--text-strong)]/60">Item Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Science Microscope"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              className="w-full mt-1.5 p-3 bg-[color-mix(in_srgb,var(--primary)_5%,white)] border border-[var(--primary)]/10 rounded-xl text-sm font-semibold outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
            />
          </div>
        </div>
      </AppModal>

      <AppModal
        open={editingPreset !== null}
        onOpenChange={(open) => {
          if (!open) setEditingPreset(null);
        }}
        icon={<Edit2 size={18} />}
        title="Edit Preset Item"
        size="sm"
        confirmLabel="Save Changes"
        onConfirm={() => handleSaveEditPreset()}
        confirmDisabled={!editingPreset?.name.trim()}
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-[var(--text-strong)]/60">Category</label>
            <input
              type="text"
              disabled
              value={editingPreset?.groupCat ?? ''}
              className="w-full mt-1.5 p-3 bg-[color-mix(in_srgb,var(--primary)_10%,white)] border border-[var(--primary)]/10 rounded-xl text-sm font-semibold text-[var(--text-strong)]/50"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-[var(--text-strong)]/60">Item Name</label>
            <input
              type="text"
              required
              value={editingPreset?.name ?? ''}
              onChange={(e) =>
                setEditingPreset((prev) => (prev ? { ...prev, name: e.target.value } : prev))
              }
              className="w-full mt-1.5 p-3 bg-[color-mix(in_srgb,var(--primary)_5%,white)] border border-[var(--primary)]/10 rounded-xl text-sm font-semibold outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
            />
          </div>
        </div>
      </AppModal>
    </div>
  );
};
