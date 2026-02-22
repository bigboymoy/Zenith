# Zenith — Mobile (Capacitor & iOS)

This document covers building and running Zenith as a native iOS app with Capacitor, plus versioning and future native permissions.

## Prerequisites

- Node.js 18+
- Xcode 15+ (for iOS simulator and device)
- macOS (required for iOS development)
- CocoaPods (Xcode typically installs this; run `pod --version` to check)

## Build & Run (iOS)

**Important:** The native app serves the built web app from the `webDir`. You must build the web app before syncing to iOS.

### 1. Build the web app

```bash
npm install
npm run build
```

This produces the `dist/` folder (Vite output). `capacitor.config.json` points `webDir` to `dist`.

### 2. Sync to iOS

```bash
npx cap sync ios
```

This copies `dist/` into the iOS project and updates native dependencies. Run after every `npm run build` when you want the iOS app to reflect web changes.

### 3. Open in Xcode

```bash
npx cap open ios
```

Or open manually: open `ios/App/App.xcodeproj` in Xcode.

### 4. Run on simulator or device

- **Simulator:** In Xcode, choose a simulator (e.g. iPhone 16) from the scheme/device menu, then press **Run** (▶) or `Cmd + R`.
- **Device:** Connect your iPhone, select it as the run target, then run. You may need to set your **Team** under **Signing & Capabilities** and trust the developer certificate on the device.

### 5. Live reload (optional)

While developing, you can run the web dev server and the iOS app:

- Terminal 1: `npm run dev`
- In `capacitor.config.json` you can set `server.url` to your dev server URL (e.g. `http://localhost:5173`) for live reload; remember to remove or comment it out for production builds.
- Terminal 2: `npx cap run ios` (or run from Xcode after opening with `npx cap open ios`).

## Configuration

- **capacitor.config.json**  
  - `appId`: e.g. `com.mayur.zenith`  
  - `appName`: `Zenith`  
  - `webDir`: `dist` (must match Vite’s output directory)

- **ios/**  
  The native iOS project is under `ios/App/`. Do not edit generated files under `ios/App/App/public/`; they are overwritten by `cap sync`.

## Versioning

- **Display version (e.g. 1.0.0):** Set in Xcode → **App** target → **General** → **Version** (`MARKETING_VERSION` in `ios/App/App.xcodeproj/project.pbxproj`).
- **Build number:** Set **Build** in the same screen (`CURRENT_PROJECT_VERSION` in `project.pbxproj`). Bump this for each App Store or TestFlight upload.
- **Optional:** You can add `appVersion` and similar in `capacitor.config.json` for reference; the iOS build uses the Xcode project values for the binary.

To bump version from the command line, edit `ios/App/App.xcodeproj/project.pbxproj` and update both Debug and Release sections:

- `MARKETING_VERSION = 1.0;`  → e.g. `1.1`
- `CURRENT_PROJECT_VERSION = 1;` → increment for each build (e.g. `2`)

## iOS-specific notes

- **Environment:** No custom env vars are required for the base app. Use Xcode schemes or `xcconfig` files if you add environment-specific config later.
- **Entitlements:** The default project does not add extra entitlements (e.g. Push Notifications or HealthKit). When you add capabilities in Xcode (e.g. Push), Xcode will create or update the entitlements file.
- **Safe areas:** The web UI uses `viewport-fit=cover` and `env(safe-area-inset-*)` so content respects notch and home indicator. See `index.html` and `src/index.css`.
- **Keyboard:** Login, Signup, and AddActivityModal use scrollable containers and `scroll-margin` so focused fields can scroll into view. For native keyboard resizing (e.g. WebView resizing when the keyboard opens), consider adding [Capacitor Keyboard](https://capacitorjs.com/docs/apis/keyboard).

---

## Future: Permissions

### Current

The app does **not** currently request any native permissions (camera, location, push, health, etc.). It runs as a standard web view with Firebase (network only).

### Recommended next steps (documentation only)

1. **Push notifications (Capacitor Push)**  
   - Use the official [Capacitor Push Notifications API](https://capacitorjs.com/docs/apis/push-notifications).  
   - Enable the **Push Notifications** capability in the Xcode project and implement the required `AppDelegate` callbacks (see Capacitor docs).  
   - Backend: use Firebase Cloud Messaging (or another provider) to send tokens and deliver notifications.

2. **Apple Health / HealthKit (read workouts)**  
   - Use a Capacitor-compatible HealthKit plugin to read workout data (e.g. for auto-import or dashboards).  
   - Options: [@capgo/capacitor-health](https://github.com/Cap-go/capacitor-health) (iOS + Android Health Connect) or [@perfood/capacitor-healthkit](https://www.npmjs.com/package/@perfood/capacitor-healthkit) (iOS HealthKit).  
   - In Xcode: add the **HealthKit** capability and the required **Privacy - Health Share/Update Usage Description** entries in `Info.plist`.  
   - See each plugin’s README and the [Capacitor iOS configuration docs](https://capacitorjs.com/docs/ios/configuration) for setup.

No implementation of push or HealthKit is included in the current codebase; the above are links and pointers only.
