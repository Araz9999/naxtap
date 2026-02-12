#!/usr/bin/env node
const { execSync } = require('child_process');
try {
  execSync('patch-package', { stdio: 'inherit' });
} catch (_) {
  // patch-package may fail (parse or apply); fallback script will fix document-picker
}
require('./patch-document-picker.js');
