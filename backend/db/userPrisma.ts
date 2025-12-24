import { prisma } from './client';
import type { Role } from '@prisma/client';

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
}

export async function findUserByPhone(phone: string) {
  // Normalize phone number (remove spaces, dashes, etc.)
  const normalizedPhone = phone.replace(/[\s\-\(\)]/g, '').trim();
  
  // Try exact match first
  let user = await prisma.user.findFirst({
    where: {
      phone: normalizedPhone,
    },
  });
  
  // If not found, try with + prefix
  if (!user && !normalizedPhone.startsWith('+')) {
    user = await prisma.user.findFirst({
      where: {
        phone: `+${normalizedPhone}`,
      },
    });
  }
  
  // If not found, try without + prefix
  if (!user && normalizedPhone.startsWith('+')) {
    user = await prisma.user.findFirst({
      where: {
        phone: normalizedPhone.substring(1),
      },
    });
  }
  
  // If still not found, try partial match (last 9 digits for Azerbaijan)
  if (!user) {
    const digitsOnly = normalizedPhone.replace(/[^0-9]/g, '');
    if (digitsOnly.length >= 9) {
      const last9Digits = digitsOnly.slice(-9);
      const allUsers = await prisma.user.findMany({
        where: {
          phone: {
            not: null,
          },
        },
      });
      user = allUsers.find(u => {
        if (!u.phone) return false;
        const userDigits = u.phone.replace(/[^0-9]/g, '');
        return userDigits.slice(-9) === last9Digits;
      }) || null;
    }
  }
  
  return user;
}

export async function findUserById(id: string) {
  return prisma.user.findUnique({ where: { id } });
}

export async function createUser(data: {
  email: string;
  name: string;
  phone?: string | null;
  passwordHash?: string | null;
  verified?: boolean;
  role?: Role;
  balance?: number;
}) {
  return prisma.user.create({
    data: {
      email: data.email.toLowerCase(),
      name: data.name,
      phone: data.phone ?? null,
      passwordHash: data.passwordHash ?? null,
      verified: data.verified ?? false,
      role: data.role ?? 'USER',
      balance: data.balance ?? 0,
    },
  });
}

export async function setVerificationToken(userId: string, token: string, hours: number) {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + hours);

  await prisma.verificationToken.create({
    data: { token, expiresAt, userId },
  });

  return true;
}

export async function findByVerificationToken(token: string) {
  const vt = await prisma.verificationToken.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!vt) return null;
  if (vt.expiresAt < new Date()) return null;
  return vt.user;
}

export async function verifyEmail(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { verified: true },
  });
  // Clean up tokens for this user
  await prisma.verificationToken.deleteMany({ where: { userId } });
  return true;
}

export async function setPasswordResetToken(userId: string, token: string, hours: number) {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + hours);

  await prisma.passwordResetToken.create({
    data: { token, expiresAt, userId },
  });

  return true;
}

export async function findByPasswordResetToken(token: string) {
  const pr = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!pr) return null;
  if (pr.expiresAt < new Date()) return null;
  return pr.user;
}

export async function updatePassword(userId: string, passwordHash: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });
  await prisma.passwordResetToken.deleteMany({ where: { userId } });
  return true;
}


