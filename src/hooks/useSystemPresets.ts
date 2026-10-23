import { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { createPollScheduler } from '../utils/pollScheduler';

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

const ITEM_PRESETS_KEY = 'sort_item_presets';
const ITEM_PRESETS_UPDATED_EVENT = 'sort_item_presets_updated';
const CATEGORIES_UPDATED_EVENT = 'sort_categories_updated';

// Reference/config data changes rarely: poll slowly and rely on the same-tab
// custom events + cross-tab BroadcastChannel for immediate propagation.
const POLL_INTERVAL_MS = 60_000;
const POLL_HIDDEN_INTERVAL_MS = 180_000;

interface PresetsCache {
  presetGroups: PresetGroup[];
  categories: AssetCategoryPreset[];
  wasteTypes: WasteTypePreset[];
  urgencyLevels: UrgencyLevelPreset[];
  assetConditions: AssetConditionPreset[];
  categoriesLoaded: boolean;
  presetGroupsLoaded: boolean;
}

// ── Shared store ─────────────────────────────────────────────────────────
// One cache + one ref-counted poller for every consumer (teacher submit,
// admin settings pages, student submit, ...). Previously each hook instance
// ran its own 2.5s interval with a 5-request waterfall.

let cache: PresetsCache | null = null;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

function loadCache(): PresetsCache {
  if (cache) return cache;

  let presetGroups: PresetGroup[] = [];
  try {
    const stored = localStorage.getItem(ITEM_PRESETS_KEY);
    if (stored) presetGroups = JSON.parse(stored);
  } catch {
    presetGroups = [];
  }

  cache = {
    presetGroups,
    categories: [],
    wasteTypes: [],
    urgencyLevels: [],
    assetConditions: [],
    categoriesLoaded: false,
    presetGroupsLoaded: false,
  };
  return cache;
}

async function fetchPresets(): Promise<void> {
  if (inflight) return inflight;
  const current = loadCache();

  inflight = (async () => {
    // Parallel fetches: each failure isolated, no waterfall.
    const [groupsResult, categoriesResult, wasteResult, urgencyResult, conditionsResult] =
      await Promise.allSettled([
        apiService.getPresetGroups(),
        apiService.getAssetCategories(),
        apiService.getWasteTypes(),
        apiService.getUrgencyLevels(),
        apiService.getAssetConditions(),
      ]);

    const next: PresetsCache = { ...current };
    let changed = false;
    let groupsChanged = false;

    if (groupsResult.status === 'fulfilled' && Array.isArray(groupsResult.value)) {
      next.presetGroupsLoaded = true;
      if (JSON.stringify(groupsResult.value) !== JSON.stringify(current.presetGroups)) {
        next.presetGroups = groupsResult.value;
        changed = true;
        groupsChanged = true;
      }
    } else if (groupsResult.status === 'rejected') {
      console.warn('Preset groups fetch failed, using cached local storage:', groupsResult.reason);
    }

    if (categoriesResult.status === 'fulfilled' && Array.isArray(categoriesResult.value)) {
      next.categoriesLoaded = true;
      if (JSON.stringify(categoriesResult.value) !== JSON.stringify(current.categories)) {
        next.categories = categoriesResult.value;
        changed = true;
      }
    }

    if (wasteResult.status === 'fulfilled' && Array.isArray(wasteResult.value)) {
      if (JSON.stringify(wasteResult.value) !== JSON.stringify(current.wasteTypes)) {
        next.wasteTypes = wasteResult.value;
        changed = true;
      }
    }

    if (urgencyResult.status === 'fulfilled' && Array.isArray(urgencyResult.value)) {
      if (JSON.stringify(urgencyResult.value) !== JSON.stringify(current.urgencyLevels)) {
        next.urgencyLevels = urgencyResult.value;
        changed = true;
      }
    }

    if (conditionsResult.status === 'fulfilled' && Array.isArray(conditionsResult.value)) {
      if (JSON.stringify(conditionsResult.value) !== JSON.stringify(current.assetConditions)) {
        next.assetConditions = conditionsResult.value;
        changed = true;
      }
    }

    cache = next;

    if (groupsChanged) {
      try {
        localStorage.setItem(ITEM_PRESETS_KEY, JSON.stringify(next.presetGroups));
      } catch (storageErr) {
        console.warn('Unable to cache preset groups locally:', storageErr);
      }
    }

    // Notify once: data changed, or a "loaded" flag flipped on first success.
    const flagsChanged =
      next.presetGroupsLoaded !== current.presetGroupsLoaded ||
      next.categoriesLoaded !== current.categoriesLoaded;
    if (changed || flagsChanged) notify();
  })().finally(() => {
    inflight = null;
  });

  return inflight;
}

const poller = createPollScheduler(fetchPresets, {
  intervalMs: POLL_INTERVAL_MS,
  hiddenIntervalMs: POLL_HIDDEN_INTERVAL_MS,
  immediate: false,
});

export function useSystemPresets() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const rerender = () => setTick((n) => n + 1);
    listeners.add(rerender);
    poller.start();

    const handleUpdate = () => {
      void fetchPresets();
    };

    // Same-tab admin save events + cross-tab storage writes for the one key
    // this dataset caches; filtered so unrelated writes cannot trigger reloads.
    const handleStorage = (event: StorageEvent) => {
      if (event.key === ITEM_PRESETS_KEY) void fetchPresets();
    };

    window.addEventListener(ITEM_PRESETS_UPDATED_EVENT, handleUpdate);
    window.addEventListener(CATEGORIES_UPDATED_EVENT, handleUpdate);
    window.addEventListener('storage', handleStorage);

    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        channel = new BroadcastChannel('sort_preset_channel');
        channel.onmessage = handleUpdate;
      } catch {
        /* channel unavailable */
      }
    }

    if (!cache) void fetchPresets();

    return () => {
      listeners.delete(rerender);
      poller.stop();
      window.removeEventListener(ITEM_PRESETS_UPDATED_EVENT, handleUpdate);
      window.removeEventListener(CATEGORIES_UPDATED_EVENT, handleUpdate);
      window.removeEventListener('storage', handleStorage);
      if (channel) channel.close();
    };
  }, []);

  const state = loadCache();

  return {
    presetGroups: state.presetGroups,
    categories: state.categories,
    wasteTypes: state.wasteTypes,
    urgencyLevels: state.urgencyLevels,
    assetConditions: state.assetConditions,
    categoriesLoaded: state.categoriesLoaded,
    presetGroupsLoaded: state.presetGroupsLoaded,
    reloadPresets: fetchPresets,
  };
}

export function broadcastPresetChange() {
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const channel = new BroadcastChannel('sort_preset_channel');
      channel.postMessage({ type: 'PRESETS_UPDATED', timestamp: Date.now() });
      channel.close();
    } catch {
      /* channel unavailable */
    }
  }
}
