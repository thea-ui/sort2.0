import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  description?: string;
  unit: string;
  quantity: number;
  minThreshold?: number;
  condition: string;
  isPersistent: boolean;
  createdAt: string;
  updatedAt: string;
  transactions?: InventoryTransaction[];
}

export interface InventoryTransaction {
  id: string;
  itemId: string;
  schoolYearId: string;
  type: string;
  quantity: number;
  notes?: string;
  performedBy?: string;
  createdAt: string;
  item?: { id: string; name: string; category: string; unit: string };
  schoolYear?: { id: string; label: string };
}

export function useMrfInventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    try {
      const data = await apiService.getInventoryItems();
      setItems(data);
    } catch {
      console.warn('Failed to fetch inventory items');
    }
  }, []);

  const fetchTransactions = useCallback(async () => {
    try {
      const data = await apiService.getInventoryTransactions();
      setTransactions(data);
    } catch {
      console.warn('Failed to fetch inventory transactions');
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchItems(), fetchTransactions()]);
    setLoading(false);
  }, [fetchItems, fetchTransactions]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addItem = useCallback(async (data: {
    name: string;
    category: string;
    unit: string;
    quantity?: number;
    description?: string;
    minThreshold?: number;
    condition?: string;
    isPersistent?: boolean;
  }) => {
    try {
      await apiService.createInventoryItem(data);
      await refresh();
    } catch (err: any) {
      throw new Error(err.message || 'Failed to add item');
    }
  }, [refresh]);

  const updateItem = useCallback(async (id: string, data: Partial<InventoryItem>) => {
    try {
      await apiService.updateInventoryItem(id, data);
      await refresh();
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update item');
    }
  }, [refresh]);

  const deleteItem = useCallback(async (id: string) => {
    try {
      await apiService.deleteInventoryItem(id);
      await refresh();
    } catch (err: any) {
      throw new Error(err.message || 'Failed to delete item');
    }
  }, [refresh]);

  const recordTransaction = useCallback(async (data: {
    itemId: string;
    type: string;
    quantity: number;
    notes?: string;
    performedBy?: string;
  }) => {
    try {
      await apiService.createInventoryTransaction(data);
      await refresh();
    } catch (err: any) {
      throw new Error(err.message || 'Failed to record transaction');
    }
  }, [refresh]);

  // Computed values
  const lowStockItems = items.filter(
    i => i.minThreshold && i.quantity <= i.minThreshold
  );

  const itemsByCategory = items.reduce<Record<string, InventoryItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return {
    items,
    transactions,
    loading,
    lowStockItems,
    itemsByCategory,
    refresh,
    addItem,
    updateItem,
    deleteItem,
    recordTransaction,
  };
}
