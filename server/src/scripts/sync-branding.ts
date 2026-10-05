import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SERVER_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

dotenv.config({ path: path.join(SERVER_ROOT, '.env') });

const { syncEnrollProBranding } = await import('../services/enrollpro-branding.service.js');

const result = await syncEnrollProBranding();

if (result.status === 'synced') {
  const logo = result.logoUpdated ? ' + logo' : '';
  console.log(`Branding synced: ${result.colors.primary}/${result.colors.secondary}/${result.colors.accent}${logo}`);
  process.exit(0);
}

console.error(`Branding sync failed: ${result.error || 'unknown error'}`);
process.exit(1);
