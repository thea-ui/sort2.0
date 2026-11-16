import { describe, expect, it } from 'vitest';

import { PWA_DEFAULT_THEME_COLOR, resolveManifestThemeColor } from '../themeColor';

describe('resolveManifestThemeColor', () => {
  it('keeps dark brand primaries', () => {
    expect(resolveManifestThemeColor('#00271D')).toBe('#00271d');
    expect(resolveManifestThemeColor('#0B5D4B')).toBe('#0b5d4b');
  });

  it('falls back to the readable default for light colors', () => {
    expect(resolveManifestThemeColor('#FFFFFF')).toBe(PWA_DEFAULT_THEME_COLOR);
    expect(resolveManifestThemeColor('#F9F3F0')).toBe(PWA_DEFAULT_THEME_COLOR);
  });

  it('rejects malformed and missing values', () => {
    expect(resolveManifestThemeColor('teal')).toBe(PWA_DEFAULT_THEME_COLOR);
    expect(resolveManifestThemeColor('#12345')).toBe(PWA_DEFAULT_THEME_COLOR);
    expect(resolveManifestThemeColor(null)).toBe(PWA_DEFAULT_THEME_COLOR);
    expect(resolveManifestThemeColor(undefined)).toBe(PWA_DEFAULT_THEME_COLOR);
  });
});
