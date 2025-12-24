// Script to patch the web HTML to add type="module" to script tags
// This runs after Metro serves the HTML

const fs = require('fs');
const path = require('path');

// This will be called by a Metro middleware or we'll use it in a different way
// For now, let's create a Metro config that handles this

module.exports = function patchHTML(html) {
  // Add type="module" to all script tags that don't already have it
  return html.replace(
    /<script\s+src="([^"]+)"(?![^>]*type=)([^>]*)><\/script>/g,
    '<script type="module" src="$1"$2></script>'
  );
};

