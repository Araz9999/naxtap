// Post-export fix: ensure the exported web entry script runs as an ES module
// This avoids "Cannot use 'import.meta' outside a module" in some browsers.

const fs = require('fs');
const path = require('path');

(function main() {
  try {
    const distHtml = path.join(__dirname, '..', 'dist', 'index.html');
    if (!fs.existsSync(distHtml)) {
      console.warn('[fix-web-index-module] dist/index.html not found, skipping');
      return;
    }
    let html = fs.readFileSync(distHtml, 'utf8');

    // Add type="module" to the main _expo entry script if missing
    const scriptTagRegex = /<script\s+src="\/_expo\/static\/js\/web\/[^"]+"(?![^>]*type=)[^>]*><\/script>/;
    if (scriptTagRegex.test(html)) {
      html = html.replace(
        scriptTagRegex,
        (m) => m.replace('<script ', '<script type="module" '),
      );
      fs.writeFileSync(distHtml, html);
      console.log('[fix-web-index-module] Patched dist/index.html with type="module"');
    } else {
      console.log('[fix-web-index-module] No matching _expo script tag found or already patched.');
    }
  } catch (err) {
    console.error('[fix-web-index-module] Failed to patch dist/index.html:', err);
    process.exitCode = 1;
  }
})();
