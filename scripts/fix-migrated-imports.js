#!/usr/bin/env node

/**
 * Script to fix imports in migrated screens
 * - Updates @/ paths to relative paths
 * - Fixes expo-router to react-navigation
 * - Fixes expo-image to react-native Image
 * - Fixes expo-status-bar to react-native StatusBar
 * - Fixes other Expo packages
 */

const fs = require('fs');
const path = require('path');

const SCREENS_DIR = path.join(__dirname, '../mobile/src/screens');

// Import path mappings
const IMPORT_FIXES = [
  // Expo Router to React Navigation
  {
    pattern: /import\s+{\s*useRouter\s*}\s+from\s+['"]expo-router['"]/g,
    replacement: "import { useNavigation } from '@react-navigation/native'",
  },
  {
    pattern: /const\s+router\s*=\s*useRouter\(\)/g,
    replacement: 'const navigation = useNavigation()',
  },
  {
    pattern: /router\.push\((['"])([^'"]+)\1\)/g,
    replacement: (match, quote, route) => {
      // Convert expo-router format to react-navigation format
      const navRoute = route.replace(/\[(\w+)\]/g, (_, param) => `:${param}`);
      return `navigation.navigate(${quote}${navRoute}${quote})`;
    },
  },
  {
    pattern: /router\.replace\((['"])([^'"]+)\1\)/g,
    replacement: (match, quote, route) => {
      const navRoute = route.replace(/\[(\w+)\]/g, (_, param) => `:${param}`);
      return `navigation.replace(${quote}${navRoute}${quote})`;
    },
  },
  {
    pattern: /router\.back\(\)/g,
    replacement: 'navigation.goBack()',
  },
  {
    pattern: /router\.canGoBack\(\)/g,
    replacement: 'navigation.canGoBack()',
  },
  
  // Expo Image to React Native Image
  {
    pattern: /import\s+{\s*Image\s*}\s+from\s+['"]expo-image['"]/g,
    replacement: "import { Image } from 'react-native'",
  },
  
  // Expo StatusBar to React Native StatusBar
  {
    pattern: /import\s+{\s*StatusBar\s*}\s+from\s+['"]expo-status-bar['"]/g,
    replacement: "import { StatusBar } from 'react-native'",
  },
  
  // Remove expo-font (use system fonts)
  {
    pattern: /import\s+.*from\s+['"]expo-font['"];?\n?/g,
    replacement: '',
  },
  {
    pattern: /useFonts\([^)]*\)/g,
    replacement: '// Fonts loaded via system',
  },
  
  // Remove expo-splash-screen (use react-native-splash-screen)
  {
    pattern: /import\s+.*from\s+['"]expo-splash-screen['"];?\n?/g,
    replacement: '',
  },
  {
    pattern: /SplashScreen\.(preventAutoHideAsync|hideAsync)\(\)/g,
    replacement: '// Splash screen handled in App.tsx',
  },
  
  // Fix @/ imports to relative paths
  {
    pattern: /from\s+['"]@\/([^'"]+)['"]/g,
    replacement: (match, importPath) => {
      // Calculate relative path from screens directory
      const currentFile = match.input ? path.dirname(match.input) : '';
      const targetPath = path.join(__dirname, '..', importPath);
      const relativePath = path.relative(currentFile || SCREENS_DIR, targetPath);
      const normalizedPath = relativePath.replace(/\\/g, '/');
      const finalPath = normalizedPath.startsWith('.') ? normalizedPath : `./${normalizedPath}`;
      return `from '${finalPath}'`;
    },
  },
];

function fixImportsInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  IMPORT_FIXES.forEach(({ pattern, replacement }) => {
    const newContent = typeof replacement === 'function'
      ? content.replace(pattern, replacement)
      : content.replace(pattern, replacement);
    
    if (newContent !== content) {
      content = newContent;
      modified = true;
    }
  });

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed imports: ${filePath}`);
  }
}

function processDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      processDirectory(fullPath);
    } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
      fixImportsInFile(fullPath);
    }
  }
}

console.log('Fixing imports in migrated screens...');
processDirectory(SCREENS_DIR);
console.log('Done!');
