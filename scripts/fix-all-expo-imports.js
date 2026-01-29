#!/usr/bin/env node

/**
 * Comprehensive script to fix all Expo imports in migrated screens
 */

const fs = require('fs');
const path = require('path');

const SCREENS_DIR = path.join(__dirname, '../mobile/src/screens');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Remove Stack from expo-router (not needed in React Navigation)
  if (content.includes("import { Stack } from 'expo-router'")) {
    content = content.replace(/import\s+{\s*Stack\s*}\s+from\s+['"]expo-router['"];?\n?/g, '');
    modified = true;
  }
  if (content.includes('import { Stack, ')) {
    content = content.replace(/,\s*Stack\s*/g, '');
    content = content.replace(/Stack\s*,\s*/g, '');
    modified = true;
  }

  // Replace useLocalSearchParams with useRoute from react-navigation
  if (content.includes('useLocalSearchParams')) {
    content = content.replace(
      /import\s+{\s*useLocalSearchParams[^}]*}\s+from\s+['"]expo-router['"]/g,
      "import { useRoute } from '@react-navigation/native'"
    );
    content = content.replace(
      /const\s+params\s*=\s*useLocalSearchParams\(\)/g,
      "const route = useRoute(); const params = route.params as any"
    );
    content = content.replace(
      /const\s+{\s*([^}]+)\s*}\s*=\s*useLocalSearchParams\(\)/g,
      (match, params) => {
        return `const route = useRoute(); const { ${params} } = (route.params || {}) as any`;
      }
    );
    modified = true;
  }

  // Replace Link with TouchableOpacity + navigation
  if (content.includes("import { Link } from 'expo-router'")) {
    content = content.replace(
      /import\s+{\s*Link[^}]*}\s+from\s+['"]expo-router['"]/g,
      "import { TouchableOpacity } from 'react-native'"
    );
    // Replace <Link href="..."> with TouchableOpacity (manual fix needed for complex cases)
    content = content.replace(
      /<Link\s+href={([^}]+)}>/g,
      '<TouchableOpacity onPress={() => navigation.navigate($1)}>'
    );
    content = content.replace(/<\/Link>/g, '</TouchableOpacity>');
    modified = true;
  }

  // Fix expo-file-system
  if (content.includes('expo-file-system')) {
    content = content.replace(
      /import\s+\*\s+as\s+FileSystem\s+from\s+['"]expo-file-system['"]/g,
      "import RNFS from 'react-native-fs'"
    );
    content = content.replace(/FileSystem\./g, 'RNFS.');
    modified = true;
  }

  // Fix expo-mail-composer
  if (content.includes('expo-mail-composer')) {
    content = content.replace(
      /import\s+\*\s+as\s+MailComposer\s+from\s+['"]expo-mail-composer['"]/g,
      "import { Linking } from 'react-native'"
    );
    // Replace MailComposer.composeAsync with Linking.openURL('mailto:...')
    content = content.replace(
      /MailComposer\.composeAsync\([^)]+\)/g,
      "Linking.openURL('mailto:')"
    );
    modified = true;
  }

  // Fix expo-linking
  if (content.includes('expo-linking')) {
    content = content.replace(
      /import\s+\*\s+as\s+Linking\s+from\s+['"]expo-linking['"]/g,
      "import { Linking } from 'react-native'"
    );
    modified = true;
  }

  // Fix expo-image-picker (if still present)
  if (content.includes('expo-image-picker')) {
    content = content.replace(
      /import\s+\*\s+as\s+ImagePicker\s+from\s+['"]expo-image-picker['"]/g,
      "import { launchImageLibrary, launchCamera, MediaType, ImagePickerResponse } from 'react-native-image-picker'"
    );
    // Update ImagePicker method calls
    content = content.replace(
      /ImagePicker\.launchImageLibraryAsync\(/g,
      'launchImageLibrary({'
    );
    content = content.replace(
      /ImagePicker\.launchCameraAsync\(/g,
      'launchCamera({'
    );
    content = content.replace(
      /ImagePicker\.requestMediaLibraryPermissionsAsync\(/g,
      '// Request permissions - handled by react-native-image-picker'
    );
    content = content.replace(
      /ImagePicker\.requestCameraPermissionsAsync\(/g,
      '// Request permissions - handled by react-native-image-picker'
    );
    content = content.replace(
      /ImagePicker\.MediaTypeOptions\.Images/g,
      "'photo'"
    );
    modified = true;
  }

  // Fix expo-av (video/audio)
  if (content.includes('expo-av')) {
    content = content.replace(
      /import\s+{\s*Video[^}]*}\s+from\s+['"]expo-av['"]/g,
      "import Video from 'react-native-video'"
    );
    content = content.replace(
      /import\s+{\s*Audio[^}]*}\s+from\s+['"]expo-av['"]/g,
      "import Sound from 'react-native-sound'"
    );
    modified = true;
  }

  // Fix expo-camera
  if (content.includes('expo-camera')) {
    content = content.replace(
      /import\s+{\s*CameraView[^}]*}\s+from\s+['"]expo-camera['"]/g,
      "import { Camera } from 'react-native-vision-camera'"
    );
    modified = true;
  }

  // Fix expo-notifications
  if (content.includes('expo-notifications')) {
    content = content.replace(
      /import\s+\*\s+as\s+Notifications\s+from\s+['"]expo-notifications['"]/g,
      "import PushNotification from 'react-native-push-notification'"
    );
    modified = true;
  }

  // Fix expo-location
  if (content.includes('expo-location')) {
    content = content.replace(
      /import\s+\*\s+as\s+Location\s+from\s+['"]expo-location['"]/g,
      "import Geolocation from '@react-native-community/geolocation'"
    );
    modified = true;
  }

  // Fix expo-sharing
  if (content.includes('expo-sharing')) {
    content = content.replace(
      /import\s+\*\s+as\s+Sharing\s+from\s+['"]expo-sharing['"]/g,
      "import Share from 'react-native-share'"
    );
    content = content.replace(/Sharing\.shareAsync\(/g, 'Share.open({');
    modified = true;
  }

  // Fix expo-clipboard
  if (content.includes('expo-clipboard')) {
    content = content.replace(
      /import\s+\*\s+as\s+Clipboard\s+from\s+['"]expo-clipboard['"]/g,
      "import Clipboard from '@react-native-clipboard/clipboard'"
    );
    content = content.replace(/Clipboard\.setStringAsync\(/g, 'Clipboard.setString(');
    content = content.replace(/Clipboard\.getStringAsync\(/g, 'Clipboard.getString(');
    modified = true;
  }

  // Fix expo-haptics
  if (content.includes('expo-haptics')) {
    content = content.replace(
      /import\s+\*\s+as\s+Haptics\s+from\s+['"]expo-haptics['"]/g,
      "import ReactNativeHapticFeedback from 'react-native-haptic-feedback'"
    );
    content = content.replace(
      /Haptics\.(impactAsync|notificationAsync|selectionAsync)\(/g,
      'ReactNativeHapticFeedback.trigger('
    );
    modified = true;
  }

  // Fix expo-constants
  if (content.includes('expo-constants')) {
    content = content.replace(
      /import\s+Constants\s+from\s+['"]expo-constants['"]/g,
      "import DeviceInfo from 'react-native-device-info'"
    );
    content = content.replace(/Constants\./g, 'DeviceInfo.');
    modified = true;
  }

  // Fix expo-device
  if (content.includes('expo-device')) {
    content = content.replace(
      /import\s+\*\s+as\s+Device\s+from\s+['"]expo-device['"]/g,
      "import DeviceInfo from 'react-native-device-info'"
    );
    modified = true;
  }

  // Fix expo-document-picker
  if (content.includes('expo-document-picker')) {
    content = content.replace(
      /import\s+\*\s+as\s+DocumentPicker\s+from\s+['"]expo-document-picker['"]/g,
      "import DocumentPicker from 'react-native-document-picker'"
    );
    content = content.replace(/DocumentPicker\.getDocumentAsync\(/g, 'DocumentPicker.pick(');
    modified = true;
  }

  // Fix expo-web-browser
  if (content.includes('expo-web-browser')) {
    content = content.replace(
      /import\s+\*\s+as\s+WebBrowser\s+from\s+['"]expo-web-browser['"]/g,
      "import { Linking } from 'react-native'"
    );
    content = content.replace(/WebBrowser\.openBrowserAsync\(/g, 'Linking.openURL(');
    modified = true;
  }

  // Fix expo-linear-gradient
  if (content.includes('expo-linear-gradient')) {
    content = content.replace(
      /import\s+{\s*LinearGradient[^}]*}\s+from\s+['"]expo-linear-gradient['"]/g,
      "import LinearGradient from 'react-native-linear-gradient'"
    );
    modified = true;
  }

  // Fix expo-blur
  if (content.includes('expo-blur')) {
    content = content.replace(
      /import\s+{\s*BlurView[^}]*}\s+from\s+['"]expo-blur['"]/g,
      "import { BlurView } from '@react-native-community/blur'"
    );
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed: ${filePath}`);
  }
}

function processDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      processDirectory(fullPath);
    } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
      fixFile(fullPath);
    }
  }
}

console.log('Fixing all Expo imports...');
processDirectory(SCREENS_DIR);
console.log('Done!');
