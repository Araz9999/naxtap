import 'dotenv/config';
import { createServer } from 'http';
import { serve } from '@hono/node-server';
import app from './hono';
import { realtimeServer } from './realtime/server';
import { logger } from './utils/logger';

const port = parseInt(process.env.PORT || '3000', 10);

// Create HTTP server for both Hono and Socket.io
const httpServer = createServer((req, res) => {
  // Convert Node.js request to fetch Request
  const url = `http://${req.headers.host}${req.url}`;
  const headers = new Headers();
  
  for (const [key, value] of Object.entries(req.headers)) {
    if (value) {
      if (Array.isArray(value)) {
        value.forEach(v => headers.append(key, v));
      } else {
        headers.append(key, value);
      }
    }
  }

  const fetchRequest = new Request(url, {
    method: req.method,
    headers,
    body: req.method !== 'GET' && req.method !== 'HEAD' ? req : undefined,
  });

  app.fetch(fetchRequest).then(async (fetchResponse) => {
    res.statusCode = fetchResponse.status;
    
    fetchResponse.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    const body = await fetchResponse.text();
    res.end(body);
  }).catch((error) => {
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
