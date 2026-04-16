import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getAnnouncementById } from '../../api/announcementsApi';
import { ANNOUNCEMENT_QUERY_KEYS } from '../../constants/announcementQueryKeys';
import { useAuthStore } from '../../store/authStore';
import { AdminAnnouncementForm } from './AdminAnnouncementForm';
import { TeacherAnnouncementForm } from './TeacherAnnouncementForm';
import type { AnnouncementsStackParamList } from './AnnouncementsStack';

type Props = NativeStackScreenProps<AnnouncementsStackParamList, 'AnnouncementEditor'>;

export function AnnouncementEditorScreen({ navigation, route }: Props) {
  const { id, editorRole } = route.params;
  const businessId = useAuthStore((s) => s.business?.id);

  const { data, isLoading } = useQuery({
    queryKey: ANNOUNCEMENT_QUERY_KEYS.detail(id ?? 0),
    queryFn: () => getAnnouncementById(id!),
    enabled: typeof id === 'number',
  });

  const initial = typeof id === 'number' ? data?.data ?? null : null;

  const onSaved = () => {
    navigation.goBack();
  };

  const onCancel = () => {
    navigation.goBack();
  };

  if (editorRole === 'ADMIN' && businessId == null) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>You need a business context to create announcements.</Text>
      </View>
    );
  }

  if (typeof id === 'number' && isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#94a3b8" />
      </View>
    );
  }

  if (editorRole === 'ADMIN') {
    return <AdminAnnouncementForm businessId={businessId!} initial={initial} onCancel={onCancel} onSaved={onSaved} />;
  }

  return <TeacherAnnouncementForm initial={initial} onCancel={onCancel} onSaved={onSaved} />;
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b1220', padding: 16 },
  error: { color: '#fca5a5', textAlign: 'center' },
});
