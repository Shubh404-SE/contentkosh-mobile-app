const { getSentryExpoConfig } = require('@sentry/react-native/metro');

// Enables Sentry debug IDs + sourcemap upload integration for Expo builds.
const config = getSentryExpoConfig(__dirname);

module.exports = config;

