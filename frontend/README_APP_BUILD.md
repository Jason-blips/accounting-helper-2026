# Building Tally Drop 落记 for App Stores

This document describes how to build **Android** (Google Play) and optionally **iOS** (App Store) apps from the existing React frontend using Capacitor.

**App-ready features included:** splash screen, offline/network error banners, About page (version + optional privacy link), and store listing copy in `docs/GOOGLE_PLAY_LISTING.md`.

## Prerequisites

1. **Backend must be deployed** to a public HTTPS URL (e.g. `https://api.yourdomain.com`). The app will call this API; it cannot use `localhost`.
2. **Node.js 18+** and **npm** installed.
3. **Android**: [Android Studio](https://developer.android.com/studio) installed (for building and signing).
4. **iOS** (optional): Mac with [Xcode](https://developer.apple.com/xcode/) and Apple Developer account.

---

## 1. Install dependencies

```bash
cd frontend
npm install
```

---

## 2. Set the API URL for the app

Create a file `.env.production` (or set when building) so the app knows where your backend is:

```env
# Replace with your deployed backend base URL including /api
VITE_API_URL=https://your-api-domain.com/api
```

For a **one-off build** you can pass it inline (PowerShell):

```powershell
$env:VITE_API_URL="https://your-api-domain.com/api"; npm run build:app
```

---

## 3. Build the web assets for the app

This uses `--mode app` so that asset paths work inside the native app (relative base):

```bash
npm run build:app
```

---

## 4. Add the Android project (first time only)

```bash
npx cap add android
```

This creates the `android/` folder. You only need to do this once.

---

## 5. Sync web build into the native project

After any change to the frontend, rebuild and sync:

```bash
npm run cap:sync
```

This runs `build:app` and then copies `dist/` into the Android (and iOS if added) project.

---

## 6. Open and run in Android Studio

```bash
npm run cap:android
```

- In Android Studio: use **Build → Generate Signed Bundle / APK** to create an **AAB** (recommended for Google Play) or APK.
- You need a keystore for release builds; create one if you don’t have it.

---

## 7. Publish to Google Play

1. Create a [Google Play Developer](https://play.google.com/console) account (one-time fee ~$25).
2. Create a new app, fill in store listing, content rating, etc.
3. Upload the AAB from the previous step.
4. Submit for review.

---

## iOS (optional)

1. On a **Mac**, install Xcode and accept the license.
2. In the frontend folder:
   ```bash
   npx cap add ios
   npm run cap:sync
   npx cap open ios
   ```
3. In Xcode: select your team, set Bundle ID, then **Product → Archive** and upload to App Store Connect.
4. You need an [Apple Developer](https://developer.apple.com) account ($99/year).

---

## Summary

- **Easier to ship first**: **Google Play** (Android) — lower cost, no Mac required.
- **Same frontend** can later be used for **iOS** by adding the iOS platform and building on Mac.
- **Backend** must be deployed with a public **HTTPS** URL; set `VITE_API_URL` to that base (including `/api`) when building the app.

For the overall assessment (Google vs iOS, architecture), see **docs/APP_STORE_ASSESSMENT.md**.
