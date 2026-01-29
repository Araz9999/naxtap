#!/usr/bin/env node

/**
 * Script to fix route params usage in migrated screens
 * Converts useLocalSearchParams to useRoute from React Navigation
 */

const fs = require('fs');
const path = require('path');

const SCREENS_DIR = path.join(__dirname, '../mobile/src/screens');

function fixRouteParams(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Check if file uses route params
  if (!content.includes('useLocalSearchParams') && !content.includes('route.params')) {
    return; // Skip files that don't use params
  }

  // Add useRoute import if not present
  if (content.includes('useLocalSearchParams') && !content.includes("useRoute")) {
    // Find the import line and add useRoute
    if (content.includes("import { useNavigation }")) {
      content = content.replace(
        /import\s+{\s*useNavigation\s*}\s+from\s+['"]@react-navigation\/native['"]/g,
        "import { useNavigation, useRoute } from '@react-navigation/native'"
      );
    } else {
      // Add new import
      const reactImport = content.match(/import\s+.*from\s+['"]react['"]/);
      if (reactImport) {
        content = content.replace(
          reactImport[0],
          `${reactImport[0]}\nimport { useRoute } from '@react-navigation/native';`
        );
      }
    }
    modified = true;
  }

  // Replace useLocalSearchParams() with useRoute().params
  if (content.includes('useLocalSearchParams()')) {
    // Pattern 1: const params = useLocalSearchParams()
    content = content.replace(
      /const\s+params\s*=\s*useLocalSearchParams\(\)/g,
      "const route = useRoute();\n  const params = (route.params || {}) as any"
    );

    // Pattern 2: const { id, name } = useLocalSearchParams()
    content = content.replace(
      /const\s+{\s*([^}]+)\s*}\s*=\s*useLocalSearchParams\(\)/g,
      (match, destructured) => {
        return `const route = useRoute();\n  const { ${destructured} } = (route.params || {}) as any`;
      }
    );

    modified = true;
  }

  // Fix direct param access (e.g., params.id)
  // This is already handled by the above replacements

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed route params: ${filePath}`);
  }
}

function processDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      processDirectory(fullPath);
    } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
      fixRouteParams(fullPath);
    }
  }
}

console.log('Fixing route params usage...');
processDirectory(SCREENS_DIR);
console.log('Done!');
