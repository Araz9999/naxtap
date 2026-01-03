import 'dotenv/config';
import { createServer } from 'http';
import { serve } from '@hono/node-server';
import app from './hono';
import { realtimeServer } from './realtime/server';
import { logger } from './utils/logger';

const port = parseInt(process.env.PORT || '3000', 10);

// Create HTTP server for both Hono and Socket.io
const httpServer = createServer((req, res) => {
  void (async () => {
    // Convert Node.js request to fetch Request
    const host = req.headers.host ?? 'localhost';
    const path = req.url ?? '/';
    const url = `http://${host}${path}`;

    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (!value) continue;
      if (Array.isArray(value)) value.forEach(v => headers.append(key, v));
      else headers.append(key, value);
    }

    // BodyInit in TS does not accept Node streams; buffer request body instead
    let body: Uint8Array | undefined;
    const method = (req.method ?? 'GET').toUpperCase();
    if (method !== 'GET' && method !== 'HEAD') {
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      body = Buffer.concat(chunks);
    }

    const fetchRequest = new Request(url, {
      method,
      headers,
      body,
    });

    const fetchResponse = await app.fetch(fetchRequest);
    res.statusCode = fetchResponse.status;

    fetchResponse.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    const responseBody = await fetchResponse.text();
    res.end(responseBody);
  })().catch((error) => {
    logger.error('[Server] Request handling error:', error);
    res.statusCode = 500;
    res.end('Internal Server Error');
  });
});

// Initialize Socket.io
if (process.env.ENABLE_WEBSOCKET !== 'false') {
  realtimeServer.initialize(httpServer);
  logger.info('[Server] WebSocket/Socket.io enabled');
} else {
  logger.info('[Server] WebSocket/Socket.io disabled - using polling mode');
}

// Start server
httpServer.listen(port, '0.0.0.0', () => {
  logger.info(`✅ Server running at http://0.0.0.0:${port}`);
  logger.info(`✅ tRPC API: http://0.0.0.0:${port}/api/trpc`);
  logger.info(`✅ REST API: http://0.0.0.0:${port}/api`);

  if (process.env.ENABLE_WEBSOCKET !== 'false') {
    logger.info(`✅ Socket.io: ws://0.0.0.0:${port}`);
  }
});
