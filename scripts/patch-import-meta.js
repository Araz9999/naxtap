// // Script to patch import.meta issues in web builds
// const fs = require('fs');
// const path = require('path');

// // Find and patch files that use import.meta
// function patchFile(filePath) {
//   if (!fs.existsSync(filePath)) return;

//   let content = fs.readFileSync(filePath, 'utf8');

//   // Replace import.meta with a safe alternative
//   content = content.replace(/import\.meta/g, '({})');

//   fs.writeFileSync(filePath, content);
//   console.log(`Patched: ${filePath}`);
// }

// // Patch common files that might have import.meta
// const filesToPatch = [
//   'node_modules/expo-router/entry.js',
//   'node_modules/@expo/metro-runtime/src/import-meta.js'
// ];

// filesToPatch.forEach(patchFile);
