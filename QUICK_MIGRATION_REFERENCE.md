# Quick Migration Reference

## Common Conversions

### Navigation

| Expo Router | React Navigation |
|-------------|-----------------|
| `import { useRouter } from 'expo-router'` | `import { useNavigation } from '@react-navigation/native'` |
| `const router = useRouter()` | `const navigation = useNavigation()` |
| `router.push('/path')` | `navigation.navigate('path')` |
| `router.replace('/path')` | `navigation.replace('path')` |
| `router.back()` | `navigation.goBack()` |
| `router.canGoBack()` | `navigation.canGoBack()` |

### Dynamic Routes

**Expo Router:**
```tsx
router.push(`/listing/${id}`)
```

**React Navigation:**
```tsx
navigation.navigate('listing/[id]', { id })
```

### Package Replacements

| Expo Package | React Native CLI Package |
|--------------|---------------------------|
| `expo-status-bar` | `react-native` (StatusBar) |
| `expo-image` | `react-native-fast-image` |
| `expo-camera` | `react-native-vision-camera` |
| `expo-notifications` | `@react-native-community/push-notification-ios` |
| `expo-av` | `react-native-video` |
| `expo-location` | `@react-native-community/geolocation` |
| `expo-image-picker` | `react-native-image-picker` |
| `expo-document-picker` | `react-native-document-picker` |
| `expo-sharing` | `react-native-share` |
| `expo-clipboard` | `@react-native-clipboard/clipboard` |
| `expo-haptics` | `react-native-haptic-feedback` |
| `expo-constants` | `react-native-device-info` |
| `expo-splash-screen` | `react-native-splash-screen` |
| `expo-font` | Remove (use system fonts) |

### StatusBar Example

**Before:**
```tsx
import { StatusBar } from 'expo-status-bar';

<StatusBar style="auto" />
```

**After:**
```tsx
import { StatusBar } from 'react-native';

<StatusBar barStyle="dark-content" backgroundColor="#fff" />
```

### Image Example

**Before:**
```tsx
import { Image } from 'expo-image';

<Image source={{ uri: '...' }} />
```

**After:**
```tsx
import FastImage from 'react-native-fast-image';

<FastImage source={{ uri: '...' }} />
```

### Camera Example

**Before:**
```tsx
import { CameraView } from 'expo-camera';
```

**After:**
```tsx
import { Camera } from 'react-native-vision-camera';
```

### File Structure Mapping

| Expo Location | React Native CLI Location |
|---------------|---------------------------|
| `app/_layout.tsx` | `mobile/App.tsx` |
| `app/(tabs)/index.tsx` | `mobile/src/screens/(tabs)/HomeScreen.tsx` |
| `app/listing/[id].tsx` | `mobile/src/screens/listing/[id].tsx` |
| `app/auth/login.tsx` | `mobile/src/screens/auth/login.tsx` |

### Import Path Updates

**Before:**
```tsx
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
```

**After:**
```tsx
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'react-native';
import FastImage from 'react-native-fast-image';
```

## Quick Checklist

- [ ] Run `node scripts/setup-mobile-structure.js`
- [ ] Run `node scripts/migrate-expo-to-rn-cli.js`
- [ ] Move `backend/` to `server/`
- [ ] Install dependencies: `cd mobile && npm install`
- [ ] Generate native projects (iOS/Android)
- [ ] Update all imports in migrated files
- [ ] Fix navigation calls
- [ ] Update native permissions
- [ ] Test on Android/iOS
