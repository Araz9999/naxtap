// // Script to fix import.meta issues in the browser
// const fs = require('fs');
// const path = require('path');

// // Create a runtime patch for import.meta
// const patchScript = `
// // Runtime patch for import.meta
// (function() {
//   if (typeof window !== 'undefined') {
//     // Override import.meta globally
//     Object.defineProperty(window, 'import', {
//       value: { meta: {} },
//       writable: false,
//       configurable: false
//     });

//     // Also define it on global
//     if (typeof global !== 'undefined') {
//       Object.defineProperty(global, 'import', {
//         value: { meta: {} },
//         writable: false,
//         configurable: false
//       });
//     }
//   }
// })();
// `;

// // Write the patch to a file
// fs.writeFileSync(path.join(__dirname, '..', 'web', 'import-meta-patch.js'), patchScript);
// console.log('Created import.meta patch script');
