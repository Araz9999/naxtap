#!/usr/bin/env node

/**
 * Migration script to convert Expo Router screens to React Navigation screens
 * 
 * This script:
 * 1. Converts expo-router imports to React Navigation
 * 2. Updates useRouter() to useNavigation()
 * 3. Updates router.push/replace to navigation.navigate/replace
 * 4. Moves files from app/ to mobile/src/screens/
 */

const fs = require('fs');
const path = require('path');

const APP_DIR = path.join(__dirname, '../app');
const MOBILE_SCREENS_DIR = path.join(__dirname, '../mobile/src/screens');

// Mapping of expo-router to react-navigation
const ROUTER_REPLACEMENTS = [
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
      const navRoute = route.replace(/\//g, '/').replace(/\[(\w+)\]/g, (_, param) => `:${param}`);
      return `navigation.navigate(${quote}${navRoute}${quote})`;
    },
  },
  {
    pattern: /router\.replace\((['"])([^'"]+)\1\)/g,
    replacement: (match, quote, route) => {
      const navRoute = route.replace(/\//g, '/').replace(/\[(\w+)\]/g, (_, param) => `:${param}`);
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
];

// Expo-specific imports to replace
const EXPO_IMPORTS = {
  'expo-status-bar': 'react-native',
  'expo-font': null, // Remove, use system fonts
  'expo-splash-screen': 'react-native-splash-screen',
  'expo-image': 'react-native-fast-image', // or keep expo-image if compatible
  'expo-camera': 'react-native-vision-camera',
  'expo-notifications': '@react-native-community/push-notification-ios',
  'expo-av': 'react-native-video',
  'expo-location': '@react-native-community/geolocation',
  'expo-image-picker': 'react-native-image-picker',
  'expo-document-picker': 'react-native-document-picker',
  'expo-sharing': 'react-native-share',
  'expo-clipboard': '@react-native-clipboard/clipboard',
  'expo-haptics': 'react-native-haptic-feedback',
  'expo-constants': 'react-native-device-info',
};

function convertFile(content, filePath) {
  let converted = content;

  // Apply router replacements
  ROUTER_REPLACEMENTS.forEach(({ pattern, replacement }) => {
    if (typeof replacement === 'function') {
      converted = converted.replace(pattern, replacement);
    } else {
      converted = converted.replace(pattern, replacement);
    }
  });

  // Replace Expo imports
  Object.entries(EXPO_IMPORTS).forEach(([expoImport, rnImport]) => {
    if (rnImport === null) {
      // Remove import
      const importPattern = new RegExp(`import\\s+.*from\\s+['"]${expoImport.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"];?\\n?`, 'g');
      converted = converted.replace(importPattern, '');
    } else {
      // Replace import
      const importPattern = new RegExp(`(['"])${expoImport.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\1`, 'g');
      converted = converted.replace(importPattern, `$1${rnImport}$1`);
    }
  });

  // Replace StatusBar import
  converted = converted.replace(
    /import\s+{\s*StatusBar\s*}\s+from\s+['"]expo-status-bar['"]/g,
    "import { StatusBar } from 'react-native'"
  );

  return converted;
}

function migrateFile(srcPath, destPath) {
  const content = fs.readFileSync(srcPath, 'utf8');
  const converted = convertFile(content, srcPath);
  
  // Ensure destination directory exists
  const destDir = path.dirname(destPath);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  
  fs.writeFileSync(destPath, converted, 'utf8');
  console.log(`Migrated: ${srcPath} -> ${destPath}`);
}

function migrateDirectory(srcDir, destDir, relativePath = '') {
  if (!fs.existsSync(srcDir)) {
    console.warn(`Source directory does not exist: ${srcDir}`);
    return;
  }

  const entries = fs.readdirSync(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const relativeFilePath = path.join(relativePath, entry.name);
    
    if (entry.isDirectory()) {
      // Skip certain directories
      if (entry.name === 'node_modules' || entry.name === '.expo') {
        continue;
      }
      migrateDirectory(srcPath, destDir, relativeFilePath);
    } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
      // Convert file path: app/(tabs)/index.tsx -> mobile/src/screens/(tabs)/HomeScreen.tsx
      let destFileName = entry.name;
      
      // Handle special cases
      if (relativePath.includes('(tabs)')) {
        if (entry.name === 'index.tsx') {
          destFileName = 'HomeScreen.tsx';
        } else {
          destFileName = entry.name.charAt(0).toUpperCase() + entry.name.slice(1).replace('.tsx', 'Screen.tsx');
        }
      } else if (entry.name.startsWith('[') && entry.name.includes(']')) {
        // Dynamic routes: [id].tsx -> [id].tsx (keep as is)
        destFileName = entry.name;
      }
      
      const destPath = path.join(destDir, relativePath, destFileName);
      migrateFile(srcPath, destPath);
    }
  }
}

// Main execution
console.log('Starting migration from Expo Router to React Navigation...');
console.log(`Source: ${APP_DIR}`);
console.log(`Destination: ${MOBILE_SCREENS_DIR}`);

if (!fs.existsSync(APP_DIR)) {
  console.error(`Error: Source directory does not exist: ${APP_DIR}`);
  process.exit(1);
}

// Create destination directory
if (!fs.existsSync(MOBILE_SCREENS_DIR)) {
  fs.mkdirSync(MOBILE_SCREENS_DIR, { recursive: true });
}

migrateDirectory(APP_DIR, MOBILE_SCREENS_DIR);

console.log('\nMigration complete!');
console.log('\nNext steps:');
console.log('1. Review migrated files in mobile/src/screens/');
console.log('2. Update navigation params in mobile/src/navigation/types.ts');
console.log('3. Fix any remaining import issues');
console.log('4. Test navigation flow');
