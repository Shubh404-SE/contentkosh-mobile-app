import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import * as Application from 'expo-application';
import { logout as logoutRequest } from '../api/authApi';
import { BATCH_UI } from '../constants/batchUi';
import { useAuthStore } from '../store/authStore';
import { usePermissionStore } from '../store/permissionStore';
import { mapApiError } from '../utils/mapApiError';
import { showToast } from '../utils/toast';

export function SettingsScreen() {
  const clearSession = useAuthStore((s) => s.clearSession);
  const clearPermissions = usePermissionStore((s) => s.clear);
  const user = useAuthStore((s) => s.user);
  const business = useAuthStore((s) => s.business);
  const queryClient = useQueryClient();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const versionLine = useMemo(() => {
    const v = Application.nativeApplicationVersion ?? '—';
    const b = Application.nativeBuildVersion ?? '—';
    return `v${v} (${b})`;
  }, []);

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

  const clearCache = useCallback(() => {
    Alert.alert('Clear cache', 'Clear locally cached API data? You will remain logged in.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          try {
            queryClient.clear();
            showToast('Cache cleared', 'success');
          } catch (e) {
            showToast(mapApiError(e).message || 'Failed to clear cache', 'error');
          }
        },
      },
    ]);
  }, [queryClient]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle} numberOfLines={2}>
          {business?.instituteName || business?.name || 'Your business'} · {versionLine}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Profile</Text>
        <View style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(user?.name || user?.email || 'U').slice(0, 1).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.profileName} numberOfLines={1}>
              {(user?.name ?? '').trim() || 'User'}
            </Text>
            <Text style={styles.profileEmail} numberOfLines={1}>
              {user?.email || '—'}
            </Text>
            <Text style={styles.profileRole}>{user?.role || ''}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Developer</Text>
        <Pressable onPress={clearCache} style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
          <Text style={styles.rowLabel}>Clear cache</Text>
          <Text style={styles.rowHint}>Clears React Query cache</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Account</Text>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <Pressable
          onPress={onLogout}
          style={({ pressed }) => [styles.logoutRow, pressed && styles.rowPressed, isLoading && styles.rowDisabled]}
          disabled={isLoading}
        >
          {isLoading ? <ActivityIndicator color="#fecaca" /> : <Text style={styles.logoutLabel}>Logout</Text>}
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BATCH_UI.BG,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginTop: 6,
    marginBottom: 12,
  },
  title: {
    color: BATCH_UI.TEXT,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  subtitle: {
    marginTop: 8,
    color: BATCH_UI.TEXT_MUTED,
    lineHeight: 20,
  },
  errorText: {
    color: '#fecaca',
    marginTop: 10,
    lineHeight: 20,
    fontWeight: '700',
  },
  section: {
    marginTop: 14,
  },
  sectionLabel: {
    color: BATCH_UI.TEXT_DIM,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER,
    backgroundColor: BATCH_UI.CARD,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(34, 211, 238, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#22d3ee',
    fontWeight: '900',
    fontSize: 18,
  },
  profileName: {
    color: BATCH_UI.TEXT,
    fontWeight: '900',
    fontSize: 15,
    letterSpacing: -0.2,
  },
  profileEmail: {
    marginTop: 2,
    color: BATCH_UI.TEXT_MUTED,
    fontSize: 12,
  },
  profileRole: {
    marginTop: 6,
    color: BATCH_UI.TEXT_DIM,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  row: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER,
    backgroundColor: BATCH_UI.CARD,
    padding: 14,
    marginBottom: 8,
  },
  rowPressed: {
    backgroundColor: BATCH_UI.CARD_HOVER,
  },
  rowDisabled: {
    opacity: 0.75,
  },
  rowLabel: {
    color: BATCH_UI.TEXT,
    fontWeight: '900',
    fontSize: 15,
    letterSpacing: -0.2,
  },
  rowHint: {
    marginTop: 6,
    color: BATCH_UI.TEXT_MUTED,
    fontWeight: '700',
  },
  logoutRow: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.35)',
    backgroundColor: 'rgba(248, 113, 113, 0.10)',
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutLabel: {
    color: '#fecaca',
    fontWeight: '900',
    fontSize: 15,
  },
});

