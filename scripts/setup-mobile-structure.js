#!/usr/bin/env node

/**
 * Script to copy shared resources (components, store, lib, utils, constants) to mobile folder
 */

const fs = require('fs');
const path = require('path');

const SHARED_DIRS = ['components', 'store', 'lib', 'utils', 'constants', 'services', 'types'];
const ROOT_DIR = path.join(__dirname, '..');
const MOBILE_DIR = path.join(ROOT_DIR, 'mobile');

function copyDirectory(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`Source directory does not exist: ${src}`);
    return;
  }

  // Create destination directory
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      // Skip node_modules and other build directories
      if (entry.name === 'node_modules' || entry.name === '.expo' || entry.name === 'dist') {
        continue;
      }
      copyDirectory(srcPath, destPath);
    } else {
      // Copy file
      fs.copyFileSync(srcPath, destPath);
      console.log(`Copied: ${srcPath} -> ${destPath}`);
    }
  }
}

console.log('Setting up mobile folder structure...');

// Copy shared directories
SHARED_DIRS.forEach(dir => {
  const src = path.join(ROOT_DIR, dir);
  const dest = path.join(MOBILE_DIR, dir);
  
  if (fs.existsSync(src)) {
    console.log(`\nCopying ${dir}...`);
    copyDirectory(src, dest);
  } else {
    console.warn(`Directory not found: ${dir}`);
  }
});

// Copy assets
const assetsSrc = path.join(ROOT_DIR, 'assets');
const assetsDest = path.join(MOBILE_DIR, 'assets');
if (fs.existsSync(assetsSrc)) {
  console.log('\nCopying assets...');
  copyDirectory(assetsSrc, assetsDest);
}

console.log('\nMobile folder structure setup complete!');
