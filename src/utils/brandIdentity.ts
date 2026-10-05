import type { ThemeState } from '../hooks/useTheme';

type BrandingSource = ThemeState['brandingSource'];

// ─── Default (fresh-deployment) identity ───────────────────────────────
// Single place where "no tenant branding yet" becomes real display values.
// Every surface (sidebar, landing, login, footer, browser chrome) must read
// this resolver instead of inventing local `|| 'S.O.R.T.'` fallbacks.

export const DEFAULT_BRAND_NAME = 'S.O.R.T.';
export const DEFAULT_BRAND_ACRONYM = 'SORT';
export const DEFAULT_BRAND_LOGO = '/SORT_LOGO.png';
export const FALLBACK_TITLE = 'S.O.R.T. — Smart Operational Recovery & Tracking';

export type ResolvableBranding = Pick<ThemeState, 'schoolName' | 'schoolAcronym' | 'logoUrl'> & {
  /** Optional for compatible payloads; derived when absent. */
  brandingSource?: BrandingSource;
};

export interface BrandIdentity {
  /** Wordmark shown next to the logo. */
  displayName: string;
  /** Compact form for collapsed/compact spots. */
  acronym: string;
  /** Always resolves to a renderable URL. */
  logoSrc: string;
  /** True only when a tenant logo is actually configured. */
  hasTenantLogo: boolean;
  /** True when SORT defaults are in effect (no tenant identity). */
  isDefault: boolean;
  /** document.title value. */
  title: string;
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return DEFAULT_BRAND_ACRONYM;
  if (parts.length === 1) return parts[0].slice(0, 3).toUpperCase();
  return parts
    .slice(0, 6)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

/**
 * Pure mapping from theme state to the effective brand. Kept free of DOM
 * access so it can be unit-tested and reused on any surface.
 */
export function resolveBrandIdentity(state: ResolvableBranding): BrandIdentity {
  const schoolName = state.schoolName?.trim() ?? '';
  const tenantLogo = state.logoUrl?.trim() ?? '';
  const hasTenantLogo = tenantLogo.length > 0;

  const explicitSource = state.brandingSource;
  const isDefault = explicitSource
    ? explicitSource === 'default'
    : !schoolName && !hasTenantLogo;

  const acronym = (
    state.schoolAcronym?.trim() || (schoolName ? initialsFromName(schoolName) : DEFAULT_BRAND_ACRONYM)
  ).toUpperCase();

  return {
    displayName: schoolName || DEFAULT_BRAND_NAME,
    acronym: acronym || DEFAULT_BRAND_ACRONYM,
    logoSrc: hasTenantLogo ? tenantLogo : DEFAULT_BRAND_LOGO,
    hasTenantLogo,
    isDefault,
    title: schoolName ? `${schoolName} | SORT` : FALLBACK_TITLE,
  };
}
