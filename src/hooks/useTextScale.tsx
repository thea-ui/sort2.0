import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
} from 'react';

// ─── Contract ──────────────────────────────────────────────────────────────
// Accessibility text-size preference, scoped per user account. Scales the root
// font size via the `--text-scale` CSS variable (index.css); only rem-based text
// grows, fixed px text is untouched, and print is pinned to 100% in CSS so
// official documents never change size.
//
// The preference is stored under `sortv2_text_scale:<userId>` and bound by the
// AccessibilityMenu to the signed-in user. Signing out resets the page to 100%;
// another user on the same browser never inherits the setting.

export const TEXT_SCALE_STEPS = [90, 100, 110, 120, 130, 140, 150] as const;
export const DEFAULT_TEXT_SCALE_PERCENT = 100;
export const TEXT_SCALE_STORAGE_PREFIX = 'sortv2_text_scale';
// The v1 browser-wide key. Adopted once by the first user who binds, then
// removed so a stale value can never leak to the next account.
const LEGACY_STORAGE_KEY = TEXT_SCALE_STORAGE_PREFIX;

interface TextScaleContextType {
  percent: number;
  canDecrease: boolean;
  canIncrease: boolean;
  decrease: () => void;
  increase: () => void;
  reset: () => void;
  /** Bind the preference to a signed-in user (null when signed out). */
  bindUser: (userId: string | null) => void;
}

export function textScaleKeyForUser(userId: string): string {
  return `${TEXT_SCALE_STORAGE_PREFIX}:${userId}`;
}

export function normalizeTextScalePercent(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return (TEXT_SCALE_STEPS as readonly number[]).includes(parsed)
    ? parsed
    : DEFAULT_TEXT_SCALE_PERCENT;
}

export function readStoredTextScaleForUser(userId: string): number {
  try {
    const scoped = localStorage.getItem(textScaleKeyForUser(userId));
    if (scoped !== null) return normalizeTextScalePercent(scoped);

    // One-time migration: adopt the legacy browser-wide value for the first
    // user who signs in, then delete it so it cannot leak to anyone else.
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy !== null) {
      const migrated = normalizeTextScalePercent(legacy);
      localStorage.setItem(textScaleKeyForUser(userId), String(migrated));
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      return migrated;
    }
  } catch {
    // Storage unavailable — fall through to the default.
  }
  return DEFAULT_TEXT_SCALE_PERCENT;
}

function applyTextScale(percent: number) {
  document.documentElement.style.setProperty('--text-scale', String(percent / 100));
}

const TextScaleContext = createContext<TextScaleContextType>({
  percent: DEFAULT_TEXT_SCALE_PERCENT,
  canDecrease: false,
  canIncrease: false,
  decrease: () => {},
  increase: () => {},
  reset: () => {},
  bindUser: () => {},
});

export function useTextScale() {
  return useContext(TextScaleContext);
}

export const TextScaleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [percent, setPercent] = useState<number>(DEFAULT_TEXT_SCALE_PERCENT);
  const [userId, setUserId] = useState<string | null>(null);

  // Bind/unbind the active user; signed-out pages always render at 100%.
  const bindUser = useCallback((nextUserId: string | null) => {
    setUserId(nextUserId);
    setPercent(nextUserId ? readStoredTextScaleForUser(nextUserId) : DEFAULT_TEXT_SCALE_PERCENT);
  }, []);

  // Apply before first paint so a stored scale never flashes at 100%.
  useLayoutEffect(() => {
    applyTextScale(percent);
  }, [percent]);

  const updatePercent = useCallback(
    (next: number) => {
      const normalized = normalizeTextScalePercent(next);
      setPercent(normalized);
      if (!userId) return;
      try {
        localStorage.setItem(textScaleKeyForUser(userId), String(normalized));
      } catch {
        // Storage unavailable — the scale still applies for this session.
      }
    },
    [userId],
  );

  // Sync across tabs/windows — only for the currently bound user's key.
  useEffect(() => {
    if (!userId) return;
    const key = textScaleKeyForUser(userId);
    const onStorage = (event: StorageEvent) => {
      if (event.key !== key) return;
      setPercent(normalizeTextScalePercent(event.newValue));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [userId]);

  const index = (TEXT_SCALE_STEPS as readonly number[]).indexOf(percent);
  const canDecrease = index > 0;
  const canIncrease = index < TEXT_SCALE_STEPS.length - 1;

  const decrease = () => {
    if (canDecrease) updatePercent(TEXT_SCALE_STEPS[index - 1]);
  };
  const increase = () => {
    if (canIncrease) updatePercent(TEXT_SCALE_STEPS[index + 1]);
  };
  const reset = () => updatePercent(DEFAULT_TEXT_SCALE_PERCENT);

  return (
    <TextScaleContext.Provider
      value={{ percent, canDecrease, canIncrease, decrease, increase, reset, bindUser }}
    >
      {children}
    </TextScaleContext.Provider>
  );
};
