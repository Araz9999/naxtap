// Custom script to start Expo web with import.meta fix
const { spawn } = require('child_process');
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const METRO_PORT = 8081;
const PROXY_PORT = 3000;
const BACKEND_PORT = 3001; // Backend API runs on port 3001

  // Start Metro bundler (without opening browser)
  console.log('Starting Metro bundler...');
  const metro = spawn('npx', ['expo', 'start', '--web', '--port', METRO_PORT.toString(), '--clear', '--no-dev'], {
  stdio: 'inherit',
  shell: true,
      env: {
        ...process.env,
        BROWSER: 'none', // Prevent auto-opening browser
        EXPO_PUBLIC_RORK_API_BASE_URL: `http://localhost:${PROXY_PORT}`, // Use proxy port (proxy forwards to backend)
        EXPO_PUBLIC_BACKEND_URL: `http://localhost:${PROXY_PORT}`, // Use proxy port
      },
});

// Wait a bit for Metro to start, then start proxy
setTimeout(() => {
  console.log('Starting proxy server...');
  const app = express();

  // ✅ Single proxy middleware that routes based on path
  app.use(
    '/',
    createProxyMiddleware({
      // Dynamic target based on request path
      router: (req) => {
        if (req.url && req.url.startsWith('/api/')) {
          console.log(`[Proxy] Routing ${req.method} ${req.url} to backend (port ${BACKEND_PORT})`);
          return `http://localhost:${BACKEND_PORT}`;
        } else {
          return `http://localhost:${METRO_PORT}`;
        }
      },
      changeOrigin: true,
      ws: req => !(req.url || '').startsWith('/api/'), // WebSocket only for non-API requests
      onProxyReq: (proxyReq, req, res) => {
        if (req.url && req.url.startsWith('/api/')) {
          console.log(`[Proxy] Forwarding ${req.method} ${req.url} to backend`);
        }
      },
      onError: (err, req, res) => {
        if (req.url && req.url.startsWith('/api/')) {
          console.error(`[Proxy] Error forwarding ${req.url} to backend:`, err.message);
          res.status(500).json({ error: 'Backend connection failed', message: err.message });
        } else {
          console.error(`[Proxy] Error forwarding ${req.url} to frontend:`, err.message);
          res.status(500).send('Frontend connection failed');
        }
      },
      onProxyRes: (proxyRes, req, res) => {
        // Only intercept HTML page requests for the frontend
        if (req.url && req.url.startsWith('/api/')) {
          // Don't modify API responses
          return;
        }

        // Only intercept HTML page requests (root or HTML files)
        const isHTMLRequest =
          req.url === '/' ||
          req.url === '' ||
          req.url?.endsWith('.html') ||
          (req.headers.accept && req.headers.accept.includes('text/html') && !req.url?.includes('.'));

        // Don't intercept JS bundles, assets
        const isAsset =
          req.url?.includes('.bundle') ||
          req.url?.includes('.js') ||
          req.url?.includes('.css') ||
          req.url?.includes('.json') ||
          req.url?.includes('node_modules') ||
          req.url?.includes('/_expo/');

        if (isHTMLRequest && !isAsset && proxyRes.headers['content-type']?.includes('text/html')) {
          let body = '';
          proxyRes.on('data', (chunk) => {
            body += chunk.toString();
          });
          proxyRes.on('end', () => {
            // Add type="module" to ALL script tags that don't have it
            // Handle script tags with defer attribute
            body = body.replace(
              /<script\s+([^>]*)\s+src="([^"]+)"([^>]*)><\/script>/gi,
              (match, before, src, after) => {
                if (match.includes('type=')) return match; // Already has type
                // Preserve defer and other attributes
                const attrs = before ? before.trim() : '';
                const afterAttrs = after ? after.trim() : '';
                return `<script type="module" ${attrs} src="${src}" ${afterAttrs}></script>`;
              }
            );

            // Also handle simple script tags
            body = body.replace(
              /<script\s+src="([^"]+)"([^>]*)><\/script>/gi,
              (match, src, attrs) => {
                if (match.includes('type=')) return match;
                return `<script type="module" src="${src}"${attrs}></script>`;
              }
            );

            console.log(`✅ Patched HTML with type="module" for ${req.url}`);
            res.setHeader('content-type', 'text/html; charset=utf-8');
            res.setHeader('content-length', Buffer.byteLength(body));
            res.end(body);
          });
        } else {
          // Pass through everything else unchanged
          proxyRes.pipe(res);
        }
      },
    })
  );

  app.listen(PROXY_PORT, () => {
    console.log(`\n✅ Proxy server running on http://localhost:${PROXY_PORT}`);
    console.log(`   → API requests (/api/*) → Backend (port ${BACKEND_PORT})`);
    console.log(`   → Other requests → Frontend/Metro (port ${METRO_PORT})`);
    console.log(`📱 Open http://localhost:${PROXY_PORT} in your browser\n`);
  });
}, 5000);

// Cleanup on exit
process.on('SIGINT', () => {
  metro.kill();
  process.exit();
});

