import { describe, expect, it } from 'vitest';
import {
  DEFAULT_BRAND_ACRONYM,
  DEFAULT_BRAND_LOGO,
  DEFAULT_BRAND_NAME,
  FALLBACK_TITLE,
  resolveBrandIdentity,
} from '../brandIdentity';

const defaultState = {
  schoolName: '',
  schoolAcronym: null,
  logoUrl: null,
  brandingSource: 'default' as const,
};

describe('resolveBrandIdentity', () => {
  it('resolves the SORT default identity for an unconfigured tenant', () => {
    const identity = resolveBrandIdentity(defaultState);
    expect(identity.displayName).toBe(DEFAULT_BRAND_NAME);
    expect(identity.acronym).toBe(DEFAULT_BRAND_ACRONYM);
    expect(identity.logoSrc).toBe(DEFAULT_BRAND_LOGO);
    expect(identity.hasTenantLogo).toBe(false);
    expect(identity.isDefault).toBe(true);
    expect(identity.title).toBe(FALLBACK_TITLE);
  });

  it('resolves a tenant identity with explicit acronym and logo', () => {
    const identity = resolveBrandIdentity({
      schoolName: 'Bagong Silang National High School',
      schoolAcronym: 'BSNHS',
      logoUrl: '/uploads/logo-enrollpro-sync.png',
      brandingSource: 'tenant',
    });
    expect(identity.displayName).toBe('Bagong Silang National High School');
    expect(identity.acronym).toBe('BSNHS');
    expect(identity.logoSrc).toBe('/uploads/logo-enrollpro-sync.png');
    expect(identity.hasTenantLogo).toBe(true);
    expect(identity.isDefault).toBe(false);
    expect(identity.title).toBe('Bagong Silang National High School | SORT');
  });

  it('derives the acronym from the school name when none is configured', () => {
    const identity = resolveBrandIdentity({
      ...defaultState,
      schoolName: 'Bagong Silang National High School',
      brandingSource: 'tenant',
    });
    expect(identity.acronym).toBe('BSNHS');
  });

  it('keeps the tenant name but falls back to the SORT logo when no logo is set', () => {
    const identity = resolveBrandIdentity({
      schoolName: 'Test NHS',
      schoolAcronym: null,
      logoUrl: '   ',
      brandingSource: 'tenant',
    });
    expect(identity.displayName).toBe('Test NHS');
    expect(identity.logoSrc).toBe(DEFAULT_BRAND_LOGO);
    expect(identity.hasTenantLogo).toBe(false);
  });

  it('derives the source when a compatible payload omits brandingSource', () => {
    expect(resolveBrandIdentity({ ...defaultState, brandingSource: undefined }).isDefault).toBe(true);
    expect(resolveBrandIdentity({ ...defaultState, schoolName: 'Test NHS', brandingSource: undefined }).isDefault).toBe(
      false
    );
    expect(
      resolveBrandIdentity({ ...defaultState, logoUrl: '/uploads/x.png', brandingSource: undefined }).isDefault
    ).toBe(false);
  });
});
