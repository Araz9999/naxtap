import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { AccessToken } from 'livekit-server-sdk';

function getRequiredEnv(name: string): string {
  const v = process.env[name];
  if (!v || typeof v !== 'string' || v.trim().length === 0) {
    throw new Error(`Missing env var: ${name}`);
  }
  return v.trim();
}

export const getCallTokenProcedure = publicProcedure
  .input(
    z.object({
      callId: z.string().min(1),
      userId: z.string().min(1),
      // optional display name, for nicer participant labels
      name: z.string().min(1).optional(),
      // voice|video (controls publish defaults on client, but stored here for sanity)
      type: z.enum(['voice', 'video']).optional(),
    }),
  )
  .mutation(async ({ input }) => {
    const apiKey = getRequiredEnv('LIVEKIT_API_KEY');
    const apiSecret = getRequiredEnv('LIVEKIT_API_SECRET');
    const serverUrl = getRequiredEnv('LIVEKIT_URL'); // e.g. wss://<domain>.livekit.cloud

    // Keep room naming deterministic for 1:1 calls
    const roomName = `call_${input.callId}`;
    const identity = input.userId;

    const token = new AccessToken(apiKey, apiSecret, {
      identity,
      name: input.name,
    });

    token.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const jwt = await token.toJwt();

    return {
      serverUrl,
      roomName,
      token: jwt,
    };
  });

