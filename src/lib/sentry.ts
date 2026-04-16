import * as Sentry from '@sentry/react-native';

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

export function initSentry() {
  if (!SENTRY_DSN) return;

  Sentry.init({
    dsn: SENTRY_DSN,
    enableNative: true,
    debug: __DEV__,
    // Keep sampling conservative by default; tune per env.
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
  });
}

