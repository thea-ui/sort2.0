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
import dataSeedRoutes from './routes/data-seed.routes.js';
import { rescheduleSync, stopScheduledSync } from './services/sync-scheduler.service.js';
import { rescheduleBinReset, stopScheduledBinReset } from './services/bin-reset.service.js';
import { rescheduleAtlasSync, stopScheduledAtlasSync } from './services/atlas-sync-scheduler.service.js';
import { startBrandingSyncScheduler, stopBrandingSyncScheduler } from './services/branding-sync-scheduler.service.js';
import { UPLOADS_DIR } from './services/enrollpro-branding.service.js';
import { prisma } from './lib/prisma.js';
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

// An uncaught exception leaves the process in an undefined state: log it and
// exit so the supervisor restarts a clean process instead of a zombie that
// keeps DB pools, cron timers and the event loop alive.
process.on('uncaughtException', (err) => {
  console.error('[Server] Uncaught Exception:', err.stack || err.message);
  process.exit(1);
});

// Rejections are logged but do not kill the process; each background job
// already converts its own failures into error results.
process.on('unhandledRejection', (reason: any) => {
  console.error('[Server] Unhandled Rejection:', reason?.message || reason);
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

// Deep health: database round-trip, connection count and memory for deploy
// probes. Cached for 2s so the public endpoint cannot hammer PostgreSQL.
let deepHealthCache: { at: number; payload: Record<string, unknown> } | null = null;

app.get('/health/deep', async (_req, res) => {
  const now = Date.now();
  if (deepHealthCache && now - deepHealthCache.at < 2000) {
    return res.json(deepHealthCache.payload);
  }

  const startedAt = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const latencyMs = Date.now() - startedAt;
    const rows = await prisma.$queryRaw<{ connections: bigint }[]>`
      SELECT count(*)::bigint AS connections
      FROM pg_stat_activity
      WHERE datname = current_database()
    `;
    const memory = process.memoryUsage();
    const payload = {
      status: 'ok',
      db: { ok: true, latencyMs, connections: Number(rows[0]?.connections ?? 0n) },
      memory: {
        rssMb: Math.round(memory.rss / (1024 * 1024)),
        heapUsedMb: Math.round(memory.heapUsed / (1024 * 1024)),
      },
      uptimeSec: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
    deepHealthCache = { at: now, payload };
    return res.json(payload);
  } catch (error: any) {
    return res.status(503).json({
      status: 'degraded',
      db: { ok: false, error: error?.message || 'Database unreachable' },
      memory: { rssMb: Math.round(process.memoryUsage().rss / (1024 * 1024)) },
      uptimeSec: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  }
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
app.use('/api/data-seed', dataSeedRoutes);

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

// ─── Schedulers ────────────────────────────────────────────────────────
// Started only after a successful HTTP bind (see below), so a failed bind can
// never leave a zombie process running cron timers and DB pools.
function startSchedulers() {
  // Settings-driven sync scheduler. Default mode = MANUAL: no cron scheduled,
  // no unconditional startup sync. When mode = AUTOMATIC: cron at the interval.
  rescheduleSync().catch(err => {
    console.error('[Server] Failed to initialize sync scheduler:', err.message);
  });

  // Daily 6:00 PM bin reset scheduler.
  rescheduleBinReset().catch(err => {
    console.error('[Server] Failed to initialize bin reset scheduler:', err.message);
  });

  // ATLAS campus map auto-sync scheduler (AUTO, default every 15 min).
  rescheduleAtlasSync().catch(err => {
    console.error('[Server] Failed to initialize ATLAS sync scheduler:', err.message);
  });

  // EnrollPro branding sync (boot + every 60 minutes).
  startBrandingSyncScheduler();
}

const server = app.listen(PORT, () => {
  console.log(`SORTv2 PostgreSQL Express Server listening on http://localhost:${PORT}`);
  // Production runs the API with RUN_SCHEDULERS=false and a dedicated worker
  // process (dist/worker.js) owns every cron/interval, so API restarts and
  // memory limits cannot duplicate or interrupt scheduled jobs.
  if (process.env.RUN_SCHEDULERS === 'false') {
    console.log('[Server] Schedulers disabled (RUN_SCHEDULERS=false) — run the worker process.');
  } else {
    startSchedulers();
  }
});

server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`[Server] Port ${PORT} is already in use — another instance is running. Exiting.`);
  } else {
    console.error('[Server] Failed to start HTTP server:', error.message);
  }
  process.exit(1);
});

// ─── Graceful shutdown ─────────────────────────────────────────────────
// Stop timers, drain HTTP, release the Prisma pool. A hard timeout guarantees
// exit even if a connection hangs.
let shuttingDown = false;

async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[Server] ${signal} received — shutting down...`);

  stopScheduledSync();
  stopScheduledBinReset();
  stopScheduledAtlasSync();
  stopBrandingSyncScheduler();

  const forceExit = setTimeout(() => {
    console.error('[Server] Shutdown timed out — forcing exit.');
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  await new Promise<void>((resolve) => server.close(() => resolve()));
  await prisma.$disconnect().catch(() => undefined);

  console.log('[Server] Shutdown complete.');
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
