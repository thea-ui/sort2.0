import React, { useEffect, useState } from 'react';
import { Edit2, Package, Plus, Trash2 } from 'lucide-react';
import { apiService } from '../../../../services/api';
import { broadcastPresetChange } from '../../../../hooks/useSystemPresets';
import { AppModal } from '../../../../components/common/AppModal';
import { ConfirmDialog } from '../../../../components/common/ConfirmDialog';
import { toast } from '../../../../hooks/useToast';
import { DEFAULT_PRESET_GROUPS, PresetGroup, PresetItem } from './presetDefaults';

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

  const [newItemCategory, setNewItemCategory] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [editingPreset, setEditingPreset] = useState<EditingPreset | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ category: string; item: PresetItem } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const effectiveCategory = newItemCategory || presetGroups[0]?.category || '';

  // Fetch preset groups from DB on mount
  useEffect(() => {
    let isMounted = true;
    apiService
      .getPresetGroups()
      .then((data) => {
        if (isMounted && Array.isArray(data)) {
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
    window.dispatchEvent(new CustomEvent('sort_item_presets_updated'));
    broadcastPresetChange();
  };

  const handleTogglePreset = async (catName: string, itemId: string) => {
    const targetGroup = presetGroups.find((g) => g.category === catName);
    const targetItem = targetGroup?.items.find((it) => it.id === itemId);
    const newStatus = targetItem ? !targetItem.enabled : true;
    const snapshot = presetGroups;

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
      toast.success('Preset item updated — live for all users.');
    } catch (err) {
      console.warn('API preset toggle failed:', err);
      savePresetGroups(snapshot);
      toast.error('Could not update the preset item — reverted.');
    }
  };

  const handleAddItemPreset = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newItemName.trim() || saving) return;

    const name = newItemName.trim();
    if (!effectiveCategory) {
      toast.error('Add an asset category first.');
      return;
    }

    setSaving(true);

    try {
      const created = await apiService.addPresetItem(effectiveCategory, name);
      const updated = presetGroups.map((g) => {
        if (g.category !== effectiveCategory) return g;
        return {
          ...g,
          items: [...g.items, { id: created.id, name: created.name || name, enabled: true }],
        };
      });
      savePresetGroups(updated);
      setNewItemName('');
      setShowAddItemModal(false);
      toast.success(`Preset item "${name}" added — live for all users.`);
    } catch (err) {
      console.warn('API add preset failed:', err);
      toast.error(`Could not add "${name}". Please try again.`);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEditPreset = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!editingPreset || !editingPreset.name.trim()) return;

    const { id, groupCat, name } = editingPreset;
    const snapshot = presetGroups;
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
      toast.success('Preset item updated — live for all users.');
    } catch (err) {
      console.warn('API update preset failed:', err);
      savePresetGroups(snapshot);
      toast.error('Update failed — the preset item was reverted.');
    }
  };

  const confirmDeletePreset = async () => {
    if (!pendingDelete) return;
    const { category, item } = pendingDelete;
    const snapshot = presetGroups;
    setDeleting(true);

    const updated = presetGroups.map((g) => {
      if (g.category !== category) return g;
      return {
        ...g,
        items: g.items.filter((it) => it.id !== item.id),
      };
    });
    savePresetGroups(updated);

    try {
      await apiService.deletePresetItem(item.id);
      toast.success(`"${item.name}" deleted for all users.`);
    } catch (err) {
      console.warn('API delete preset failed:', err);
      savePresetGroups(snapshot);
      toast.error(`Could not delete "${item.name}" — it was restored.`);
    } finally {
      setDeleting(false);
      setPendingDelete(null);
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
          disabled={presetGroups.length === 0}
          title={presetGroups.length === 0 ? 'Add an asset category first' : undefined}
          className="px-5 py-2.5 bg-[var(--accent)] text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-[var(--accent)]/20 hover:bg-[var(--accent-dark)] cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                      onClick={() => setPendingDelete({ category: group.category, item })}
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
        confirmLabel={saving ? 'Adding...' : 'Add Item'}
        onConfirm={() => handleAddItemPreset()}
        confirmDisabled={!newItemName.trim() || !effectiveCategory}
        loading={saving}
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-[var(--text-strong)]/60">Asset Category</label>
            <select
              value={effectiveCategory}
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

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) setPendingDelete(null);
        }}
        title="Delete preset item?"
        description={
          pendingDelete
            ? `"${pendingDelete.item.name}" will be removed from "${pendingDelete.category}" for every teacher and student. This cannot be undone.`
            : undefined
        }
        confirmLabel={deleting ? 'Deleting...' : 'Delete Item'}
        destructive
        loading={deleting}
        onConfirm={confirmDeletePreset}
      />
    </div>
  );
};
