require('dotenv/config');

const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const crypto = require('crypto');

// Simple PBKDF2 hash for seeding passwords (separate from TS helper)
async function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.pbkdf2(password, salt, 100000, 32, 'sha256', (err, derivedKey) => {
      if (err) return reject(err);
      const hash = derivedKey.toString('hex');
      resolve(`${salt}:${hash}`);
    });
  });
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const users = [
    { email: 'user@test.com',      name: 'Test User',      password: 'Test1234',  role: 'USER' },
    { email: 'admin@test.com',     name: 'Admin User',     password: 'Admin1234', role: 'ADMIN' },
    { email: 'moderator@test.com', name: 'Moderator User', password: 'Mod1234',   role: 'MODERATOR' },
  ];

  for (const u of users) {
    const existing = await prisma.user.findUnique({
      where: { email: u.email.toLowerCase() },
    });

    if (!existing) {
      await prisma.user.create({
        data: {
          email: u.email.toLowerCase(),
          name: u.name,
          passwordHash: await hashPassword(u.password),
          role: u.role,
          verified: true,
        },
      });
    }
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });


