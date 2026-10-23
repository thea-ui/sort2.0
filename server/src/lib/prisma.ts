import { PrismaClient } from '@prisma/client';

// Single shared PrismaClient for the whole process.
// Prisma docs: long-running apps must reuse ONE client — each `new PrismaClient()`
// would create its own query engine and connection pool (RAM + connection cost).
// The globalThis cache prevents extra clients during dev hot-reload restarts.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const configuredSlowQueryMs = Number(process.env.SLOW_QUERY_MS);
const SLOW_QUERY_MS =
  Number.isFinite(configuredSlowQueryMs) && configuredSlowQueryMs > 0 ? configuredSlowQueryMs : 500;

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log: [{ emit: 'event', level: 'query' }],
  });

  // Slow-query visibility for deployment monitoring (query events carry the
  // duration without a per-query middleware wrapper).
  client.$on('query', (event) => {
    if (event.duration >= SLOW_QUERY_MS) {
      const query = event.query.replace(/\s+/g, ' ').slice(0, 120);
      console.warn(`[SlowQuery] ${event.duration}ms ${query}`);
    }
  });

  return client;
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
