/**
 * PM2 process model for SORTv2 (Phase 6).
 *
 *   sort-api     — HTTP API only (RUN_SCHEDULERS=false), capped heap.
 *   sort-worker  — cron/interval owner (sync, bin reset, ATLAS, branding).
 *
 * Commands:
 *   npm --prefix server run build
 *   pm2 start ecosystem.config.cjs
 *   pm2 save
 *
 * The frontend (`dist/`) is served by the reverse proxy/static host; this file
 * only manages backend processes.
 */
module.exports = {
  apps: [
    {
      name: 'sort-api',
      cwd: './server',
      script: 'dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      node_args: '--max-old-space-size=384',
      max_memory_restart: '512M',
      autorestart: true,
      restart_delay: 2000,
      kill_timeout: 10000,
      env: {
        NODE_ENV: 'production',
        RUN_SCHEDULERS: 'false',
      },
    },
    {
      name: 'sort-worker',
      cwd: './server',
      script: 'dist/worker.js',
      instances: 1,
      exec_mode: 'fork',
      node_args: '--max-old-space-size=256',
      max_memory_restart: '384M',
      autorestart: true,
      restart_delay: 5000,
      kill_timeout: 30000,
      env: {
        NODE_ENV: 'production',
        RUN_SCHEDULERS: 'true',
      },
    },
  ],
};
