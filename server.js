const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const PORT = 8081;

// Proxy to Metro bundler
app.use(
  '/',
  createProxyMiddleware({
    target: 'http://localhost:8081',
    changeOrigin: true,
    ws: true,
    onProxyRes: (proxyRes, req, res) => {
      // Intercept HTML responses
      if (proxyRes.headers['content-type']?.includes('text/html')) {
        let body = '';
        proxyRes.on('data', (chunk) => {
          body += chunk.toString();
        });
        proxyRes.on('end', () => {
          // Add type="module" to script tags
          body = body.replace(
            /<script\s+src="([^"]+)"(?![^>]*type=)([^>]*)><\/script>/g,
            '<script type="module" src="$1"$2></script>',
          );
          body = body.replace(
            /<script\s+([^>]*)\s+src="([^"]+)"(?![^>]*type=)([^>]*)><\/script>/g,
            '<script type="module" $1 src="$2"$3></script>',
          );
          res.setHeader('content-type', 'text/html');
          res.setHeader('content-length', Buffer.byteLength(body));
          res.end(body);
        });
      } else {
        // Pass through other responses
        proxyRes.pipe(res);
      }
    },
  }),
);

app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});
