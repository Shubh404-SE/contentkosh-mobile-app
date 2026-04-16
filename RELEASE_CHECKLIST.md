## ContentKosh Mobile — Release checklist (Day 21)

This repo uses **Expo + EAS Build** (`eas.json` included).

### 0) Preconditions
- **Unique identifiers**: verify `app.json` has correct:
  - `expo.ios.bundleIdentifier`
  - `expo.android.package`
- **API environment**: set `EXPO_PUBLIC_API_URL` for the release environment (staging/prod).
- **Privacy policy URL**: set `expo.privacyPolicyUrl` to your real hosted policy.

### 1) Crash reporting (Sentry)
- Add environment variable:
  - `EXPO_PUBLIC_SENTRY_DSN` (used by `src/lib/sentry.ts`)
- For sourcemap uploads on CI/EAS:
  - set `SENTRY_AUTH_TOKEN` as an EAS secret
  - set your org/project in the Sentry plugin config if required

### 2) Version bump
- Update `expo.version` in `app.json`
- Update native build numbers:
  - iOS: `expo.ios.buildNumber` (add if missing)
  - Android: `expo.android.versionCode` (add if missing)
- Ensure Settings shows the expected version (it uses native version/build when available).

### 3) Android (AAB, internal testing)
- Install EAS CLI:
  - `npm i -g eas-cli`
- Login:
  - `eas login`
- Build signed AAB for internal testing:
  - `eas build -p android --profile preview`
- Upload to Play Console internal testing track.
- Smoke test from Play internal track:
  - cold start → login → dashboard → start/submit one test attempt

### 4) iOS (archive + TestFlight)
- Build:
  - `eas build -p ios --profile preview`
- Submit to TestFlight:
  - `eas submit -p ios --latest`
- Smoke test from TestFlight (same flow as Android).

### 5) Store assets + forms
- **Icons/splash**: confirm `assets/icon.png`, `assets/splash-icon.png`, adaptive icons.
- **Privacy policy**: link works in store listing.
- **Data safety/App privacy**:
  - declare account login, analytics/crash reporting (if Sentry enabled), and any file access (content downloads).

