import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import reportRoutes from './routes/report.routes.js';
import binRoutes from './routes/bin.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import marketRoutes from './routes/market.routes.js';
import syncRoutes from './routes/sync.routes.js';
import schoolYearRoutes from './routes/school-year.routes.js';
import inventoryRoutes from './routes/inventory.routes.js';
import challengeRoutes from './routes/challenge.routes.js';
import assetRoutes from './routes/asset.routes.js';
import { rescheduleSync } from './services/sync-scheduler.service.js';
import { rescheduleBinReset } from './services/bin-reset.service.js';

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
app.use('/api/challenges', challengeRoutes);
app.use('/api/assets', assetRoutes);

// Global Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
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

app.listen(PORT, () => {
  console.log(`SORTv2 PostgreSQL Express Server listening on http://localhost:${PORT}`);
});
