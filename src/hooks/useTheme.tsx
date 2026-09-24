import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

// ─── Contract ──────────────────────────────────────────────────────────
// SORT consumes tenant branding from its own public settings endpoint
// (`GET /api/settings/public`) with a live SSE channel
// (`GET /api/settings/public/stream`). Values are cached in localStorage so
// the first paint is branded, then refreshed from the network, then kept in
// sync by SSE. The EnrollPro-compatible aliases are written alongside the
// SORT tokens so either naming scheme renders the same brand.

const API_BASE_URL = (import.meta.env.VITE_API_URL as string) || '/api';
const PUBLIC_SETTINGS_URL = `${API_BASE_URL}/settings/public`;
const PUBLIC_STREAM_URL = `${API_BASE_URL}/settings/public/stream`;
const THEME_CACHE_KEY = 'sortv2_theme_cache';
const SYSTEM_NAME = 'SORT';
const FALLBACK_TITLE = 'S.O.R.T. — Smart Operational Recovery & Tracking';

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  gold: string;
}

export const defaultColors: ThemeColors = {
  primary: '#00271D',
  secondary: '#00A77C',
  accent: '#00A77C',
  gold: '#C69B26',
};

export interface ThemeState {
  colors: ThemeColors;
  schoolName: string;
  schoolAcronym: string | null;
  schoolId: string | null;
  division: string | null;
  region: string | null;
  address: string | null;
  schoolHeadName: string | null;
  logoUrl: string | null;
  currentSchoolYear: string | null;
  enrollproPublicUrl: string;
}

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export const DEFAULT_THEME_STATE: ThemeState = {
  colors: defaultColors,
  schoolName: '',
  schoolAcronym: null,
  schoolId: null,
  division: null,
  region: null,
  address: null,
  schoolHeadName: null,
  logoUrl: null,
  currentSchoolYear: null,
  enrollproPublicUrl: 'https://dev-jegs.buru-degree.ts.net',
};

// ─── Color helpers ─────────────────────────────────────────────────────

export function isLightColor(hexColor: string): boolean {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}

export function adjustColor(hexColor: string, amount: number): string {
  const hex = hexColor.replace('#', '');
  const channel = (offset: number) =>
    Math.min(255, Math.max(0, parseInt(hex.substring(offset, offset + 2), 16) + amount));
  const r = channel(0);
  const g = channel(2);
  const b = channel(4);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function scaleColor(hexColor: string, factor: number): string {
  const hex = hexColor.replace('#', '');
  const channel = (offset: number) =>
    Math.min(255, Math.max(0, Math.round(parseInt(hex.substring(offset, offset + 2), 16) * factor)));
  const r = channel(0);
  const g = channel(2);
  const b = channel(4);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * A tenant palette entry can be achromatic (e.g. a neutral gray third color).
 * Gray is unusable as SORT's action/accent color — buttons and active states
 * would look washed out — so those tenants fall back to the primary brand
 * color for `--accent`. The raw palette value is still kept in theme state and
 * shown in Admin → Branding.
 */
export function isAchromaticColor(hexColor: string, threshold = 0.15): boolean {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  if (max === min) return true;
  const saturation = lightness > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
  return saturation < threshold;
}

function hexToRgb(hexColor: string): string {
  const hex = hexColor.replace('#', '');
  return `${parseInt(hex.substring(0, 2), 16)}, ${parseInt(hex.substring(2, 4), 16)}, ${parseInt(hex.substring(4, 6), 16)}`;
}

// Factors are calibrated so the default brand produces the exact shades the
// UI already used before theming: #003A2B, #008F6A, #00C491 (#007B5B replaces
// a legacy #007A5C gradient stop, a 1/255 shift).
const PRIMARY_LIGHT_FACTOR = 1.487;
const ACCENT_DARK_FACTOR = 0.856;
const ACCENT_LIGHT_FACTOR = 1.172;
const ACCENT_DARKER_FACTOR = 0.735;

/**
 * Pure mapping from tenant colors to every CSS custom property the UI
 * consumes. Kept free of DOM access so it can be unit-tested.
 */
export function resolveThemeVariables(colors: ThemeColors): Record<string, string> {
  // Neutral tenant accents fall back to the primary brand color so action
  // elements never render washed out.
  const accent = isAchromaticColor(colors.accent) ? colors.primary : colors.accent;
  const onPrimary = isLightColor(colors.primary) ? '#1f2937' : '#ffffff';
  const onSecondary = isLightColor(colors.secondary) ? '#1f2937' : '#ffffff';
  const onAccent = isLightColor(accent) ? '#1f2937' : '#ffffff';

  return {
    // SORT brand tokens
    '--primary': colors.primary,
    '--primary-light': scaleColor(colors.primary, PRIMARY_LIGHT_FACTOR),
    '--secondary': colors.secondary,
    '--accent': accent,
    '--accent-light': scaleColor(accent, ACCENT_LIGHT_FACTOR),
    '--accent-dark': scaleColor(accent, ACCENT_DARK_FACTOR),
    '--accent-darker': scaleColor(accent, ACCENT_DARKER_FACTOR),
    '--gold': colors.gold,

    // Contrast text (never reuse --text-primary: that name is SORT's main
    // text color and must stay evergreen)
    '--on-primary': onPrimary,
    '--on-secondary': onSecondary,
    '--on-accent': onAccent,

    // Neutral near-black used for headings/body text so the brand color stays
    // on surfaces, buttons and active states instead of tinting all copy.
    '--text-strong': '#111827',

    // Tailwind-facing aliases
    '--color-primary': colors.primary,
    '--color-secondary': colors.secondary,
    '--color-accent': accent,
    '--color-gold': colors.gold,
    '--ring': accent,
    '--color-ring': accent,
    '--primary-foreground': onPrimary,
    '--color-primary-foreground': onPrimary,
    '--chart-1': colors.primary,

    // SMART/EnrollPro-compatible naming (shared across companion systems).
    // Note: --primary-light above keeps SORT's design-language semantics; the
    // SMART naming is mirrored on --theme-primary-light instead.
    '--theme-primary': colors.primary,
    '--theme-secondary': colors.secondary,
    '--theme-accent': accent,
    '--theme-primary-light': adjustColor(colors.primary, 40),
    '--theme-primary-dark': adjustColor(colors.primary, -40),
    '--theme-secondary-light': adjustColor(colors.secondary, 40),
    '--theme-secondary-dark': adjustColor(colors.secondary, -40),
    '--theme-primary-text': onPrimary,
    '--theme-secondary-text': onSecondary,

    // RGB triplets for rgba()/opacity uses
    '--primary-rgb': hexToRgb(colors.primary),
    '--secondary-rgb': hexToRgb(colors.secondary),
    '--accent-rgb': hexToRgb(accent),
    '--gold-rgb': hexToRgb(colors.gold),
    '--theme-primary-rgb': hexToRgb(colors.primary),
    '--theme-secondary-rgb': hexToRgb(colors.secondary),
    '--theme-accent-rgb': hexToRgb(accent),

    // EnrollPro-compatible naming
    '--primary-color': colors.primary,
    '--secondary-color': colors.secondary,
    '--accent-color': accent,
    '--text-color': onPrimary,
    '--bg-color': '#F9F3F0',
  };
}

export function applyThemeToDocument(colors: ThemeColors): void {
  const root = document.documentElement;
  const variables = resolveThemeVariables(colors);
  for (const [name, value] of Object.entries(variables)) {
    root.style.setProperty(name, value);
  }
}

export function applyBrowserMetadata(schoolName: string, logoUrl: string | null): void {
  document.title = schoolName
    ? `${schoolName} | ${SYSTEM_NAME}`
    : FALLBACK_TITLE;

  if (logoUrl) {
    const fullLogoUrl = logoUrl.startsWith('http') ? logoUrl : `${window.location.origin}${logoUrl}`;
    let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.getElementsByTagName('head')[0].appendChild(link);
    }
    link.href = fullLogoUrl;
    link.type = 'image/x-icon';
  }
}

// ─── Cache ─────────────────────────────────────────────────────────────

function loadCachedTheme(): ThemeState | null {
  try {
    const raw = localStorage.getItem(THEME_CACHE_KEY);
    return raw ? (JSON.parse(raw) as ThemeState) : null;
  } catch {
    return null;
  }
}

function saveThemeCache(state: ThemeState): void {
  try {
    localStorage.setItem(THEME_CACHE_KEY, JSON.stringify(state));
  } catch {
    // Best effort: private mode / quota errors must not break theming.
  }
}

function readString(source: Record<string, unknown>, key: string): string | null {
  const value = source[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function readColor(source: Record<string, unknown>, key: string, fallback: string): string {
  const value = readString(source, key);
  return value && HEX_COLOR.test(value) ? value : fallback;
}

export function normalizeBranding(source: Record<string, unknown> | null | undefined): ThemeState {
  const s = source ?? {};
  return {
    colors: {
      primary: readColor(s, 'primaryColor', defaultColors.primary),
      secondary: readColor(s, 'secondaryColor', defaultColors.secondary),
      accent: readColor(s, 'accentColor', defaultColors.accent),
      gold: readColor(s, 'goldColor', defaultColors.gold),
    },
    schoolName: readString(s, 'schoolName') ?? '',
    schoolAcronym: readString(s, 'schoolAcronym'),
    schoolId: readString(s, 'schoolId'),
    division: readString(s, 'division'),
    region: readString(s, 'region'),
    address: readString(s, 'address'),
    schoolHeadName: readString(s, 'schoolHeadName'),
    logoUrl: readString(s, 'logoUrl'),
    currentSchoolYear: readString(s, 'currentSchoolYear'),
    enrollproPublicUrl: (readString(s, 'enrollproPublicUrl') ?? DEFAULT_THEME_STATE.enrollproPublicUrl).replace(/\/+$/, ''),
  };
}

// ─── Provider ──────────────────────────────────────────────────────────

interface ThemeContextValue extends ThemeState {
  refresh: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<ThemeState>(() => loadCachedTheme() ?? DEFAULT_THEME_STATE);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Apply the cached brand before the network call resolves.
  useEffect(() => {
    const cached = loadCachedTheme() ?? DEFAULT_THEME_STATE;
    applyThemeToDocument(cached.colors);
    applyBrowserMetadata(cached.schoolName, cached.logoUrl);
  }, []);

  const commit = useCallback((next: ThemeState) => {
    setState(next);
    saveThemeCache(next);
    applyThemeToDocument(next.colors);
    applyBrowserMetadata(next.schoolName, next.logoUrl);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(PUBLIC_SETTINGS_URL, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      commit(normalizeBranding(body?.settings));
    } catch {
      // Keep the cached/current brand; never regress to defaults.
      applyThemeToDocument(stateRef.current.colors);
      applyBrowserMetadata(stateRef.current.schoolName, stateRef.current.logoUrl);
    }
  }, [commit]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Live updates: unnamed `data:` frames + 30s comment heartbeats.
  useEffect(() => {
    let source: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let backoff = 2000;
    let disposed = false;

    const connect = () => {
      source = new EventSource(PUBLIC_STREAM_URL);
      source.onmessage = (event) => {
        try {
          commit(normalizeBranding(JSON.parse(event.data)));
        } catch {
          // Ignore malformed frames; the next refresh reconciles.
        }
      };
      source.onopen = () => {
        backoff = 2000;
      };
      source.onerror = () => {
        source?.close();
        if (disposed) return;
        retryTimer = setTimeout(() => {
          backoff = Math.min(backoff * 2, 30000);
          connect();
        }, backoff);
      };
    };

    connect();
    return () => {
      disposed = true;
      if (retryTimer) clearTimeout(retryTimer);
      source?.close();
    };
  }, [commit]);

  return <ThemeContext.Provider value={{ ...state, refresh }}>{children}</ThemeContext.Provider>;
};

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
}
