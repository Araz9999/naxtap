# Naxtap Android

Open this folder in **Android Studio** to build and run the app.

## First-time setup

1. **Install dependencies** (required before opening in Android Studio):
   From the **mobile** folder (parent of `android`), run:
   ```bash
   cd D:\client\naxtap\mobile
   npm install
   ```
   Or from project root: `cd mobile && npm install`
   This installs `react-native` and `@react-native/gradle-plugin`; without it, Gradle sync will fail.

2. **Gradle wrapper** (if `gradlew` fails with "gradle-wrapper.jar not found"):
   - Option A: Install [Gradle](https://gradle.org/install/), then from this folder run:
     ```bash
     gradle wrapper
     ```
   - Option B: In Android Studio, use **File → Open** and select this `android` folder; when prompted, let it create or download the Gradle wrapper.

3. **SDK**: Set `ANDROID_HOME` (or `sdk.dir` in `local.properties`) to your Android SDK path. Android Studio does this when you open the project.

4. **Run**: In Android Studio, use **Run → Run 'app'** or the green play button.

## Build from command line

From this folder:

- Debug APK: `gradlew.bat assembleDebug` (Windows) or `./gradlew assembleDebug` (Mac/Linux)
- Release APK: `gradlew.bat assembleRelease` or `./gradlew assembleRelease`

From project root (mobile folder):

- `npm run android` — runs the app on a connected device or emulator.
