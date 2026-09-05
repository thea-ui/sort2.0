import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import reportRoutes from './routes/report.routes.js';
import binRoutes from './routes/bin.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import marketRoutes from './routes/market.routes.js';
import syncRoutes from './routes/sync.routes.js';
import schoolYearRoutes from './routes/school-year.routes.js';
import inventoryRoutes from './routes/inventory.routes.js';
import { runEnrollProSync, syncTermCalendar } from './services/enrollpro-sync.service.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Prevent unhandled rejections from crashing the server
process.on('unhandledRejection', (reason: any) => {
  console.error('[Server] Unhandled Rejection:', reason?.message || reason);
});
process.on('uncaughtException', (err) => {
  console.error('[Server] Uncaught Exception:', err.message);
});

// Middleware
app.use(cors({
  origin: '*',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health Check Endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'SORTv2 PostgreSQL Backend', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/bins', binRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/school-years', schoolYearRoutes);
app.use('/api/inventory', inventoryRoutes);

// Global Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// ─── EnrollPro Hourly Sync Cron ────────────────────────────────────────

const SYNC_CRON = process.env.SYNC_INTERVAL_CRON || '0 * * * *'; // Every hour at :00

let isSyncRunning = false;

cron.schedule(SYNC_CRON, async () => {
  if (isSyncRunning) {
    console.log('[Cron] Sync already in progress, skipping...');
    return;
  }

  isSyncRunning = true;
  console.log(`[Cron] Starting scheduled EnrollPro sync at ${new Date().toISOString()}`);

  try {
    const [userResult, termResult] = await Promise.all([
      runEnrollProSync(),
      syncTermCalendar(),
    ]);

    console.log(`[Cron] Sync finished: ${userResult.recordsCreated} created, ${userResult.recordsUpdated} updated, ${userResult.recordsDeleted} deleted (${userResult.durationMs}ms)`);
    if (termResult.error) {
      console.log(`[Cron] Term sync warning: ${termResult.error}`);
    }
  } catch (error: any) {
    console.error('[Cron] Sync failed:', error.message);
  } finally {
    isSyncRunning = false;
  }
});

console.log(`[Cron] EnrollPro sync scheduled: ${SYNC_CRON}`);

// ─── Initial Sync on Startup ──────────────────────────────────────────
// Run sync immediately on startup to ensure users exist for login
(async () => {
  console.log('[Startup] Running initial EnrollPro sync...');
  try {
    const [userResult, termResult] = await Promise.all([
      runEnrollProSync(),
      syncTermCalendar(),
    ]);
    console.log(`[Startup] Initial sync: ${userResult.recordsCreated} created, ${userResult.recordsUpdated} updated, ${userResult.recordsDeleted} deleted (${userResult.durationMs}ms)`);
    if (userResult.error) {
      console.error(`[Startup] Sync error: ${userResult.error}`);
    }
    if (termResult.error) {
      console.log(`[Startup] Term sync warning: ${termResult.error}`);
    }
  } catch (error: any) {
    console.error('[Startup] Initial sync failed:', error.message);
  }
})();

app.listen(PORT, () => {
  console.log(`SORTv2 PostgreSQL Express Server listening on http://localhost:${PORT}`);
});
