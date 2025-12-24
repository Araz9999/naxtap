import { prisma } from './db/client';
import { hashPassword } from './utils/password';

async function main() {
  const users = [
    { email: 'user@test.com',      name: 'Test User',      password: 'Test1234',  role: 'USER' },
    { email: 'admin@test.com',     name: 'Admin User',     password: 'Admin1234', role: 'ADMIN' },
    { email: 'moderator@test.com', name: 'Moderator User', password: 'Mod1234',   role: 'MODERATOR' },
  ] as const;

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
          role: u.role as any,
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
  });


