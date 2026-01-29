#!/usr/bin/env node

/**
 * Comprehensive script to fix ALL remaining Expo Router imports
 */

const fs = require('fs');
const path = require('path');

const SCREENS_DIR = path.join(__dirname, '../mobile/src/screens');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  let modified = false;

  // Fix: import { useRouter, Stack } from 'expo-router'
  if (content.includes("from 'expo-router'") || content.includes('from "expo-router"')) {
    // Remove Stack import
    content = content.replace(/,\s*Stack\s*/g, '');
    content = content.replace(/Stack\s*,\s*/g, '');
    
    // Replace useRouter import
    if (content.includes('useRouter')) {
      if (content.includes("import { useRouter }")) {
        content = content.replace(
          /import\s+{\s*useRouter[^}]*}\s+from\s+['"]expo-router['"]/g,
          "import { useNavigation } from '@react-navigation/native'"
        );
      } else if (content.includes("import { useRouter,")) {
        content = content.replace(
          /import\s+{\s*useRouter\s*,\s*([^}]+)\s*}\s+from\s+['"]expo-router['"]/g,
          (match, rest) => {
            const cleaned = rest.replace(/Stack\s*,?\s*/g, '').trim();
            if (cleaned && cleaned !== 'useLocalSearchParams') {
              return `import { ${cleaned} } from '@react-navigation/native'`;
            }
            return "import { useNavigation } from '@react-navigation/native'";
          }
        );
      }
      modified = true;
    }

    // Replace useLocalSearchParams import
    if (content.includes('useLocalSearchParams')) {
      if (!content.includes('useRoute')) {
        // Add useRoute to navigation import
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
      }
      
      // Remove useLocalSearchParams from expo-router import
      content = content.replace(/,\s*useLocalSearchParams\s*/g, '');
      content = content.replace(/useLocalSearchParams\s*,\s*/g, '');
      
      modified = true;
    }

    // Remove any remaining expo-router imports
    content = content.replace(/import\s+.*from\s+['"]expo-router['"];?\n?/g, '');
    modified = true;
  }

  // Fix: const router = useRouter()
  if (content.includes('const router = useRouter()')) {
    content = content.replace(
      /const\s+router\s*=\s*useRouter\(\)/g,
      'const navigation = useNavigation()'
    );
    modified = true;
  }

  // Fix: const { id } = useLocalSearchParams()
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

  // Fix: router.push() -> navigation.navigate()
  if (content.includes('router.push(')) {
    content = content.replace(
      /router\.push\((['"])([^'"]+)\1\)/g,
      (match, quote, route) => {
        // Convert expo-router format to react-navigation format
        const navRoute = route.replace(/\[(\w+)\]/g, (_, param) => `:${param}`);
        return `navigation.navigate(${quote}${navRoute}${quote})`;
      }
    );
    modified = true;
  }

  // Fix: router.replace() -> navigation.replace()
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

  // Fix: router.back() -> navigation.goBack()
  if (content.includes('router.back()')) {
    content = content.replace(/router\.back\(\)/g, 'navigation.goBack()');
    modified = true;
  }

  // Fix: router.canGoBack() -> navigation.canGoBack()
  if (content.includes('router.canGoBack()')) {
    content = content.replace(/router\.canGoBack\(\)/g, 'navigation.canGoBack()');
    modified = true;
  }

  // Fix: router.setParams() -> navigation.setParams()
  if (content.includes('router.setParams(')) {
    content = content.replace(/router\.setParams\(/g, 'navigation.setParams(');
    modified = true;
  }

  // Ensure navigation is available if router was used
  if (content.includes('navigation.') && !content.includes('const navigation =')) {
    // Check if useNavigation is imported
    if (!content.includes('useNavigation')) {
      // Add import
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
      
      // Add navigation initialization
      const componentMatch = content.match(/(export\s+default\s+function\s+\w+\([^)]*\)\s*\{)/);
      if (componentMatch) {
        content = content.replace(
          componentMatch[0],
          `${componentMatch[0]}\n  const navigation = useNavigation();`
        );
      }
    }
    modified = true;
  }

  if (modified && content !== originalContent) {
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

console.log('🔧 Fixing all remaining Expo Router imports...\n');
const fixedCount = processDirectory(SCREENS_DIR);
console.log(`\n✅ Fixed ${fixedCount} files!`);
