import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Layers } from 'lucide-react';
import { apiService } from '../../../../services/api';
import { broadcastPresetChange } from '../../../../hooks/useSystemPresets';

interface CategoryItem {
  id: string;
  name: string;
  code: string;
  enabled: boolean;
}

const DEFAULT_CATEGORIES: CategoryItem[] = [
  { id: 'cat-1', name: 'Furniture', code: 'furniture', enabled: true },
  { id: 'cat-2', name: 'Electronics', code: 'electronics', enabled: true },
  { id: 'cat-3', name: 'Fixtures', code: 'fixtures', enabled: true },
  { id: 'cat-4', name: 'Equipment', code: 'equipment', enabled: true },
  { id: 'cat-5', name: 'Other', code: 'other', enabled: true },
];

export const AdminAssetCategoriesTab: React.FC = () => {
  const [categories, setCategories] = useState<CategoryItem[]>(DEFAULT_CATEGORIES);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [catName, setCatName] = useState('');
  const [catCode, setCatCode] = useState('');

  const loadCategories = async () => {
    try {
      const data = await apiService.getAssetCategories();
      if (Array.isArray(data) && data.length > 0) {
        setCategories(data);
      }
    } catch (err) {
      console.warn('Failed to load asset categories from DB:', err);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    const name = catName.trim();
    const code = catCode.trim() || name.toLowerCase().replace(/\s+/g, '-');
    setShowAddModal(false);
    setCatName('');
    setCatCode('');

    try {
      const created = await apiService.createAssetCategory({ name, code });
      setCategories((prev) => [...prev, created]);
    } catch (err) {
      console.error('Failed to create category:', err);
      const fallback = { id: `cat-${Date.now()}`, name, code, enabled: true };
      setCategories((prev) => [...prev, fallback]);
    } finally {
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('sort_categories_updated'));
      broadcastPresetChange();
    }
  };

  const handleSaveEditCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editingCategory.name.trim()) return;

    const id = editingCategory.id;
    const name = editingCategory.name.trim();
    const code = editingCategory.code.trim() || name.toLowerCase().replace(/\s+/g, '-');

    setEditingCategory(null);
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, name, code } : c)));

    try {
      await apiService.updateAssetCategory(id, { name, code });
    } catch (err) {
      console.error('Failed to update category:', err);
    } finally {
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('sort_categories_updated'));
      broadcastPresetChange();
    }
  };

  const handleToggleEnabled = async (id: string, currentEnabled: boolean) => {
    const nextEnabled = !currentEnabled;
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, enabled: nextEnabled } : c)));

    try {
      await apiService.updateAssetCategory(id, { enabled: nextEnabled });
    } catch (err) {
      console.error('Failed to toggle category state:', err);
    } finally {
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('sort_categories_updated'));
      broadcastPresetChange();
    }
  };

  const handleDeleteCategory = async (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));

    try {
      await apiService.deleteAssetCategory(id);
    } catch (err) {
      console.error('Failed to delete category:', err);
    } finally {
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('sort_categories_updated'));
      broadcastPresetChange();
    }
  };

  return (
    <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl p-8 shadow-sm space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-black text-[#00271D] flex items-center gap-2">
            <Layers size={22} className="text-[#00A77C]" />
            Asset Categories
          </h3>
          <p className="text-sm text-[#00271D]/50 mt-1">Manage asset classification categories across the system</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="px-5 py-2.5 bg-[#00A77C] hover:bg-[#008f6a] text-white rounded-xl text-sm font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-all"
        >
          <Plus size={16} /> Add Category
        </button>
      </div>

      <div className="space-y-2.5">
        {categories.map((cat) => (
          <div key={cat.id || cat.code} className="p-4 bg-[#F9F3F0] rounded-2xl flex items-center justify-between text-sm border border-gray-200/50">
            <div>
              <p className={`font-bold ${cat.enabled ? 'text-[#00271D]' : 'text-[#00271D]/40 line-through'}`}>{cat.name}</p>
              <p className="text-xs text-[#00271D]/40 font-mono">{cat.code}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleToggleEnabled(cat.id, cat.enabled)}
                className={`text-xs font-bold px-3 py-1 rounded-full border cursor-pointer transition-all ${
                  cat.enabled
                    ? 'text-emerald-700 bg-emerald-100 border-emerald-200 hover:bg-emerald-200'
                    : 'text-gray-500 bg-gray-200 border-gray-300 hover:bg-gray-300'
                }`}
              >
                {cat.enabled ? 'Enabled' : 'Disabled'}
              </button>
              <button
                type="button"
                onClick={() => setEditingCategory(cat)}
                className="text-[#00271D]/40 hover:text-blue-600 cursor-pointer p-1.5"
                title="Edit Category"
              >
                <Edit2 size={15} />
              </button>
              <button
                type="button"
                onClick={() => handleDeleteCategory(cat.id)}
                className="text-[#00271D]/40 hover:text-rose-600 cursor-pointer p-1.5"
                title="Delete Category"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Category Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl border border-white space-y-5 animate-fade-in">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <h3 className="text-2xl font-black text-[#00271D]">Add Asset Category</h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-[#00271D]/40 hover:text-[#00271D]">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddCategory} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#00271D]/50 uppercase">Category Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Appliances"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="w-full mt-1.5 p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold outline-none focus:border-[#00A77C]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#00271D]/50 uppercase">Code Identifier (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. appliances"
                  value={catCode}
                  onChange={(e) => setCatCode(e.target.value)}
                  className="w-full mt-1.5 p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold outline-none focus:border-[#00A77C]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 cursor-pointer text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#00A77C] text-white font-extrabold rounded-xl shadow-md hover:bg-[#008f6a] cursor-pointer text-sm"
                >
                  Add Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {editingCategory && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl border border-white space-y-5 animate-fade-in">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <h3 className="text-2xl font-black text-[#00271D]">Edit Category</h3>
              <button type="button" onClick={() => setEditingCategory(null)} className="text-[#00271D]/40 hover:text-[#00271D]">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEditCategory} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#00271D]/50 uppercase">Category Name</label>
                <input
                  type="text"
                  required
                  value={editingCategory.name}
                  onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                  className="w-full mt-1.5 p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold outline-none focus:border-[#00A77C]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#00271D]/50 uppercase">Code Identifier</label>
                <input
                  type="text"
                  required
                  value={editingCategory.code}
                  onChange={(e) => setEditingCategory({ ...editingCategory, code: e.target.value })}
                  className="w-full mt-1.5 p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold outline-none focus:border-[#00A77C]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="px-5 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 cursor-pointer text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#00A77C] text-white font-extrabold rounded-xl shadow-md hover:bg-[#008f6a] cursor-pointer text-sm"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
