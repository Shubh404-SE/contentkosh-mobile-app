import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRoute } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getAnnouncementById } from '../../api/announcementsApi';
import { ANNOUNCEMENT_QUERY_KEYS } from '../../constants/announcementQueryKeys';
import type { AnnouncementsStackParamList } from './AnnouncementsStack';

type Props = NativeStackScreenProps<AnnouncementsStackParamList, 'AnnouncementDetail'>;

function formatRange(start?: string, end?: string): string {
  if (!start && !end) return '';
  try {
    const s = start ? new Date(start).toLocaleString() : '';
    const e = end ? new Date(end).toLocaleString() : '';
    return `${s} → ${e}`;
  } catch {
    return '';
  }
}

export function AnnouncementDetailScreen(_props: Props) {
  const route = useRoute<Props['route']>();
  const { id } = route.params;

  const { data, isLoading, error } = useQuery({
    queryKey: ANNOUNCEMENT_QUERY_KEYS.detail(id),
    queryFn: () => getAnnouncementById(id),
  });

  const announcement = data?.data;

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#94a3b8" />
        <Text style={styles.muted}>Loading…</Text>
      </View>
    );
  }

  if (error || !announcement) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>Could not load this announcement.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{announcement.heading ?? 'Announcement'}</Text>
      <Text style={styles.meta}>{formatRange(announcement.startDate, announcement.endDate)}</Text>
      {announcement.createdByUser?.name ? (
        <Text style={styles.meta}>From {announcement.createdByUser.name}</Text>
      ) : null}
      <Text style={styles.body}>{announcement.content ?? ''}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#0b1220' },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b1220' },
  title: { color: '#f8fafc', fontSize: 22, fontWeight: '700', marginBottom: 8 },
  meta: { color: '#94a3b8', fontSize: 13, marginBottom: 4 },
  body: { color: '#e2e8f0', fontSize: 16, lineHeight: 24, marginTop: 16 },
  muted: { color: '#94a3b8', marginTop: 8 },
  error: { color: '#fca5a5', padding: 16 },
});
