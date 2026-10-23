import type { ClientRateLimitInfo, Options, Store } from 'express-rate-limit';
import { prisma } from './prisma.js';

interface CounterRow {
  total_hits: number;
  reset_at: Date;
}

/**
 * PostgreSQL-backed express-rate-limit store (Phase 6).
 *
 * The default MemoryStore counts per process, so limits silently loosen when
 * the API runs as multiple instances (or restarts). This store keeps the
 * counters in `rate_limit_counters` and degrades to a local in-memory counter
 * if the database is unavailable, so login never fails because of the limiter.
 */
export class PrismaRateLimitStore implements Store {
  localKeys = false;

  private windowMs = 60_000;
  private lastCleanupAt = 0;
  private readonly fallback = new Map<string, ClientRateLimitInfo>();

  init(options: Options): void {
    this.windowMs = options.windowMs;
  }

  async increment(key: string): Promise<ClientRateLimitInfo> {
    const now = new Date();
    const nextResetAt = new Date(now.getTime() + this.windowMs);

    try {
      const rows = await prisma.$queryRaw<CounterRow[]>`
        INSERT INTO "rate_limit_counters" ("key", "total_hits", "reset_at")
        VALUES (${key}, 1, ${nextResetAt})
        ON CONFLICT ("key") DO UPDATE SET
          "total_hits" = CASE
            WHEN "rate_limit_counters"."reset_at" <= ${now} THEN 1
            ELSE "rate_limit_counters"."total_hits" + 1
          END,
          "reset_at" = CASE
            WHEN "rate_limit_counters"."reset_at" <= ${now} THEN ${nextResetAt}
            ELSE "rate_limit_counters"."reset_at"
          END
        RETURNING "total_hits", "reset_at"
      `;

      const row = rows[0];
      this.cleanupOccasionally(now);
      return {
        totalHits: Number(row?.total_hits ?? 1),
        resetTime: row?.reset_at ?? nextResetAt,
      };
    } catch (error: any) {
      // Degrade, never fail the request: local counters still enforce the limit
      // for this process until the database is back.
      const current = this.fallback.get(key);
      const withinWindow = current?.resetTime instanceof Date && current.resetTime > now;
      const next: ClientRateLimitInfo = {
        totalHits: withinWindow ? (current!.totalHits ?? 0) + 1 : 1,
        resetTime: withinWindow ? current!.resetTime : nextResetAt,
      };
      this.fallback.set(key, next);
      console.warn('[RateLimit] Shared store unavailable, using local counter:', error?.message || error);
      return next;
    }
  }

  async decrement(key: string): Promise<void> {
    try {
      await prisma.rateLimitCounter.updateMany({
        where: { key, totalHits: { gt: 0 } },
        data: { totalHits: { decrement: 1 } },
      });
    } catch {
      const current = this.fallback.get(key);
      if (current && current.totalHits > 0) {
        this.fallback.set(key, { ...current, totalHits: current.totalHits - 1 });
      }
    }
  }

  async resetKey(key: string): Promise<void> {
    this.fallback.delete(key);
    try {
      await prisma.rateLimitCounter.deleteMany({ where: { key } });
    } catch {
      /* best-effort reset */
    }
  }

  /** Drop expired counters at most every 5 minutes. */
  private cleanupOccasionally(now: Date): void {
    if (now.getTime() - this.lastCleanupAt < 5 * 60_000) return;
    this.lastCleanupAt = now.getTime();
    prisma.rateLimitCounter
      .deleteMany({ where: { resetAt: { lt: now } } })
      .catch(() => undefined);
  }
}
