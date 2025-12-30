import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { EgressClient } from 'livekit-server-sdk';

function getRequiredEnv(name: string): string {
  const v = process.env[name];
  if (!v || typeof v !== 'string' || v.trim().length === 0) {
    throw new Error(`Missing env var: ${name}`);
  }
  return v.trim();
}

function getLiveKitApiHost(): string {
  const host =
    process.env.LIVEKIT_API_HOST ||
    process.env.LIVEKIT_HOST ||
    process.env.LIVEKIT_URL ||
    '';

  if (!host) throw new Error('Missing LIVEKIT_API_HOST (or LIVEKIT_URL)');

  if (host.startsWith('wss://')) return `https://${host.slice('wss://'.length)}`;
  if (host.startsWith('ws://')) return `http://${host.slice('ws://'.length)}`;
  return host;
}

export const stopCallRecordingProcedure = publicProcedure
  .input(
    z.object({
      egressId: z.string().min(1),
    }),
  )
  .mutation(async ({ input }) => {
    const apiKey = getRequiredEnv('LIVEKIT_API_KEY');
    const apiSecret = getRequiredEnv('LIVEKIT_API_SECRET');
    const host = getLiveKitApiHost();

    const egress = new EgressClient(host, apiKey, apiSecret);
    const info = await egress.stopEgress(input.egressId);

    return {
      egressId: info.egressId,
      status: info.status,
    };
  });

