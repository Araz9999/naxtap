# Migration Plan: Expo to React Native CLI

## Overview
This document outlines the migration from Expo to React Native CLI, separating backend and mobile app into distinct folders.

## New Structure
```
naxtap/
├── mobile/          # React Native CLI app
│   ├── src/
│   │   ├── screens/
│   │   ├── navigation/
│   │   ├── components/
│   │   ├── store/
│   │   ├── services/
│   │   ├── lib/
│   │   ├── utils/
│   │   └── constants/
│   ├── android/
│   ├── ios/
│   ├── index.js
│   ├── App.tsx
│   └── package.json
├── server/          # Backend (moved from backend/)
│   ├── src/
│   ├── dist/
│   └── package.json
└── package.json     # Root workspace config
```

## Migration Steps

### 1. Dependencies Replacement
- `expo-router` → `@react-navigation/native` + `@react-navigation/stack` + `@react-navigation/bottom-tabs`
- `expo-image` → `react-native-fast-image` or keep `expo-image` (if compatible)
- `expo-camera` → `react-native-vision-camera`
- `expo-notifications` → `@react-native-community/push-notification-ios` + `@react-native-firebase/messaging`
- `expo-av` → `react-native-video` + `@react-native-community/audio-toolkit`
- `expo-location` → `@react-native-community/geolocation`
- `expo-image-picker` → `react-native-image-picker`
- `expo-document-picker` → `react-native-document-picker`
- `expo-sharing` → `react-native-share`
- `expo-clipboard` → `@react-native-clipboard/clipboard`
- `expo-haptics` → `react-native-haptic-feedback`
- `expo-font` → Use system fonts or `react-native-vector-icons`
- `expo-status-bar` → `react-native` StatusBar
- `expo-constants` → `react-native-device-info`
- `expo-splash-screen` → `react-native-splash-screen`

### 2. Navigation Conversion
- Convert `expo-router` file-based routing to React Navigation
- Create navigation structure in `mobile/src/navigation/`
- Convert all `router.push()` to `navigation.navigate()`
- Convert all `router.replace()` to `navigation.replace()`

### 3. Entry Points
- Create `mobile/index.js` as entry point
- Create `mobile/App.tsx` as root component
- Set up native iOS and Android projects

### 4. File Structure Changes
- Move `app/` → `mobile/src/screens/`
- Keep `components/`, `store/`, `lib/`, `utils/`, `constants/` in `mobile/src/`
- Update all import paths

### 5. Native Configuration
- Generate iOS project: `npx react-native init` or use template
- Generate Android project
- Configure permissions in native files
- Set up native modules

## Notes
- All features must be preserved
- Backend remains separate and independent
- Mobile app should work standalone
