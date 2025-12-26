import 'dotenv/config';
import { serve } from '@hono/node-server';
import app from './hono';

const port = parseInt(process.env.PORT || '3000', 10);

serve({ fetch: app.fetch, port, hostname: '0.0.0.0' }, (info) => {
  console.log(`✅ TS API running at http://${info.address}:${info.port}`);
});
