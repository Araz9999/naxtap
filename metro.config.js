const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// This line helps prevent 'import.meta' errors on native
config.resolver.sourceExts.push('mjs');

// Use custom transformer to replace import.meta
config.transformer = {
  ...config.transformer,
  babelTransformerPath: path.resolve(__dirname, 'metro-transformer-import-meta.js'),
};

module.exports = config;
