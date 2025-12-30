import { publicProcedure } from '../../../create-context';
import { findUserByEmail } from '../../../../db/userPrisma';
import { generateTokenPair } from '../../../../utils/jwt';
import { userLoginSchema } from '../../../../utils/validation';
import { AuthenticationError } from '../../../../utils/errors';
import { logger } from '../../../../utils/logger';
import { comparePassword } from '../../../../utils/hash';
export const loginProcedure = publicProcedure
  .input(userLoginSchema)
  .mutation(async ({ input }) => {
    try {
      logger.auth('Login attempt', { email: input.email });

      const user = await findUserByEmail(input.email);
      if (!user || !user.passwordHash) {
        // Use same error message to prevent email enumeration
        throw new AuthenticationError(
          'Email və ya şifrə yanlışdır',
          'invalid_credentials',
        );
      }

      const isValidPassword = await comparePassword(input.password, user.passwordHash);
      if (!isValidPassword) {
        logger.security('Failed login attempt', {
          email: input.email,
          reason: 'invalid_password',
        });
        throw new AuthenticationError(
          'Email və ya şifrə yanlışdır',
          'invalid_credentials',
        );
      }

      const tokens = await generateTokenPair({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      logger.auth('User logged in successfully', { userId: user.id });

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          phone: user.phone,
          verified: user.verified,
          role: user.role,
          balance: user.balance,
          moderatorPermissions: (user as any).moderatorPermissions || [],
        },
        tokens,
      };
    } catch (error) {
      logger.error('Login failed', { error });
      throw error;
    }
  });
