import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAnnouncementSocketStore } from '../../store/announcementSocketStore';

export function AnnouncementConnectionBanner() {
  const status = useAnnouncementSocketStore((s) => s.status);
  const lastError = useAnnouncementSocketStore((s) => s.lastErrorMessage);

  if (status === 'idle' || status === 'connected') {
    return null;
  }

  const label =
    status === 'offline'
      ? 'Offline — announcements may not update live.'
      : status === 'reconnecting'
        ? 'Reconnecting to live updates…'
        : status === 'disconnected'
          ? 'Disconnected from live updates.'
          : 'Updating connection…';

  return (
    <View style={styles.wrap} accessibilityRole="alert">
      <Text style={styles.text}>{label}</Text>
      {lastError ? <Text style={styles.sub}>{lastError}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#1e2a3f',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#334155',
  },
  text: {
    color: '#fbbf24',
    fontSize: 13,
    fontWeight: '600',
  },
  sub: {
    marginTop: 4,
    color: '#94a3b8',
    fontSize: 12,
  },
});
