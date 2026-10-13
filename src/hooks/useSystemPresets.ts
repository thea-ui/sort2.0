import { useState, useEffect } from 'react';
import { apiService } from '../services/api';

export interface PresetGroupItem {
  id: string;
  name: string;
  enabled: boolean;
}

export interface PresetGroup {
  category: string;
  categoryId?: string;
  code?: string;
  items: PresetGroupItem[];
}

export interface AssetCategoryPreset {
  id: string;
  name: string;
  code: string;
  enabled: boolean;
}

export interface WasteTypePreset {
  id: string;
  name: string;
  code: string;
  description: string;
  hexColor: string;
  enabled: boolean;
}

export interface UrgencyLevelPreset {
  id: string;
  level: string;
  code: string;
  slaHours: number;
  description: string;
  badgeStyle: string;
  enabled: boolean;
}

export interface AssetConditionPreset {
  id: string;
  name: string;
  code: string;
  description: string;
  badgeStyle: string;
  enabled: boolean;
}

export function useSystemPresets() {
  const [presetGroups, setPresetGroups] = useState<PresetGroup[]>(() => {
    try {
      const stored = localStorage.getItem('sort_item_presets');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [categories, setCategories] = useState<AssetCategoryPreset[]>([]);
  const [wasteTypes, setWasteTypes] = useState<WasteTypePreset[]>([]);
  const [urgencyLevels, setUrgencyLevels] = useState<UrgencyLevelPreset[]>([]);
  const [assetConditions, setAssetConditions] = useState<AssetConditionPreset[]>([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const [presetGroupsLoaded, setPresetGroupsLoaded] = useState(false);

  const reloadPresets = async () => {
    try {
      const groups = await apiService.getPresetGroups();
      if (Array.isArray(groups)) {
        setPresetGroups(groups);
        setPresetGroupsLoaded(true);
        try {
          localStorage.setItem('sort_item_presets', JSON.stringify(groups));
        } catch (storageErr) {
          console.warn('Unable to cache preset groups locally:', storageErr);
        }
      }
    } catch (err) {
      console.warn('Preset groups fetch failed, using cached local storage:', err);
    }

    try {
      const cats = await apiService.getAssetCategories();
      if (Array.isArray(cats)) {
        setCategories(cats);
        setCategoriesLoaded(true);
      }
    } catch (err) {}

    try {
      const wTypes = await apiService.getWasteTypes();
      if (Array.isArray(wTypes)) {
        setWasteTypes(wTypes);
      }
    } catch (err) {}

    try {
      const uLevels = await apiService.getUrgencyLevels();
      if (Array.isArray(uLevels)) {
        setUrgencyLevels(uLevels);
      }
    } catch (err) {}

    try {
      const aConds = await apiService.getAssetConditions();
      if (Array.isArray(aConds)) {
        setAssetConditions(aConds);
      }
    } catch (err) {}
  };

  useEffect(() => {
    reloadPresets();

    const handleUpdate = () => {
      reloadPresets();
    };

    // BroadcastChannel for instant cross-tab communication
    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        channel = new BroadcastChannel('sort_preset_channel');
        channel.onmessage = handleUpdate;
      } catch (e) {}
    }

    // 2.5 second polling for backend DB sync across devices/sessions
    const interval = setInterval(reloadPresets, 2500);

    window.addEventListener('storage', handleUpdate);
    window.addEventListener('sort_item_presets_updated', handleUpdate as EventListener);
    window.addEventListener('sort_categories_updated', handleUpdate as EventListener);

    return () => {
      clearInterval(interval);
      if (channel) channel.close();
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('sort_item_presets_updated', handleUpdate as EventListener);
      window.removeEventListener('sort_categories_updated', handleUpdate as EventListener);
    };
  }, []);

  return {
    presetGroups,
    categories,
    wasteTypes,
    urgencyLevels,
    assetConditions,
    categoriesLoaded,
    presetGroupsLoaded,
    reloadPresets,
  };
}

export function broadcastPresetChange() {
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const channel = new BroadcastChannel('sort_preset_channel');
      channel.postMessage({ type: 'PRESETS_UPDATED', timestamp: Date.now() });
      channel.close();
    } catch (e) {}
  }
}
