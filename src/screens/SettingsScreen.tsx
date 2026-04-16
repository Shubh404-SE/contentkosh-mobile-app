import React, { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { logout as logoutRequest } from '../api/authApi';
import { useAuthStore } from '../store/authStore';
import { usePermissionStore } from '../store/permissionStore';
import { mapApiError } from '../utils/mapApiError';

export function SettingsScreen() {
  const clearSession = useAuthStore((s) => s.clearSession);
  const clearPermissions = usePermissionStore((s) => s.clear);
  const user = useAuthStore((s) => s.user);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onLogout = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    setError(null);
    try {
      await logoutRequest();
    } catch (e) {
      setError(mapApiError(e).message || 'Logout failed');
    } finally {
      clearPermissions();
      clearSession();
      setIsLoading(false);
    }
  }, [clearPermissions, clearSession, isLoading]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.subtitle}>{user ? `${user.email} — ${user.role}` : 'Unknown user'}</Text>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity
        onPress={onLogout}
        style={[styles.button, isLoading ? styles.buttonDisabled : null]}
        disabled={isLoading}
      >
        {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Logout</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingTop: 64,
    backgroundColor: '#0b1220',
  },
  title: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 8,
    color: '#b7c3dd',
  },
  errorText: {
    color: '#ff8a8a',
    marginTop: 12,
  },
  button: {
    marginTop: 18,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#334155',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});

