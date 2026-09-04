# 📱 NiniMed Mobile App: Complete Build & Run Guide

The mobile application is fully prepared and resolved.

---

## 🛠️ Step-by-Step Build Commands

Run the following commands in your project root (`/mnt/c/Users/abebe/Desktop/Clinic` or PowerShell):

```bash
# 1. Build the Next.js production web bundle
bun run build

# 2. Sync Web Assets with the Android Native Container
npx cap sync android

# 3. Build the Android Debug APK
cd android
chmod +x ./gradlew
./gradlew assembleDebug
```

---

## 📦 Output APK Location

Once the Gradle build completes, the standalone Android APK will be ready at:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

You can install this directly onto any Android device via:
```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 📱 Instant Browser PWA Installation (Zero-Build Option)

If you are running the development server (`bun dev` or `npm run dev`):
1. Open `http://localhost:3000` on any mobile browser (Chrome on Android, Safari on iOS).
2. Tap the floating **"Install NiniMed Mobile App"** prompt.
3. The app installs as a standalone home screen app with push notifications and offline caching.
