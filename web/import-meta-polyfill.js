// Polyfill for import.meta on web
// This fixes "Cannot use 'import.meta' outside a module" error

if (typeof window !== 'undefined') {
  // Create import.meta if it doesn't exist
  if (typeof import === 'undefined' || typeof import.meta === 'undefined') {
    // Polyfill import.meta
    if (typeof globalThis !== 'undefined') {
      if (!globalThis.import) {
        globalThis.import = {};
      }
      if (!globalThis.import.meta) {
        globalThis.import.meta = {
          url: typeof document !== 'undefined' && document.currentScript 
            ? document.currentScript.src 
            : window.location.href,
          env: {}
        };
      }
    }
    
    // Also define on window
    if (!window.import) {
      window.import = {};
    }
    if (!window.import.meta) {
      window.import.meta = {
        url: typeof document !== 'undefined' && document.currentScript 
          ? document.currentScript.src 
          : window.location.href,
        env: {}
      };
    }
  }
}

