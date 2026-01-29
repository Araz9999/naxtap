# Complete Migration Guide: Expo to React Native CLI

## Overview
This guide will help you migrate the Naxtap marketplace app from Expo to React Native CLI, separating the backend and mobile app into distinct folders.

## Prerequisites
- Node.js 18+
- React Native CLI: `npm install -g react-native-cli`
- Xcode (for iOS development on macOS)
- Android Studio (for Android development)

## Step 1: Run Migration Scripts

### 1.1 Copy Shared Resources
```bash
node scripts/setup-mobile-structure.js
```
This copies `components`, `store`, `lib`, `utils`, `constants`, `services`, `types`, and `assets` to the mobile folder.

### 1.2 Migrate Screens
```bash
node scripts/migrate-expo-to-rn-cli.js
```
This converts all screens from Expo Router format to React Navigation format.

## Step 2: Move Backend to Server Folder

```bash
# On Windows PowerShell
Move-Item -Path backend -Destination server

# On Linux/Mac
mv backend server
```

## Step 3: Initialize React Native Project

### 3.1 Generate Native Projects
```bash
cd mobile

# Initialize React Native project (if not already done)
npx react-native init Naxtap --template react-native-template-typescript --skip-install

# Or use the existing structure and just generate native folders
npx react-native init Naxtap --template react-native-template-typescript --skip-install --directory temp
# Then copy android/ and ios/ folders from temp/ to mobile/
```

### 3.2 Install Dependencies
```bash
cd mobile
npm install
```

### 3.3 Install iOS Pods (macOS only)
```bash
cd ios
pod install
cd ..
```

## Step 4: Update Native Configuration

### 4.1 iOS Configuration (`mobile/ios/Naxtap/Info.plist`)
Add required permissions:
```xml
<key>NSCameraUsageDescription</key>
<string>Allow $(PRODUCT_NAME) to access your camera</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>Allow $(PRODUCT_NAME) to access your photos</string>
<key>NSMicrophoneUsageDescription</key>
<string>Allow $(PRODUCT_NAME) to access your microphone</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>Allow $(PRODUCT_NAME) to access your location</string>
```

### 4.2 Android Configuration (`mobile/android/app/src/main/AndroidManifest.xml`)
Add required permissions:
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.INTERNET" />
```

## Step 5: Update Imports and Code

### 5.1 Common Import Replacements

| Expo | React Native CLI |
|------|------------------|
| `expo-router` → `@react-navigation/native` |
| `useRouter()` → `useNavigation()` |
| `router.push()` → `navigation.navigate()` |
| `router.replace()` → `navigation.replace()` |
| `expo-status-bar` → `react-native` (StatusBar) |
| `expo-image` → `react-native-fast-image` or keep `expo-image` |
| `expo-camera` → `react-native-vision-camera` |
| `expo-notifications` → `@react-native-community/push-notification-ios` |
| `expo-av` → `react-native-video` |
| `expo-location` → `@react-native-community/geolocation` |
| `expo-image-picker` → `react-native-image-picker` |
| `expo-document-picker` → `react-native-document-picker` |
| `expo-sharing` → `react-native-share` |
| `expo-clipboard` → `@react-native-clipboard/clipboard` |
| `expo-haptics` → `react-native-haptic-feedback` |
| `expo-constants` → `react-native-device-info` |
| `expo-splash-screen` → `react-native-splash-screen` |

### 5.2 Update Screen Components

All screens need to be updated to use React Navigation:

**Before (Expo Router):**
```tsx
import { useRouter } from 'expo-router';

export default function MyScreen() {
  const router = useRouter();
  
  const handlePress = () => {
    router.push('/listing/123');
  };
}
```

**After (React Navigation):**
```tsx
import { useNavigation } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/types';

export default function MyScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  
  const handlePress = () => {
    navigation.navigate('listing/[id]', { id: '123' });
  };
}
```

## Step 6: Update Root Package.json

Update the root `package.json` to be a workspace:

```json
{
  "name": "naxtap-workspace",
  "private": true,
  "workspaces": [
    "mobile",
    "server"
  ],
  "scripts": {
    "mobile:start": "cd mobile && npm start",
    "mobile:android": "cd mobile && npm run android",
    "mobile:ios": "cd mobile && npm run ios",
    "server:start": "cd server && npm run start",
    "server:build": "cd server && npm run build"
  }
}
```

## Step 7: Fix Remaining Issues

### 7.1 Update Path Aliases
Ensure `tsconfig.json` paths are correct:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### 7.2 Update Constants/Config
Update `constants/config.ts` to remove Expo-specific code:
- Remove `expo-constants` usage
- Use `react-native-device-info` for device info
- Update platform detection

### 7.3 Fix Native Modules
Some modules require native linking:
```bash
cd mobile
npx react-native link
```

## Step 8: Testing

### 8.1 Test on Android
```bash
cd mobile
npm run android
```

### 8.2 Test on iOS (macOS only)
```bash
cd mobile
npm run ios
```

## Step 9: Clean Up

Remove Expo-specific files:
- `app.json` (keep mobile/app.json)
- `eas.json`
- `expo-env.d.ts`
- `.expo/` directory
- `web/` directory (if not needed)

## Common Issues and Solutions

### Issue: Module not found
**Solution:** Ensure all dependencies are installed in `mobile/` folder

### Issue: Navigation not working
**Solution:** Check that all screens are properly registered in `RootNavigator.tsx`

### Issue: Native module errors
**Solution:** Run `npx react-native link` and rebuild native projects

### Issue: TypeScript errors
**Solution:** Update import paths and ensure types are correct

## Next Steps

1. Test all navigation flows
2. Test all features (camera, notifications, etc.)
3. Update CI/CD pipelines
4. Update documentation
5. Deploy to app stores

## Notes

- All features from Expo version are preserved
- Backend remains separate and independent
- Mobile app works standalone
- Can be deployed to iOS App Store and Google Play Store
