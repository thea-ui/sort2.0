import React, { useState } from 'react';
import { useMrfInventory } from '../../../hooks/useMrfInventory';
import { useSchoolYear } from '../../../hooks/useSchoolYear';
import {
  Package,
  Plus,
  ArrowDown,
  ArrowUp,
  AlertTriangle,
  CheckCircle2,
  X,
  Search,
  Filter,
  Edit2,
  Trash2,
  Clock,
  Boxes,
  TrendingUp,
  BarChart3,
} from 'lucide-react';

interface MRFInventoryTabProps {
  showToast: (msg: string) => void;
}

export const MRFInventoryTab: React.FC<MRFInventoryTabProps> = ({ showToast }) => {
  const {
    items,
    transactions,
    loading,
    lowStockItems,
    itemsByCategory,
    addItem,
    updateItem,
    deleteItem,
    recordTransaction,
  } = useMrfInventory();

  const { activeSchoolYear } = useSchoolYear();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Add form state
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('SUPPLY');
  const [newUnit, setNewUnit] = useState('pcs');
  const [newQuantity, setNewQuantity] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newMinThreshold, setNewMinThreshold] = useState('');
  const [newIsPersistent, setNewIsPersistent] = useState(false);

  // Transaction form state
  const [txType, setTxType] = useState('STOCK_IN');
  const [txQuantity, setTxQuantity] = useState('');
  const [txNotes, setTxNotes] = useState('');

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = ['EQUIPMENT', 'SUPPLY', 'RECOVERED_MATERIAL', 'TOOL'];
  const categoryColors: Record<string, { bg: string; text: string; border: string; icon: string }> = {
    EQUIPMENT: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200', icon: 'text-sky-600' },
    SUPPLY: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: 'text-amber-600' },
    RECOVERED_MATERIAL: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: 'text-emerald-600' },
    TOOL: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', icon: 'text-purple-600' },
  };

  const conditionColors: Record<string, string> = {
    GOOD: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    FAIR: 'bg-amber-100 text-amber-700 border-amber-200',
    NEEDS_REPAIR: 'bg-rose-100 text-rose-700 border-rose-200',
    DISPOSED: 'bg-gray-100 text-gray-500 border-gray-200',
  };

  // Calculate inventory health metrics
  const totalItems = items.length;
  const goodConditionItems = items.filter(i => i.condition === 'GOOD').length;
  const inventoryHealth = totalItems > 0 ? Math.round((goodConditionItems / totalItems) * 100) : 0;
  const totalTransactions = transactions.length;
  const recentTransactions = transactions.slice(0, 7).length;

  // Category distribution data
  const categoryDistribution = categories.map(cat => ({
    name: cat.replace('_', ' '),
    count: (itemsByCategory[cat] || []).length,
    percentage: totalItems > 0 ? Math.round(((itemsByCategory[cat] || []).length / totalItems) * 100) : 0,
    ...categoryColors[cat],
  }));

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addItem({
        name: newName,
        category: newCategory,
        unit: newUnit,
        quantity: parseFloat(newQuantity) || 0,
        description: newDescription || undefined,
        minThreshold: parseFloat(newMinThreshold) || undefined,
        isPersistent: newIsPersistent,
      });
      showToast(`Added "${newName}" to inventory.`);
      setShowAddModal(false);
      resetAddForm();
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    }
  };

  const handleTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    try {
      const qty = txType === 'STOCK_OUT' ? -(parseFloat(txQuantity) || 0) : (parseFloat(txQuantity) || 0);
      await recordTransaction({
        itemId: selectedItem,
        type: txType,
        quantity: qty,
        notes: txNotes || undefined,
      });
      const item = items.find(i => i.id === selectedItem);
      showToast(`${txType === 'STOCK_IN' ? 'Stocked in' : 'Stocked out'} ${txQuantity} ${item?.unit || ''} of ${item?.name}.`);
      setShowTransactionModal(false);
      resetTxForm();
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    }
  };

  const handleDeleteItem = async (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}" from inventory?`)) return;
    try {
      await deleteItem(id);
      showToast(`Deleted "${name}" from inventory.`);
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    }
  };

  const resetAddForm = () => {
    setNewName('');
    setNewCategory('SUPPLY');
    setNewUnit('pcs');
    setNewQuantity('');
    setNewDescription('');
    setNewMinThreshold('');
    setNewIsPersistent(false);
  };

  const resetTxForm = () => {
    setSelectedItem(null);
    setTxType('STOCK_IN');
    setTxQuantity('');
    setTxNotes('');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-[10px] font-bold text-[#00A77C] bg-[#00A77C]/10 border border-[#00A77C]/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
            MRF Facility Management
          </span>
          <h3 className="text-xl font-heading font-black text-[#00271D] tracking-tight mt-1.5 flex items-center gap-2">
            <Package size={20} className="text-[#00A77C]" />
            Inventory Tracker
          </h3>
          <p className="text-xs text-[#00271D]/50 mt-0.5">
            Track equipment, supplies, and tools. {activeSchoolYear && `SY ${activeSchoolYear.label}`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 rounded-xl bg-[#00A77C] hover:bg-[#008f6a] text-white text-xs font-bold shadow-md shadow-[#00A77C]/20 flex items-center gap-1.5 cursor-pointer transition-colors"
        >
          <Plus size={14} /> Add Item
        </button>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-amber-800">Low Stock Alert</p>
            <p className="text-[11px] text-amber-600 mt-0.5">
              {lowStockItems.map(i => i.name).join(', ')} — need restocking.
            </p>
          </div>
        </div>
      )}

      {/* Enhanced Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Items</p>
            <Package size={16} className="text-[#00A77C]" />
          </div>
          <p className="text-3xl font-black text-[#00271D]">{items.length}</p>
          <p className="text-[11px] text-gray-500 mt-1">In inventory</p>
        </div>
        <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Health Score</p>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <p className="text-3xl font-black text-emerald-600">{inventoryHealth}%</p>
          <div className="mt-2 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all"
              style={{ width: `${inventoryHealth}%` }}
            />
          </div>
        </div>
        <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Low Stock</p>
            <AlertTriangle size={16} className="text-amber-500" />
          </div>
          <p className="text-3xl font-black text-amber-600">{lowStockItems.length}</p>
          <p className="text-[11px] text-gray-500 mt-1">Need restocking</p>
        </div>
        <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Transactions</p>
            <TrendingUp size={16} className="text-sky-500" />
          </div>
          <p className="text-3xl font-black text-sky-600">{totalTransactions}</p>
          <p className="text-[11px] text-gray-500 mt-1">This period</p>
        </div>
      </div>

      {/* Category Distribution Chart */}
      <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-[#00A77C]" />
            <h4 className="text-sm font-bold text-[#00271D]">Category Distribution</h4>
          </div>
          <span className="text-[10px] font-bold text-gray-400">{totalItems} items total</span>
        </div>
        <div className="space-y-4">
          {categoryDistribution.map(cat => (
            <div key={cat.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`h-3 w-3 rounded-full ${cat.bg} border ${cat.border}`} />
                  <span className="text-xs font-semibold text-gray-700">{cat.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#00271D]">{cat.count}</span>
                  <span className="text-[10px] text-gray-400">({cat.percentage}%)</span>
                </div>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${cat.bg.replace('50', '400')}`}
                  style={{ width: `${cat.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search items..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 bg-white text-xs outline-none focus:border-[#00A77C] focus:ring-2 focus:ring-[#00A77C]/20"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter size={13} className="text-gray-400" />
          {['ALL', ...categories].map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                categoryFilter === cat
                  ? 'bg-[#00271D] text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {cat === 'ALL' ? 'All' : cat.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="h-10 w-10 mx-auto rounded-xl bg-[#00A77C]/10 text-[#00A77C] flex items-center justify-center animate-pulse">
              <Package size={20} />
            </div>
            <p className="text-xs text-gray-400 mt-3 font-medium">Loading inventory...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <div className="h-12 w-12 mx-auto rounded-2xl bg-[#00A77C]/10 text-[#00A77C] flex items-center justify-center">
              <Boxes size={24} />
            </div>
            <p className="text-sm font-bold text-[#00271D]">No inventory items found.</p>
            <p className="text-xs text-[#00271D]/40">Click "Add Item" to start tracking MRF inventory.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-[#00271D]/5">
                  <th className="py-3 px-4 font-bold text-[#00271D]/60 uppercase tracking-wider">Item</th>
                  <th className="py-3 px-4 font-bold text-[#00271D]/60 uppercase tracking-wider">Category</th>
                  <th className="py-3 px-4 font-bold text-[#00271D]/60 uppercase tracking-wider text-center">Stock Level</th>
                  <th className="py-3 px-4 font-bold text-[#00271D]/60 uppercase tracking-wider text-center">Condition</th>
                  <th className="py-3 px-4 font-bold text-[#00271D]/60 uppercase tracking-wider text-center">Persistent</th>
                  <th className="py-3 px-4 font-bold text-[#00271D]/60 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredItems.map(item => {
                  const catStyle = categoryColors[item.category] || categoryColors.SUPPLY;
                  const isLow = item.minThreshold && item.quantity <= item.minThreshold;
                  const stockPercentage = item.minThreshold ? Math.min(100, Math.round((item.quantity / (item.minThreshold * 2)) * 100)) : 100;
                  return (
                    <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <p className="font-bold text-[#00271D]">{item.name}</p>
                        {item.description && <p className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[200px]">{item.description}</p>}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${catStyle.bg} ${catStyle.text} border ${catStyle.border}`}>
                          {item.category.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col items-center gap-1.5">
                          <div className="flex items-center gap-2">
                            <span className={`font-black ${isLow ? 'text-rose-600' : 'text-[#00271D]'}`}>
                              {item.quantity}
                            </span>
                            <span className="text-[10px] text-gray-400">{item.unit}</span>
                            {isLow && <AlertTriangle size={11} className="text-amber-500" />}
                          </div>
                          <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isLow ? 'bg-rose-400' : stockPercentage > 60 ? 'bg-emerald-400' : 'bg-amber-400'
                              }`}
                              style={{ width: `${stockPercentage}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${conditionColors[item.condition] || conditionColors.GOOD}`}>
                          {item.condition}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {item.isPersistent ? (
                          <span className="text-[9px] font-bold text-[#00A77C] bg-[#00A77C]/10 px-2 py-0.5 rounded-full">Yes</span>
                        ) : (
                          <span className="text-[9px] font-bold text-gray-400">No</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => { setSelectedItem(item.id); setShowTransactionModal(true); }}
                            className="p-1.5 rounded-lg bg-[#00A77C]/10 text-[#00A77C] hover:bg-[#00A77C]/20 cursor-pointer transition-colors"
                            title="Stock In/Out"
                          >
                            <ArrowDown size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id, item.name)}
                            className="p-1.5 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 cursor-pointer transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Transactions */}
      <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl p-6 shadow-sm space-y-4">
        <h4 className="text-sm font-heading font-bold text-[#00271D] flex items-center gap-2">
          <Clock size={16} className="text-[#00A77C]" />
          Recent Transactions
        </h4>
        {transactions.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-6">No transactions yet.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {transactions.slice(0, 10).map(tx => (
              <div key={tx.id} className="py-2.5 flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  {tx.type === 'STOCK_IN' || tx.type === 'ROLLOVER_OPENING' ? (
                    <ArrowDown size={12} className="text-emerald-500" />
                  ) : (
                    <ArrowUp size={12} className="text-rose-500" />
                  )}
                  <div>
                    <p className="font-bold text-[#00271D]">{tx.item?.name || 'Unknown'}</p>
                    <p className="text-[10px] text-gray-400">{tx.type.replace('_', ' ')} {tx.notes && `· ${tx.notes}`}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-black ${tx.quantity > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {tx.quantity > 0 ? '+' : ''}{tx.quantity} {tx.item?.unit}
                  </p>
                  <p className="text-[9px] text-gray-400">{new Date(tx.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setShowAddModal(false); }}>
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-br from-[#00271D] to-[#003a2b] px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus size={16} className="text-[#00A77C]" />
                <h3 className="text-sm font-bold text-white">Add Inventory Item</h3>
              </div>
              <button type="button" onClick={() => setShowAddModal(false)} className="p-1 text-white/40 hover:text-white cursor-pointer"><X size={16} /></button>
            </div>
            <form onSubmit={handleAddItem} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Item Name *</label>
                <input type="text" required value={newName} onChange={e => setNewName(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-[#00A77C]" placeholder="e.g. Digital Weighing Scale" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Category *</label>
                  <select value={newCategory} onChange={e => setNewCategory(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-[#00A77C] cursor-pointer">
                    {categories.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Unit *</label>
                  <select value={newUnit} onChange={e => setNewUnit(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-[#00A77C] cursor-pointer">
                    <option value="pcs">pcs</option>
                    <option value="kg">kg</option>
                    <option value="rolls">rolls</option>
                    <option value="liters">liters</option>
                    <option value="boxes">boxes</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Initial Quantity</label>
                  <input type="number" step="0.1" min="0" value={newQuantity} onChange={e => setNewQuantity(e.target.value)} className="w-full rounded-xl border border-gray-200 px3 py-2 text-xs outline-none focus:border-[#00A77C]" placeholder="0" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Low Stock Threshold</label>
                  <input type="number" step="0.1" min="0" value={newMinThreshold} onChange={e => setNewMinThreshold(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-[#00A77C]" placeholder="Optional" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Description</label>
                <textarea rows={2} value={newDescription} onChange={e => setNewDescription(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none resize-none focus:border-[#00A77C]" placeholder="Optional notes" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={newIsPersistent} onChange={e => setNewIsPersistent(e.target.checked)} className="rounded border-gray-300" />
                <span className="text-xs font-medium text-gray-600">Carries across school years (persistent asset)</span>
              </label>
              <button type="submit" className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#00A77C] to-[#008f6a] text-white text-xs font-bold shadow-lg shadow-[#00A77C]/25 cursor-pointer">
                Add to Inventory
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Transaction Modal */}
      {showTransactionModal && selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) { setShowTransactionModal(false); resetTxForm(); } }}>
          <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-br from-[#00271D] to-[#003a2b] px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowDown size={16} className="text-[#00A77C]" />
                <h3 className="text-sm font-bold text-white">Stock In / Out</h3>
              </div>
              <button type="button" onClick={() => { setShowTransactionModal(false); resetTxForm(); }} className="p-1 text-white/40 hover:text-white cursor-pointer"><X size={16} /></button>
            </div>
            <form onSubmit={handleTransaction} className="p-6 space-y-4">
              <p className="text-xs font-bold text-[#00271D]">
                {items.find(i => i.id === selectedItem)?.name}
                <span className="text-gray-400 font-normal ml-2">
                  ({items.find(i => i.id === selectedItem)?.quantity} {items.find(i => i.id === selectedItem)?.unit} in stock)
                </span>
              </p>
              <div className="flex gap-2">
                {['STOCK_IN', 'STOCK_OUT'].map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTxType(t)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      txType === t
                        ? t === 'STOCK_IN' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {t === 'STOCK_IN' ? 'Stock In' : 'Stock Out'}
                  </button>
                ))}
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Quantity *</label>
                <input type="number" step="0.1" min="0.1" required value={txQuantity} onChange={e => setTxQuantity(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-[#00A77C]" placeholder="0" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Notes</label>
                <input type="text" value={txNotes} onChange={e => setTxNotes(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-[#00A77C]" placeholder="Optional" />
              </div>
              <button type="submit" className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#00A77C] to-[#008f6a] text-white text-xs font-bold shadow-lg cursor-pointer">
                Record Transaction
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
