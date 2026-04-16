import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useAuthStore } from './store/authStore';
import { RootNavigator } from './navigation/RootNavigator';
import { setUnauthorizedHandler } from './api/apiClient';
import { usePermissionStore } from './store/permissionStore';
import { QueryProvider } from './providers/QueryProvider';
import { ToastHost } from './components/ui/ToastHost';

export function AppRoot() {
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping);
  const bootstrapError = useAuthStore((s) => s.bootstrapError);
  const bootstrapFromCookieSession = useAuthStore((s) => s.bootstrapFromCookieSession);
  const clearSession = useAuthStore((s) => s.clearSession);
  const clearPermissions = usePermissionStore((s) => s.clear);

  useEffect(() => {
    bootstrapFromCookieSession();
  }, [bootstrapFromCookieSession]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearPermissions();
      clearSession();
    });

    return () => {
      setUnauthorizedHandler(null);
    };
  }, [clearPermissions, clearSession]);

  if (isBootstrapping) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color="#fff" />
        <Text style={styles.splashText}>Loading session…</Text>
      </View>
    );
  }

  return (
    <QueryProvider>
      <View style={styles.full}>
        {bootstrapError ? <Text style={styles.bootstrapError}>{bootstrapError}</Text> : null}
        <RootNavigator />
        <ToastHost />
      </View>
    </QueryProvider>
  );
}

const styles = StyleSheet.create({
  full: {
    flex: 1,
  },
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0b1220',
  },
  splashText: {
    marginTop: 12,
    color: '#b7c3dd',
  },
  bootstrapError: {
    color: '#ffb3b3',
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 8,
    backgroundColor: '#0b1220',
  },
});
