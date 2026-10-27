# NiniMed mobile installation and builds

NiniMed is a server-rendered Next.js application. Android and iOS packages use
Capacitor as a native shell around the deployed web app; they are not standalone
offline copies of the server, database, or API. Native builds load
`https://www.wisdomcourse.com.et` by default; override `CAPACITOR_SERVER_URL`
for staging or local device testing.

## Android debug APK (Windows PowerShell)

Prerequisites: Node.js/npm, Android Studio with Android SDK Platform 36 and Build
Tools 36.1.0, and Java 21 or newer.

The default host is ready for a release build. For local testing, override it
with a development server URL reachable from the device (the Android emulator
can reach the host machine at `http://10.0.2.2:3000`).

```powershell
$env:CAPACITOR_SERVER_URL = "https://www.wisdomcourse.com.et"
npm ci
npm run mobile:sync:android
Push-Location .\android
.\gradlew.bat assembleDebug
Pop-Location
```

The debug APK is created at
`android\app\build\outputs\apk\debug\app-debug.apk`. Install it on a connected
device with:

```powershell
adb install -r .\android\app\build\outputs\apk\debug\app-debug.apk
```

For a signed Play Store release, configure a release signing key in Android
Gradle and build an Android App Bundle (`bundleRelease`) rather than distributing
the debug APK. Do not commit signing keys or passwords.

## iPhone and iPad

iOS builds require macOS, Xcode, and an Apple signing team. Install dependencies
and optionally override the default host, then run:

```sh
export CAPACITOR_SERVER_URL="https://www.wisdomcourse.com.et"
npm ci
npm run mobile:sync:ios
npm run mobile:open:ios
```

In Xcode, select the app target, set its signing team and bundle identifier,
then build and distribute through TestFlight or the App Store.
The iOS project is already included in this repository. If adding iOS to a
different checkout where the `ios` directory is absent, run `npx cap add ios`
once before syncing. Capacitor's CLI reads `CAPACITOR_SERVER_URL` from the
shell; it does not load `.env.example`.

## Install from a mobile browser

Deploy the Next.js app over HTTPS, then open its URL in the mobile browser.
Android Chrome offers **Install app** when the PWA install criteria are met.
On iOS Safari, use **Share → Add to Home Screen**. The service worker provides
limited cached/offline behavior; clinical actions and API-backed features still
need a network connection.

An APK download link is shown only when `NEXT_PUBLIC_ANDROID_APK_URL` points to
an actual, published APK. The application does not generate or host a release
APK automatically.
