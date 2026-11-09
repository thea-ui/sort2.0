import test from 'node:test';
import assert from 'node:assert/strict';

import {
  EMEMHS_BRANDING,
  getBrandingPresetName,
  isBrandingSyncDisabled,
} from '../branding-preset.service.js';

test('BP1: EMEMHS preset pins the school identity and local logo', () => {
  assert.equal(EMEMHS_BRANDING.schoolName, 'ENRIQUETA MONTILLA DE ESTEBAN MEMORIAL HIGH SCHOOL');
  assert.equal(EMEMHS_BRANDING.schoolAcronym, 'EMEMHS');
  assert.equal(EMEMHS_BRANDING.logoUrl, '/uploads/logo-ememhs.png');
  assert.equal(EMEMHS_BRANDING.primaryColor, '#861313');
  assert.equal(EMEMHS_BRANDING.secondaryColor, '#c79229');
});

test('BP2: presentation preset disables EnrollPro branding sync', () => {
  assert.equal(getBrandingPresetName({ BRANDING_PRESET: 'ememhs' } as NodeJS.ProcessEnv), 'EMEMHS');
  assert.equal(isBrandingSyncDisabled({ BRANDING_PRESET: 'EMEMHS' } as NodeJS.ProcessEnv), true);
  assert.equal(isBrandingSyncDisabled({ BRANDING_SYNC_DISABLED: 'true' } as NodeJS.ProcessEnv), true);
  assert.equal(isBrandingSyncDisabled({} as NodeJS.ProcessEnv), false);
  assert.equal(isBrandingSyncDisabled({ BRANDING_PRESET: '' } as NodeJS.ProcessEnv), false);
});
