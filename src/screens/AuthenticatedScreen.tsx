import React, { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { logout as logoutRequest } from '../api/authApi';
import { mapApiError } from '../utils/mapApiError';

export function AuthenticatedScreen() {
  const user = useAuthStore((s) => s.user);
  const business = useAuthStore((s) => s.business);
  const bootstrapFromCookieSession = useAuthStore((s) => s.bootstrapFromCookieSession);
  const clearSession = useAuthStore((s) => s.clearSession);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onRefreshProfile = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    setError(null);
    try {
      await bootstrapFromCookieSession();
    } catch (e) {
      setError(mapApiError(e).message);
    } finally {
      setIsLoading(false);
    }
  }, [bootstrapFromCookieSession, isLoading]);

  const onLogout = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    setError(null);
    try {
      await logoutRequest();
    } catch (e) {
      setError(mapApiError(e).message);
    } finally {
      clearSession();
      setIsLoading(false);
    }
  }, [clearSession, isLoading]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Authenticated</Text>
      <Text style={styles.label}>User</Text>
      <Text style={styles.value}>
        {user ? `${user.name ?? ''} (${user.email}) — ${user.role}` : 'Missing user'}
      </Text>

      <Text style={styles.label}>Business</Text>
      <Text style={styles.value}>
        {business ? `${business.name ?? 'Business'} (id=${business.id})` : 'None'}
      </Text>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity
        onPress={onRefreshProfile}
        style={[styles.button, isLoading ? styles.buttonDisabled : null]}
        disabled={isLoading}
      >
        {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Reload profile</Text>}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onLogout}
        style={[styles.buttonSecondary, isLoading ? styles.buttonDisabled : null]}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>Logout</Text>
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
    marginBottom: 16,
  },
  label: {
    color: '#b7c3dd',
    marginTop: 12,
    marginBottom: 6,
  },
  value: {
    color: '#ffffff',
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
    backgroundColor: '#2563eb',
  },
  buttonSecondary: {
    marginTop: 10,
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

