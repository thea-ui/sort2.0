import dotenv from 'dotenv';
import { runEnrollProSync, syncTermCalendar } from '../services/enrollpro-sync.service.js';

dotenv.config();

async function main() {
  const allowEmpty = process.argv.includes('--allow-empty');
  if (allowEmpty) {
    console.warn('⚠ --allow-empty: a cohort that returns 0 records may be archived. Use only when the empty roster is expected.\n');
  }

  console.log('=== EnrollPro Bulk Sync ===\n');

  const start = Date.now();

  const [userResult, termResult] = await Promise.all([
    runEnrollProSync({ allowEmpty }),
    syncTermCalendar(),
  ]);

  const duration = Date.now() - start;

  console.log('\n--- User Sync Results ---');
  console.log(`Status: ${userResult.status}`);
  console.log(`Pulled: ${userResult.recordsPulled}`);
  console.log(`Created: ${userResult.recordsCreated}`);
  console.log(`Updated: ${userResult.recordsUpdated}`);
  console.log(`Deleted: ${userResult.recordsDeleted}`);
  console.log(`Duration: ${userResult.durationMs}ms`);

  if (userResult.cohortResults) {
    console.log('\n--- Per-Cohort Results ---');
    for (const [cohort, result] of Object.entries(userResult.cohortResults)) {
      const r = result as any;
      const status = r.error ? 'FAILED' : 'OK';
      console.log(`  ${cohort}: ${status} — pulled: ${r.pulled}, created: ${r.created}, updated: ${r.updated}, deleted: ${r.deleted}${r.error ? `, error: ${r.error}` : ''}`);
    }
  }

  console.log('\n--- Term Calendar Sync ---');
  console.log(`Synced: ${termResult.synced}`);
  if (termResult.error) {
    console.log(`Error: ${termResult.error}`);
  }

  if (userResult.reconciliationSkipped?.length) {
    console.log(`\n⚠ Reconciliation withheld for: ${userResult.reconciliationSkipped.join(', ')} (empty/unsafe roster)`);
  }

  if (userResult.message) {
    console.log(`Note: ${userResult.message}`);
  }

  console.log(`\nTotal duration: ${duration}ms`);

  if (userResult.status === 'FAILED') {
    process.exit(1);
  }
  if (userResult.status === 'PARTIAL') {
    process.exit(2);
  }
}

main().catch((err) => {
  console.error('Bulk sync failed:', err);
  process.exit(1);
});
