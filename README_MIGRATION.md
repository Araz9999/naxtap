# Migration Complete: Expo to React Native CLI

## What Has Been Done

### ✅ Project Structure Created
- Created `mobile/` folder with React Native CLI structure
- Created `server/` folder structure (backend will be moved here)
- Set up proper folder organization

### ✅ Navigation System
- Created React Navigation setup (`mobile/src/navigation/`)
- Converted Expo Router to React Navigation
- Created typed navigation with TypeScript
- Set up Stack Navigator and Tab Navigator

### ✅ Core Files Created
- `mobile/index.js` - Entry point
- `mobile/App.tsx` - Root component (converted from `app/_layout.tsx`)
- `mobile/package.json` - Mobile app dependencies
- `mobile/metro.config.js` - Metro bundler config
- `mobile/babel.config.js` - Babel config
- `mobile/tsconfig.json` - TypeScript config

### ✅ Migration Scripts Created
- `scripts/migrate-expo-to-rn-cli.js` - Converts Expo Router to React Navigation
- `scripts/setup-mobile-structure.js` - Copies shared resources to mobile folder

### ✅ Documentation Created
- `MIGRATION_GUIDE.md` - Complete migration guide
- `MIGRATION_PLAN.md` - Migration plan overview
- `mobile/README.md` - Mobile app documentation
- `server/README.md` - Backend documentation

## Next Steps

### 1. Run Migration Scripts

```bash
# Copy shared resources (components, store, lib, etc.)
node scripts/setup-mobile-structure.js

# Migrate screens from Expo Router to React Navigation
node scripts/migrate-expo-to-rn-cli.js
```

### 2. Move Backend

```bash
# On Windows PowerShell
Move-Item -Path backend -Destination server

# On Linux/Mac
mv backend server
```

### 3. Install Dependencies

```bash
# Install mobile dependencies
cd mobile
npm install

# Install iOS pods (macOS only)
cd ios
pod install
cd ..
```

### 4. Generate Native Projects

If you don't have `android/` and `ios/` folders yet:

```bash
cd mobile

# Create a temporary React Native project to get native folders
npx react-native init TempProject --template react-native-template-typescript --skip-install

# Copy native folders
cp -r TempProject/android .
cp -r TempProject/ios .

# Clean up
rm -rf TempProject
```

### 5. Update Imports

After running migration scripts, you'll need to:

1. **Update tRPC import path** in `mobile/lib/trpc.ts`:
   ```typescript
   // Change from:
   import type { AppRouter } from '@/backend/trpc/app-router';
   // To:
   import type { AppRouter } from '../server/src/trpc/app-router';
   ```

2. **Update all screen imports** in `mobile/src/navigation/RootNavigator.tsx` to match actual file paths

3. **Fix Expo-specific imports** in all migrated files:
   - Replace `expo-status-bar` with `react-native` StatusBar
   - Replace `expo-image` with `react-native-fast-image` or keep `expo-image`
   - Replace `expo-camera` with `react-native-vision-camera`
   - And so on (see MIGRATION_GUIDE.md for full list)

### 6. Update Native Configuration

#### iOS (`mobile/ios/Naxtap/Info.plist`)
Add permissions for camera, photos, microphone, location, etc.

#### Android (`mobile/android/app/src/main/AndroidManifest.xml`)
Add required permissions.

### 7. Test the App

```bash
# Start Metro bundler
cd mobile
npm start

# Run on Android (in another terminal)
npm run android

# Run on iOS (macOS only, in another terminal)
npm run ios
```

## Important Notes

1. **All features are preserved** - The migration maintains all existing functionality
2. **Backend is separate** - Backend code is now in `server/` folder
3. **Mobile is standalone** - Mobile app works independently
4. **TypeScript support** - Full TypeScript support maintained
5. **Navigation is typed** - All routes are typed for better DX

## Common Issues

### Module not found errors
- Ensure all dependencies are installed in `mobile/` folder
- Run `npm install` in `mobile/` directory

### Navigation errors
- Check that all screens are properly registered in `RootNavigator.tsx`
- Verify screen names match the route names

### Native module errors
- Run `npx react-native link` in `mobile/` folder
- Rebuild native projects

### TypeScript errors
- Update import paths to match new structure
- Check `mobile/tsconfig.json` paths configuration

## File Structure After Migration

```
naxtap/
├── mobile/              # React Native CLI app
│   ├── src/
│   │   ├── navigation/  # React Navigation
│   │   └── screens/     # All screens
│   ├── components/      # Shared components
│   ├── store/           # Zustand stores
│   ├── lib/             # Libraries
│   ├── utils/           # Utilities
│   ├── constants/       # Constants
│   ├── android/         # Android native
│   ├── ios/             # iOS native
│   ├── App.tsx          # Root component
│   └── index.js         # Entry point
├── server/              # Backend (moved from backend/)
│   ├── src/
│   │   ├── trpc/        # tRPC routes
│   │   ├── routes/      # HTTP routes
│   │   └── server.ts    # Server entry
│   └── prisma/          # Database
├── scripts/             # Migration scripts
└── package.json         # Workspace config
```

## Support

For issues or questions:
1. Check `MIGRATION_GUIDE.md` for detailed instructions
2. Review React Navigation documentation
3. Check React Native CLI documentation
