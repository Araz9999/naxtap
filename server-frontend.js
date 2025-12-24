const express = require('express');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 8080;
const distPath = path.join(__dirname, 'dist');

// Security headers
app.use((req, res, next) => {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

// Serve static files from dist folder
app.use(express.static(distPath, {
    maxAge: '1d',
    etag: true,
    lastModified: true
}));

// SPA fallback - serve index.html for all routes
app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Frontend server running on port ${PORT}`);
    console.log(`📁 Serving files from: ${distPath}`);
});
