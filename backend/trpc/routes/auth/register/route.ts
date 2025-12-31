import { publicProcedure } from '../../../create-context';
import { createUser, findUserByEmail, setVerificationToken } from '../../../../db/userPrisma';
import { generateTokenPair } from '../../../../utils/jwt';
import { emailService } from '../../../../services/email';
import { userRegistrationSchema } from '../../../../utils/validation';
import { AuthenticationError, DatabaseError } from '../../../../utils/errors';
import { logger } from '../../../../utils/logger';
import { hashPassword, generateRandomToken } from '../../../../utils/password';
import { sendWelcomeMessage } from '../../../../services/welcomeMessage';
export const registerProcedure = publicProcedure
  .input(userRegistrationSchema)
  .mutation(async ({ input }) => {
    try {
      logger.auth('Registration attempt', { email: input.email });

      const existingUser = await findUserByEmail(input.email);
      if (existingUser) {
        throw new AuthenticationError(
          'Bu email artıq qeydiyyatdan keçib',
          'email_exists',
        );
      }

      // Password validation
      if (input.password.length < 8) {
        throw new Error('Şifrə ən azı 8 simvol olmalıdır');
      }
      if (!/[A-Z]/.test(input.password)) {
        throw new Error('Şifrə ən azı 1 böyük hərf olmalıdır');
      }
      if (!/[a-z]/.test(input.password)) {
        throw new Error('Şifrə ən azı 1 kiçik hərf olmalıdır');
      }
      if (!/[0-9]/.test(input.password)) {
        throw new Error('Şifrə ən azı 1 rəqəm olmalıdır');
      }

      const passwordHash = await hashPassword(input.password);

      const user = await createUser({
        email: input.email,
        name: input.name,
        phone: input.phone,
        passwordHash,
        verified: false,
        role: 'USER',
        balance: 0,
      });

      if (!user) {
        throw new DatabaseError('Failed to create user', undefined, 'createUser');
      }

      const verificationToken = generateRandomToken();
      const tokenSet = await setVerificationToken(user.id, verificationToken, 24);

      if (!tokenSet) {
        logger.warn('Failed to set verification token', { userId: user.id });
      }

      const frontendUrl = process.env.FRONTEND_URL ||
        process.env.EXPO_PUBLIC_FRONTEND_URL ||
        'https://1r36dhx42va8pxqbqz5ja.rork.app';
      const verificationUrl = `${frontendUrl}/auth/verify-email?token=${verificationToken}`;

      let emailSent = false;
      try {
        emailSent = await emailService.sendVerificationEmail(user.email, {
          name: user.name,
          verificationUrl,
        });
      } catch (emailError) {
        logger.error('Failed to send verification email', {
          userId: user.id,
          error: emailError,
        });
      }

      if (!emailSent) {
        logger.warn('[Auth] Failed to send verification email, but user was created');
      }

      const tokens = await generateTokenPair({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      logger.auth('User registered successfully', { userId: user.id });

      // 🎉 Send welcome message to new user
      try {
        await sendWelcomeMessage(user.id, 'az'); // Default to Azerbaijani
        logger.info('[Register] Welcome message sent to user:', { userId: user.id });
      } catch (welcomeError) {
        logger.error('[Register] Failed to send welcome message:', welcomeError);
        // Don't fail registration if welcome message fails
      }

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
        },
        tokens,
        emailSent,
      };
    } catch (error) {
      logger.error('Registration failed', { error });
      throw error;
    }
  });

