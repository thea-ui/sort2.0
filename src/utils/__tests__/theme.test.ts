import { describe, expect, it } from 'vitest';
import {
  DEFAULT_THEME_STATE,
  defaultColors,
  isLightColor,
  normalizeBranding,
  resolveThemeVariables,
} from '../../hooks/useTheme';

describe('resolveThemeVariables', () => {
  it('reproduces the legacy default shades exactly', () => {
    const vars = resolveThemeVariables(defaultColors);
    expect(vars['--primary']).toBe('#00271D');
    expect(vars['--accent']).toBe('#00A77C');
    expect(vars['--gold']).toBe('#C69B26');
    expect(vars['--primary-light']).toBe('#003a2b');
    expect(vars['--accent-dark']).toBe('#008f6a');
    expect(vars['--accent-light']).toBe('#00c491');
    expect(vars['--accent-darker']).toBe('#007b5b');
  });

  it('computes readable contrast text from the primary color', () => {
    const light = resolveThemeVariables({ ...defaultColors, primary: '#f1f5f9' });
    expect(light['--on-primary']).toBe('#1f2937');

    const dark = resolveThemeVariables({ ...defaultColors, primary: '#7f1d1d' });
    expect(dark['--on-primary']).toBe('#ffffff');
  });

  it('mirrors EnrollPro-compatible aliases and RGB triplets', () => {
    const vars = resolveThemeVariables({ ...defaultColors, accent: '#ff0000' });
    expect(vars['--accent-color']).toBe('#ff0000');
    expect(vars['--accent-rgb']).toBe('255, 0, 0');
    expect(vars['--color-accent']).toBe('#ff0000');
    expect(vars['--ring']).toBe('#ff0000');
  });

  it('writes the SMART-compatible --theme-* aliases and chart-1', () => {
    const vars = resolveThemeVariables({ ...defaultColors, primary: '#7f1d1d', secondary: '#991b1b', accent: '#b91c1c' });
    expect(vars['--theme-primary']).toBe('#7f1d1d');
    expect(vars['--theme-secondary']).toBe('#991b1b');
    expect(vars['--theme-accent']).toBe('#b91c1c');
    expect(vars['--chart-1']).toBe('#7f1d1d');
    expect(vars['--primary-foreground']).toBe('#ffffff');
    expect(vars['--color-primary-foreground']).toBe('#ffffff');
    expect(vars['--theme-primary-text']).toBe('#ffffff');
    expect(vars['--theme-primary-rgb']).toBe('127, 29, 29');
    expect(vars['--theme-primary-light']).toBe('#a74545');
    expect(vars['--theme-primary-dark']).toBe('#570000');
  });

  it('keeps SORT --primary-light semantics (not the SMART +40 shade)', () => {
    const vars = resolveThemeVariables(defaultColors);
    expect(vars['--primary-light']).toBe('#003a2b');
    expect(vars['--theme-primary-light']).toBe('#284f45');
  });

  it('never clamps channels outside 0-255 when scaling', () => {
    const vars = resolveThemeVariables({ ...defaultColors, accent: '#ffff00' });
    expect(vars['--accent-light']).toBe('#ffff00');
    expect(vars['--accent-dark']).toBe('#dada00');
  });

  it('keeps --text-strong a neutral near-black regardless of the tenant primary', () => {
    // Regression: a dark red EnrollPro primary used to tint ALL copy red.
    expect(resolveThemeVariables({ ...defaultColors, primary: '#00271D' })['--text-strong']).toBe('#111827');
    expect(resolveThemeVariables({ ...defaultColors, primary: '#f1f5f9' })['--text-strong']).toBe('#111827');
    expect(resolveThemeVariables({ ...defaultColors, primary: '#861313' })['--text-strong']).toBe('#111827');
  });

  it('falls back to the primary brand color when the tenant accent is achromatic', () => {
    const vars = resolveThemeVariables({ ...defaultColors, primary: '#7f1d1d', accent: '#a8a8a8' });
    expect(vars['--accent']).toBe('#7f1d1d');
    expect(vars['--accent-color']).toBe('#7f1d1d');
    expect(vars['--accent-rgb']).toBe('127, 29, 29');
    expect(vars['--on-accent']).toBe('#ffffff');
  });
});

describe('isLightColor', () => {
  it('classifies light and dark colors', () => {
    expect(isLightColor('#ffffff')).toBe(true);
    expect(isLightColor('#00271D')).toBe(false);
  });
});

describe('normalizeBranding', () => {
  it('falls back to SORT defaults for an empty payload', () => {
    const state = normalizeBranding(null);
    expect(state.colors).toEqual(defaultColors);
    expect(state.schoolName).toBe('');
    expect(state.enrollproPublicUrl).toBe(DEFAULT_THEME_STATE.enrollproPublicUrl);
  });

  it('rejects invalid colors and unknown keys', () => {
    const state = normalizeBranding({
      primaryColor: 'not-a-color',
      accentColor: '#00a77c',
      secret: 'should-be-ignored',
    });
    expect(state.colors.primary).toBe(defaultColors.primary);
    expect(state.colors.accent).toBe('#00a77c');
    expect((state as any).secret).toBeUndefined();
  });

  it('strips trailing slashes from the EnrollPro origin', () => {
    const state = normalizeBranding({ enrollproPublicUrl: 'https://example.ts.net///' });
    expect(state.enrollproPublicUrl).toBe('https://example.ts.net');
  });
});
