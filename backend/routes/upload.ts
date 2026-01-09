// @ts-ignore - TypeScript module resolution issue with Hono
import { Hono } from 'hono';
import { logger } from '../utils/logger';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const uploadRoutes = new Hono();

// Ensure uploads directory exists
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

uploadRoutes.post('/', async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body['files'];

    if (!file) {
      return c.json({ error: 'No file uploaded' }, 400);
    }

    const filesToUpload = Array.isArray(file) ? file : [file];
    const uploadedUrls: string[] = [];
    
    // Get base URL from request or env
    const host = c.req.header('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;

    for (const f of filesToUpload) {
      if (f instanceof File) {
        const randomId = crypto.randomUUID();
        // Sanitize filename
        const safeName = (f.name || 'file').replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileName = `${Date.now()}-${randomId}-${safeName}`;
        const filePath = path.join(UPLOAD_DIR, fileName);
        
        const arrayBuffer = await f.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        fs.writeFileSync(filePath, buffer);
        
        uploadedUrls.push(`${baseUrl}/uploads/${fileName}`);
      }
    }

    return c.json({ urls: uploadedUrls });
  } catch (error) {
    logger.error('Upload error:', error);
    return c.json({ error: 'Upload failed' }, 500);
  }
});

export default uploadRoutes;
