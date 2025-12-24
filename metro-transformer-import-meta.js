// Metro transformer to replace import.meta in bundles
const upstreamTransformer = require('@expo/metro-config/babel-transformer');

module.exports.transform = async function ({ src, filename, options }) {
  // Replace import.meta with a polyfill before transformation
  if (src.includes('import.meta')) {
    // Replace import.meta.url
    src = src.replace(
      /import\.meta\.url/g,
      "(typeof window !== 'undefined' && window.import?.meta?.url) || (typeof globalThis !== 'undefined' && globalThis.import?.meta?.url) || ''"
    );
    // Replace import.meta.env
    src = src.replace(
      /import\.meta\.env/g,
      "(typeof window !== 'undefined' && window.import?.meta?.env) || (typeof globalThis !== 'undefined' && globalThis.import?.meta?.env) || {}"
    );
    // Replace import.meta (catch-all)
    src = src.replace(
      /import\.meta/g,
      "(typeof window !== 'undefined' && window.import?.meta) || (typeof globalThis !== 'undefined' && globalThis.import?.meta) || { url: '', env: {} }"
    );
  }
  
  return upstreamTransformer.transform({ src, filename, options });
};

