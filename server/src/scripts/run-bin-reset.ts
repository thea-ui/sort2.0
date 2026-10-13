import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * One-off manual trigger for the daily bin reset (plan §12 Phase 4, Option B).
 *
 * Runs the same `executeDailyBinReset()` the 18:00 Asia/Manila cron runs:
 * clears every bin and expires PENDING + DISPATCHED WASTE reports. ASSET
 * reports are never touched. Use it when the server restarted after 18:00 or
 * when a demo needs the reset applied immediately.
 *
 * Usage: npm run db:run-bin-reset
 */

const SERVER_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
dotenv.config({ path: path.join(SERVER_ROOT, '.env') });

// Dynamic import so DATABASE_URL from .env is loaded before the service
// instantiates its PrismaClient.
const { executeDailyBinReset } = await import('../services/bin-reset.service.js');

const result = await executeDailyBinReset();
console.log('[run-bin-reset]', result);

process.exit(result.error ? 1 : 0);
