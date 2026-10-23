# SORTv2 — Deployment Runbook

> Phase 6 (deployment hardening). Covers the process model, PostgreSQL/pgBouncer
> sizing, migrations, photo storage, backups, monitoring and the load test.

## 1. Topology

```
Internet/VPN → TLS reverse proxy (nginx/Caddy)
                ├── static:  frontend build (dist/)
                └── /api, /uploads, /health → sort-api  (Node, 1 process, heap-capped)
sort-worker (Node, 1 process) ─── schedulers: EnrollPro sync, daily bin reset,
                                  ATLAS sync, branding refresh
PostgreSQL 16+  ←  pgBouncer (transaction mode)  ←  sort-api / sort-worker
uploads/ (persistent volume) — report photos + synced school logo
```

- `sort-api` serves HTTP only. Start it with `RUN_SCHEDULERS=false` once the
  worker exists, so API restarts/limits cannot duplicate cron jobs.
- `sort-worker` runs `dist/worker.js` and never listens on a port. Exactly **one**
  worker per environment — two workers would run every job twice.
- `uploads/` must be a persistent volume (report photos, logo). Back it up with
  the database.

## 2. Required environment

See `server/.env.example`. Production extras:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | `postgresql://sort_app:PASSWORD@127.0.0.1:6432/sortv2_db?schema=public&connection_limit=5` (pgBouncer port) |
| `RUN_SCHEDULERS` | `false` on the API, `true` in the worker |
| `SLOW_QUERY_MS` | `500` (log queries slower than this) |
| `JWT_SECRET` | ≥ 32 random chars |
| `CORS_ORIGINS` | the exact site origin(s), comma separated |
| `TRUST_PROXY` | `1` behind one proxy hop (or `loopback`) |
| `PORT` | API port (proxied, not public) |

## 3. Build and start

```bash
npm ci
npm run build                        # frontend (dist/)
npm --prefix server ci
npm --prefix server run build        # server/dist
pm2 start ecosystem.config.cjs       # sort-api + sort-worker
pm2 save
```

`ecosystem.config.cjs` caps heaps (`--max-old-space-size`), restarts on memory
growth, and sets `RUN_SCHEDULERS` per process. Logs: `pm2 logs sort-api|sort-worker`.

## 4. Database migrations

### ⚠️ Current migration-history drift (resolve before the first deploy)

`prisma migrate status` currently reports:

- DB-only migration: `20260920160000_kilo_leaderboard` (not in this repo).
- Local migration not applied to the dev DB: `20261015000000_market_approval_reference`.
- Schema/DB drift on `certificates`: enum `CertificateType` differs and the legacy
  `prize_given*` columns still exist in the DB.

A fresh production database can run the full migration chain. For an existing
database, reconcile first:

```bash
# Mark migrations that are already reflected in the schema as applied, or create
# a reconciliation migration from the diff; then verify:
npx prisma migrate status
npx prisma migrate diff --from-schema-datasource prisma/schema.prisma \
  --to-schema-datamodel prisma/schema.prisma --script   # must be empty
```

Phase 6 itself adds `prisma/migrations/20261021120000_phase6_deployment_hardening`
(adds `reports.photo_path`, the reports list index and `rate_limit_counters`).

Release order: **back up → `prisma migrate deploy` → run the photo backfill →
restart API/worker.**

### pgBouncer

```ini
[databases]
sortv2_db = host=127.0.0.1 port=5432 dbname=sortv2_db

[pgbouncer]
listen_addr = 127.0.0.1
listen_port = 6432
pool_mode = transaction
max_client_conn = 200
default_pool_size = 20      ; Postgres-side pool shared by all app processes
```

Sizing: `default_pool_size` ≥ (API instances × `connection_limit`) + worker
`connection_limit` + admin headroom. Each Postgres connection costs ~1.5–14.5 MB
server RAM. Keep the app's `connection_limit` at 5–10 and leave the rest for
`psql`, migrations and monitoring.

## 5. Photo storage

- New uploads are written to `uploads/reports/<reportId>.<ext>`; the DB stores
  `reports.photo_path`. The authenticated route `GET /api/reports/:id/photo`
  streams the file (immutable browser cache).
- Migrate legacy base64 rows once (idempotent, safe while running):
  ```bash
  npm --prefix server run db:migrate-photos
  ```
  Verify: `SELECT count(*) FROM reports WHERE image_url LIKE 'data:%';` → 0.
- Keep `uploads/` on a persistent volume and include it in backups. The
  `image_url` column is retained for rollback; drop it in a later migration once
  every environment has run the backfill.

## 6. Backups and restore

```bash
# Nightly (cron): database + photos
pg_dump -Fc -h 127.0.0.1 -U sort_app sortv2_db > /backups/sortv2-$(date +%F).dump
tar czf /backups/uploads-$(date +%F).tar.gz -C server uploads/

# Restore drill (quarterly, on a scratch DB)
createdb sortv2_restore
pg_restore -h 127.0.0.1 -U sort_app -d sortv2_restore /backups/sortv2-YYYY-MM-DD.dump
tar xzf /backups/uploads-YYYY-MM-DD.tar.gz -C server
```

Retention: 14 daily + 8 weekly + 12 monthly. Test one restore before every
release that includes a migration.

## 7. Monitoring

| Signal | Endpoint / source | Expected |
|---|---|---|
| Liveness | `GET /health` | 200 `ok` |
| DB + memory | `GET /health/deep` | `status: ok`, `db.latencyMs` < 50, `connections` ≤ pool |
| Slow queries | API logs `[SlowQuery] <ms> <sql>` | investigate repeated > 500 ms |
| Scheduler jobs | worker logs `[Scheduler]`, `[BinReset]`, `[AtlasScheduler]`, `[Sync]` | one run per cadence, no overlaps |
| Memory | PM2 `sort-api` / `sort-worker` RSS | API ≤ 512 MB, worker ≤ 384 MB |
| Rate limits | DB `rate_limit_counters` | shared across instances; expired rows cleaned every 5 min |

`/health/deep` is cached for 2 s. Restrict `/health/deep` at the proxy if the
connection counts should not be public.

## 8. Load test (pre-release)

```bash
npm run test:load                       # defaults: 40 req/path, concurrency 8
LOAD_REQUESTS=200 LOAD_CONCURRENCY=16 npm run test:load
```

Fails on any request error or a p95 above `LOAD_P95_BUDGET_MS` (default 1500 ms).
Run it on staging against realistic seeded data before each release.

## 9. Release checklist

1. CI green: `npm run verify` (lint, builds, unit, smokes, Playwright).
2. `npm run test:load` within budget on staging.
3. Backup database + `uploads/`; confirm the dump size is non-zero.
4. `prisma migrate deploy` (history reconciled — see §4).
5. `npm --prefix server run db:migrate-photos` (if not already done).
6. `pm2 restart sort-api sort-worker` (or `pm2 start` on first deploy).
7. Check `/health/deep`, worker logs (single scheduler run), and one photo
   upload + view through the UI.
8. Keep the previous release + backup until the next release is verified.
