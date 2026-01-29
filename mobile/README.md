# Naxtap Mobile App

React Native CLI version of the Naxtap marketplace mobile application.

## Prerequisites

- Node.js 18+
- React Native CLI
- Xcode (for iOS development on macOS)
- Android Studio (for Android development)

## Installation

```bash
npm install
```

### iOS (macOS only)

```bash
cd ios
pod install
cd ..
```

## Running the App

### Android

```bash
npm run android
```

### iOS (macOS only)

```bash
npm run ios
```

### Start Metro Bundler

```bash
npm start
```

## Project Structure

```
mobile/
├── src/
│   ├── navigation/      # React Navigation setup
│   │   ├── RootNavigator.tsx
│   │   ├── TabNavigator.tsx
│   │   └── types.ts
│   └── screens/          # All screen components
│       ├── (tabs)/       # Tab screens
│       ├── auth/         # Authentication screens
│       ├── listing/      # Listing screens
│       ├── store/        # Store screens
│       └── ...
├── components/           # Reusable components
├── store/                # Zustand stores
├── lib/                  # Libraries (tRPC, realtime, etc.)
├── utils/                # Utility functions
├── constants/            # Constants and config
├── services/             # Service modules
├── types/                # TypeScript types
├── assets/               # Images, fonts, etc.
├── android/              # Android native code
├── ios/                  # iOS native code
├── App.tsx               # Root component
├── index.js              # Entry point
└── package.json
```

## Navigation

The app uses React Navigation with:
- Stack Navigator for main navigation
- Bottom Tab Navigator for main tabs
- All routes are typed in `src/navigation/types.ts`

## Environment Variables

Create a `.env` file in the root:

```env
API_BASE_URL=https://naxtap.az/api
BACKEND_URL=https://naxtap.az
```

## Building for Production

### Android

```bash
cd android
./gradlew assembleRelease
```

### iOS

```bash
cd ios
xcodebuild -workspace Naxtap.xcworkspace -scheme Naxtap -configuration Release
```

## Troubleshooting

### Metro bundler issues
```bash
npm start -- --reset-cache
```

### Android build issues
```bash
cd android
./gradlew clean
cd ..
npm run android
```

### iOS build issues
```bash
cd ios
pod deintegrate
pod install
cd ..
npm run ios
```

## Development

See the main [MIGRATION_GUIDE.md](../MIGRATION_GUIDE.md) for detailed migration information.
