// Lightweight ts-node runner for the backend without ESM loader hassles
const path = require('path');
const fs = require('fs');

// Register ts-node FIRST before any requires
const tsNode = require('ts-node');
tsNode.register({
  transpileOnly: true,
  files: true,
  project: path.join(__dirname, 'tsnode.json'),
  compilerOptions: {
    module: 'commonjs',
    moduleResolution: 'node',
    esModuleInterop: true,
    allowSyntheticDefaultImports: true
  }
});

// Custom require extension for .ts files
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function(id) {
  // If it's a relative path and doesn't have an extension, try .ts first
  if (id.startsWith('.') && !id.endsWith('.ts') && !id.endsWith('.js') && !id.endsWith('.json')) {
    const basePath = path.resolve(path.dirname(this.filename), id);
    if (fs.existsSync(basePath + '.ts')) {
      return originalRequire.call(this, id + '.ts');
    }
  }
  return originalRequire.apply(this, arguments);
};

require('dotenv').config();
require('./server.ts');
