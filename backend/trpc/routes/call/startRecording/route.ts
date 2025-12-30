import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import {
  EgressClient,
  EncodedFileOutput,
  EncodedFileType,
  S3Upload,
} from 'livekit-server-sdk';

function getRequiredEnv(name: string): string {
  const v = process.env[name];
  if (!v || typeof v !== 'string' || v.trim().length === 0) {
    throw new Error(`Missing env var: ${name}`);
  }
  return v.trim();
}

function getLiveKitApiHost(): string {
  // Prefer explicit API host for server-side calls (https://...)
  const host =
    process.env.LIVEKIT_API_HOST ||
    process.env.LIVEKIT_HOST ||
    process.env.LIVEKIT_URL ||
    '';

  if (!host) throw new Error('Missing LIVEKIT_API_HOST (or LIVEKIT_URL)');

  // Accept wss:// and ws:// and convert to https:// / http://
  if (host.startsWith('wss://')) return `https://${host.slice('wss://'.length)}`;
  if (host.startsWith('ws://')) return `http://${host.slice('ws://'.length)}`;
  return host;
}

export const startCallRecordingProcedure = publicProcedure
  .input(
    z.object({
      roomName: z.string().min(1),
      // Optional: used for generated filename
      callId: z.string().min(1).optional(),
    }),
  )
  .mutation(async ({ input }) => {
    const apiKey = getRequiredEnv('LIVEKIT_API_KEY');
    const apiSecret = getRequiredEnv('LIVEKIT_API_SECRET');
    const host = getLiveKitApiHost();

    // S3 upload target (required for egress in most setups)
    const bucket = getRequiredEnv('CALL_RECORDING_S3_BUCKET');
    const region = getRequiredEnv('CALL_RECORDING_S3_REGION');
    const accessKey = getRequiredEnv('CALL_RECORDING_S3_ACCESS_KEY');
    const secret = getRequiredEnv('CALL_RECORDING_S3_SECRET');

    const endpoint = (process.env.CALL_RECORDING_S3_ENDPOINT || '').trim();
    const forcePathStyle = (process.env.CALL_RECORDING_S3_FORCE_PATH_STYLE || 'false').trim().toLowerCase() === 'true';

    const s3 = new S3Upload({
      accessKey,
      secret,
      region,
      bucket,
      endpoint,
      forcePathStyle,
    });

    const file = new EncodedFileOutput({
      fileType: EncodedFileType.MP4,
      filepath: input.callId
        ? `calls/${input.callId}/{room_name}-{time}`
        : `calls/{room_name}-{time}`,
      output: { case: 's3', value: s3 },
    });

    const egress = new EgressClient(host, apiKey, apiSecret);
    const info = await egress.startRoomCompositeEgress(
      input.roomName,
      { file },
      {
        layout: 'grid',
      },
    );

    return {
      egressId: info.egressId,
      status: info.status,
    };
  });

