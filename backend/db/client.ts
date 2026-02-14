import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { logger } from '../utils/logger';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
// Learn more: https://pris.ly/d/help/next-js-best-practices

const globalForPrisma = global as unknown as { prisma: PrismaClient; pool: Pool };

const HAS_DATABASE = !!process.env.DATABASE_URL?.trim();

function createPrisma(): PrismaClient {
  if (!HAS_DATABASE) {
    return new Proxy({} as PrismaClient, {
      get() {
        throw new Error(
          'Database not configured. Set DATABASE_URL in .env for Prisma features. Auth uses in-memory store when DB is not set.'
        );
      },
    });
  }
  const pool =
    globalForPrisma.pool ||
    new Pool({ connectionString: process.env.DATABASE_URL });
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.pool = pool;
  }
  const adapter = new PrismaPg(pool);
  return (
    globalForPrisma.prisma ||
    new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    })
  );
}

export const prisma = createPrisma();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

if (HAS_DATABASE) {
  process.on('SIGINT', async () => {
    await prisma.$disconnect();
    logger.info('[Prisma] Disconnected');
    process.exit(0);
  });
  process.on('SIGTERM', async () => {
    await prisma.$disconnect();
    logger.info('[Prisma] Disconnected');
    process.exit(0);
  });
}
