/**
 * Verifies which EnrollPro host SORT is actually using.
 * Usage: node scripts/perf/enrollpro-health.mjs [baseUrl]
 */
// @ts-ignore - plain ESM helper without type declarations
import { resolveToken } from '../e2e/token.mjs';

const baseUrl = process.argv[2] || process.env.SMOKE_BASE_URL || 'http://localhost:5000';
const admin = await resolveToken(baseUrl, 'ADMIN');
if (!admin?.token) {
  console.error('[enrollpro-health] No usable ADMIN token — is the API running?');
  process.exit(1);
}

const headers = { Authorization: `Bearer ${admin.token}` };

const healthResponse = await fetch(`${baseUrl}/api/sync/health`, { headers });
const health = await healthResponse.json();
console.log(`[enrollpro-health] /api/sync/health → HTTP ${healthResponse.status}`);
console.log(
  JSON.stringify(
    {
      enrollproOnline: health.enrollproOnline,
      healthStatus: health.healthStatus,
      integrationKeyConfigured: health.integrationKeyConfigured,
      integrationKeyValid: health.integrationKeyValid,
      integrationError: health.integrationError,
      systems: health.systems,
    },
    null,
    2
  )
);

const settings = await fetch(`${baseUrl}/api/settings/public`).then((response) => response.json());
console.log(`[enrollpro-health] branding source → school="${settings.schoolName || ''}" palette=${settings.colorScheme?.palette?.[0]?.hex || 'n/a'}`);

if (!health.enrollproOnline || !health.integrationKeyValid) {
  console.error('[enrollpro-health] FAIL: EnrollPro is not reachable with the configured integration key.');
  process.exit(1);
}
console.log('[enrollpro-health] PASS');
