import { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { verifyToken } from '../utils/jwt';
import { logger } from '../utils/logger';
export const createContext = async (opts: FetchCreateContextFnOptions) => {
  const authHeader = opts.req.headers.get('authorization');
  let user: (Awaited<ReturnType<typeof verifyToken>> & { id: string }) | null = null;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    // verifyToken returns null on error (including expired tokens) - it doesn't throw
    // So we can safely await it without try-catch
    const verified = await verifyToken(token);
    user = verified ? { ...verified, id: verified.userId } : null;
  }

  return {
    req: opts.req,
    user,
    ip:
      opts.req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      opts.req.headers.get('cf-connecting-ip') ||
      opts.req.headers.get('x-real-ip') ||
      null,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

const isAuthenticated = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Giriş tələb olunur',
    });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

const isModerator = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Giriş tələb olunur',
    });
  }
  // ✅ Check both uppercase (from JWT) and lowercase (normalized) roles
  const role = ctx.user.role?.toUpperCase();
  if (role !== 'MODERATOR' && role !== 'ADMIN') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Bu əməliyyat üçün moderator icazəsi tələb olunur',
    });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

const isAdmin = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Giriş tələb olunur',
    });
  }
  // ✅ Check both uppercase (from JWT) and lowercase (normalized) roles
  const role = ctx.user.role?.toUpperCase();
  if (role !== 'ADMIN') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Bu əməliyyat üçün admin icazəsi tələb olunur',
    });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(isAuthenticated);
export const moderatorProcedure = t.procedure.use(isModerator);
export const adminProcedure = t.procedure.use(isAdmin);
