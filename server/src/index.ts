import { validateEnv } from './config/env.js';
import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import reportRoutes from './routes/report.routes.js';
import binRoutes from './routes/bin.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import marketRoutes from './routes/market.routes.js';
import syncRoutes from './routes/sync.routes.js';
import schoolYearRoutes from './routes/school-year.routes.js';
import challengeRoutes from './routes/challenge.routes.js';
import certificateRoutes from './routes/certificate.routes.js';
import assetRoutes from './routes/asset.routes.js';
import assetScrapRoutes from './routes/asset-scrap.routes.js';
import atlasRoutes from './routes/atlas.routes.js';
import walkInRoutes from './routes/walk-in.routes.js';
import rewardRoutes from './routes/reward.routes.js';
import offlineAuthRoutes from './routes/offline-auth.routes.js';
import { rescheduleSync } from './services/sync-scheduler.service.js';
import { rescheduleBinReset } from './services/bin-reset.service.js';
import { rescheduleAtlasSync } from './services/atlas-sync-scheduler.service.js';
import { startBrandingSyncScheduler } from './services/branding-sync-scheduler.service.js';
import { startOfflineAuthScheduler } from './services/offline-auth-scheduler.service.js';
import { getOfflineAuthState, setOfflineAuthEnabled } from './services/offline-auth.service.js';
import { UPLOADS_DIR } from './services/enrollpro-branding.service.js';
import { mkdirSync } from 'node:fs';

// Fail fast: never boot with a missing or insecure JWT secret.
validateEnv();

const app = express();
const PORT = process.env.PORT || 5000;

// When the API sits behind a reverse proxy (Tailscale Serve, nginx, a cloud
// load balancer), Express must trust that proxy so it reads the real client IP
// from X-Forwarded-For. Otherwise express-rate-limit throws
// ERR_ERL_UNEXPECTED_X_FORWARDED_FOR and aborts login requests.
// Set TRUST_PROXY to a hop count (e.g. "1"), a preset ("loopback"), or "true".
const trustProxy = (process.env.TRUST_PROXY || 'loopback').trim();
app.set(
  'trust proxy',
  trustProxy === 'true' ? true : /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy
);

// Prevent unhandled rejections from crashing the server
process.on('unhandledRejection', (reason: any) => {
  console.error('[Server] Unhandled Rejection:', reason?.message || reason);
});
process.on('uncaughtException', (err) => {
  console.error('[Server] Uncaught Exception:', err.message);
});

// Middleware
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const isLocalDevOrigin = (origin: string) =>
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

app.use(
  cors({
    origin(origin, callback) {
      // Non-browser clients (curl, health checks) send no Origin header.
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (isLocalDevOrigin(origin)) return callback(null, true);
      // Self-hosted tailnet access (e.g. *.ts.net)
      if (origin.endsWith('.ts.net')) return callback(null, true);
      // Reject by omitting CORS headers rather than throwing a 500.
      return callback(null, false);
    },
    credentials: false,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Synced tenant assets (EnrollPro logo) are served from SORT's own origin.
mkdirSync(UPLOADS_DIR, { recursive: true });
app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '1h' }));

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
app.use('/api/challenges', challengeRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/asset-scrap', assetScrapRoutes);
app.use('/api/atlas', atlasRoutes);
app.use('/api/walk-ins', walkInRoutes);
app.use('/api/rewards', rewardRoutes);
app.use('/api/offline-auth', offlineAuthRoutes);

// Global Error Handler — log the full error, never leak internals to clients
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const errorId = crypto.randomUUID();
  const status =
    typeof err?.status === 'number' ? err.status : typeof err?.statusCode === 'number' ? err.statusCode : 500;

  console.error(`[Server] Unhandled error [${errorId}]:`, err?.stack || err?.message || err);

  if (status >= 500) {
    return res.status(500).json({ error: 'Internal server error', errorId });
  }
  // Client errors (e.g. malformed JSON) are safe to describe.
  return res.status(status).json({ error: err?.message || 'Bad request', errorId });
});

// ─── Settings-Driven Sync Scheduler ───────────────────────────────────
// Default mode = MANUAL: no cron scheduled, no unconditional startup sync.
// When mode = AUTOMATIC: schedule node-cron at the configured interval.
rescheduleSync().catch(err => {
  console.error('[Server] Failed to initialize sync scheduler:', err.message);
});

// ─── Daily 6:00 PM Bin Reset Scheduler ─────────────────────────────────
rescheduleBinReset().catch(err => {
  console.error('[Server] Failed to initialize bin reset scheduler:', err.message);
});

// ─── ATLAS Campus Map Auto-Sync Scheduler (AUTO, default every 15 min) ──
rescheduleAtlasSync().catch(err => {
  console.error('[Server] Failed to initialize ATLAS sync scheduler:', err.message);
});

// ─── EnrollPro Branding Sync (boot + every 60 minutes) ─────────────────
startBrandingSyncScheduler();

// ─── Break-glass Offline Auth auto-revert (every 5 minutes) ────────────
// An armed fallback must never survive EnrollPro coming back.
startOfflineAuthScheduler();

// Escape hatch for a completely locked-out install: arm offline auth from the
// server environment when nobody can sign in. Server-config access is already
// trusted, and the normal 72h cap + auto-revert still apply.
if ((process.env.OFFLINE_AUTH_ENABLED || '').trim().toLowerCase() === 'true') {
  getOfflineAuthState()
    .then((state) => {
      if (state.enabled) {
        console.log('[OfflineAuth] Already armed at boot; leaving the window unchanged');
        return;
      }
      const parsed = Number(process.env.OFFLINE_AUTH_HOURS);
      const hours = Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 72) : 72;
      return setOfflineAuthEnabled(true, { name: 'env-boot-override', role: 'SYSTEM' }, {
        hours,
        reason: 'OFFLINE_AUTH_ENABLED set in server environment',
      });
    })
    .catch((err) => console.error('[OfflineAuth] Boot override failed:', err.message));
}

app.listen(PORT, () => {
  console.log(`SORTv2 PostgreSQL Express Server listening on http://localhost:${PORT}`);
});
