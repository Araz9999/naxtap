#!/usr/bin/env node

/**
 * Fix remaining router. calls and useLocalSearchParams references
 */

const fs = require('fs');
const path = require('path');

const SCREENS_DIR = path.join(__dirname, '../mobile/src/screens');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Fix remaining useLocalSearchParams calls
  if (content.includes('useLocalSearchParams')) {
    // Pattern: const { id } = useLocalSearchParams<{ id: string }>();
    content = content.replace(
      /const\s+{\s*([^}]+)\s*}\s*=\s*useLocalSearchParams<[^>]+>\(\)/g,
      (match, destructured) => {
        return `const route = useRoute();\n  const { ${destructured} } = (route.params || {}) as any`;
      }
    );
    
    // Pattern: const { id } = useLocalSearchParams();
    content = content.replace(
      /const\s+{\s*([^}]+)\s*}\s*=\s*useLocalSearchParams\(\)/g,
      (match, destructured) => {
        return `const route = useRoute();\n  const { ${destructured} } = (route.params || {}) as any`;
      }
    );
    
    modified = true;
  }

  // Fix remaining router.push() calls
  if (content.includes('router.push(')) {
    // Pattern: router.push(`/path/${id}`)
    content = content.replace(
      /router\.push\(`([^`]+)`\)/g,
      (match, route) => {
        const navRoute = route
          .replace(/\[(\w+)\]/g, (_, param) => `:${param}`)
          .replace(/\$\{([^}]+)\}/g, (_, varName) => `{${varName}}`);
        return `navigation.navigate('${navRoute}')`;
      }
    );
    
    // Pattern: router.push('/path')
    content = content.replace(
      /router\.push\((['"])([^'"]+)\1\)/g,
      (match, quote, route) => {
        const navRoute = route.replace(/\[(\w+)\]/g, (_, param) => `:${param}`);
        return `navigation.navigate(${quote}${navRoute}${quote})`;
      }
    );
    
    modified = true;
  }

  // Fix remaining router.replace() calls
  if (content.includes('router.replace(')) {
    content = content.replace(
      /router\.replace\((['"])([^'"]+)\1\)/g,
      (match, quote, route) => {
        const navRoute = route.replace(/\[(\w+)\]/g, (_, param) => `:${param}`);
        return `navigation.replace(${quote}${navRoute}${quote})`;
      }
    );
    modified = true;
  }

  // Fix remaining router.back() calls
  if (content.includes('router.back()')) {
    content = content.replace(/router\.back\(\)/g, 'navigation.goBack()');
    modified = true;
  }

  // Ensure useRoute is imported if route is used
  if (content.includes('const route = useRoute()') && !content.includes("import { useRoute }")) {
    if (content.includes("import { useNavigation }")) {
      content = content.replace(
        /import\s+{\s*useNavigation\s*}\s+from\s+['"]@react-navigation\/native['"]/g,
        "import { useNavigation, useRoute } from '@react-navigation/native'"
      );
    } else {
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

  // Ensure navigation is available if router was used
  if (content.includes('navigation.') && !content.includes('const navigation =')) {
    if (!content.includes('useNavigation')) {
      if (content.includes("import { useRoute }")) {
        content = content.replace(
          /import\s+{\s*useRoute\s*}\s+from\s+['"]@react-navigation\/native['"]/g,
          "import { useNavigation, useRoute } from '@react-navigation/native'"
        );
      } else {
        const reactImport = content.match(/import\s+.*from\s+['"]react['"]/);
        if (reactImport) {
          content = content.replace(
            reactImport[0],
            `${reactImport[0]}\nimport { useNavigation } from '@react-navigation/native';`
          );
        }
      }
    }
    
    // Add navigation initialization if missing
    const componentMatch = content.match(/(export\s+default\s+function\s+\w+\([^)]*\)\s*\{)/);
    if (componentMatch && !content.includes('const navigation = useNavigation()')) {
      content = content.replace(
        componentMatch[0],
        `${componentMatch[0]}\n  const navigation = useNavigation();`
      );
    }
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed: ${filePath}`);
    return true;
  }
  
  return false;
}

function processDirectory(dir) {
  let fixedCount = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      fixedCount += processDirectory(fullPath);
    } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
      if (fixFile(fullPath)) {
        fixedCount++;
      }
    }
  }
  
  return fixedCount;
}

console.log('🔧 Fixing remaining router calls...\n');
const fixedCount = processDirectory(SCREENS_DIR);
console.log(`\n✅ Fixed ${fixedCount} files!`);
