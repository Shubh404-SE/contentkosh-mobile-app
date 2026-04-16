import React, { Fragment, useCallback, useLayoutEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { deleteAnnouncement, getUserAnnouncementBundle } from '../../api/announcementsApi';
import { ANNOUNCEMENT_QUERY_KEYS } from '../../constants/announcementQueryKeys';
import { AnnouncementConnectionBanner } from '../../components/announcements/AnnouncementConnectionBanner';
import type { Announcement } from '../../types/announcement';
import { useAuthStore } from '../../store/authStore';
import { mapApiError } from '../../utils/mapApiError';
import type { AnnouncementsStackParamList } from './AnnouncementsStack';

type Props = NativeStackScreenProps<AnnouncementsStackParamList, 'AnnouncementList'>;

function formatRange(start?: string, end?: string): string {
  if (!start && !end) return '';
  try {
    const s = start ? new Date(start).toLocaleDateString() : '';
    const e = end ? new Date(end).toLocaleDateString() : '';
    return `${s} — ${e}`;
  } catch {
    return '';
  }
}

export function AnnouncementListScreen({ navigation }: Props) {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const businessId = useAuthStore((s) => s.business?.id);

  const role = user?.role?.toUpperCase() ?? '';
  const isAdmin = role === 'ADMIN';
  const isTeacher = role === 'TEACHER';
  const isStudent = role === 'STUDENT';
  const canManage = isAdmin || isTeacher;
  const editorRole = isAdmin ? 'ADMIN' : 'TEACHER';

  const {
    data: bundleRes,
    isLoading,
    isRefetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ANNOUNCEMENT_QUERY_KEYS.bundle(),
    queryFn: getUserAnnouncementBundle,
    enabled: businessId != null,
  });

  const received = bundleRes?.data?.received ?? [];
  const managed = bundleRes?.data?.managed ?? [];

  const teacherInbox = useMemo(() => {
    if (!isTeacher || user?.id == null) return received;
    return received.filter((a) => a.createdBy !== user.id);
  }, [isTeacher, received, user?.id]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight:
        canManage && businessId != null
          ? () => (
              <Pressable
                onPress={() => navigation.navigate('AnnouncementEditor', { editorRole })}
                style={styles.headerBtn}
                accessibilityLabel="New announcement"
              >
                <Text style={styles.headerBtnText}>New</Text>
              </Pressable>
            )
          : undefined,
    });
  }, [navigation, canManage, businessId, editorRole]);

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteAnnouncement(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ANNOUNCEMENT_QUERY_KEYS.bundle() });
    },
  });

  const confirmDelete = useCallback(
    (item: Announcement) => {
      if (!item.id || deleteMutation.isPending) return;
      Alert.alert('Delete announcement?', 'This action cannot be undone.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteMutation.mutate(item.id!);
          },
        },
      ]);
    },
    [deleteMutation]
  );

  const openDetail = (id: number) => {
    navigation.navigate('AnnouncementDetail', { id });
  };

  const openEdit = (item: Announcement) => {
    if (!item.id) return;
    navigation.navigate('AnnouncementEditor', { id: item.id, editorRole });
  };

  const renderCard = (item: Announcement, opts: { showActions: boolean }) => (
    <View style={styles.card}>
      <Pressable onPress={() => item.id && openDetail(item.id)} accessibilityRole="button">
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.heading ?? 'Untitled'}
          </Text>
        </View>
        <Text style={styles.cardMeta}>{formatRange(item.startDate, item.endDate)}</Text>
        <Text style={styles.cardPreview} numberOfLines={2}>
          {item.content ?? ''}
        </Text>
      </Pressable>
      {opts.showActions ? (
        <View style={styles.cardActions}>
          <Pressable onPress={() => openEdit(item)} style={styles.smallBtn} accessibilityLabel="Edit announcement">
            <Text style={styles.smallBtnText}>Edit</Text>
          </Pressable>
          <Pressable
            onPress={() => confirmDelete(item)}
            style={styles.smallBtn}
            accessibilityLabel="Delete announcement"
          >
            <Text style={styles.dangerText}>Delete</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );

  if (businessId == null) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>You need to be assigned to an institute to see announcements.</Text>
      </View>
    );
  }

  if (isLoading && received.length === 0 && managed.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#94a3b8" size="large" />
        <Text style={styles.muted}>Loading announcements…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{mapApiError(error).message}</Text>
        <Pressable onPress={() => void refetch()} style={styles.retryBtn}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <AnnouncementConnectionBanner />
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor="#94a3b8" />
        }
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.pageSubtitle}>
          {isStudent && 'Updates from your institute and instructors.'}
          {isTeacher && 'See institute-wide announcements and manage your own.'}
          {isAdmin && 'Create and manage announcements for your institute.'}
          {!isStudent && !isTeacher && !isAdmin && 'Announcements for your account.'}
        </Text>

        {isAdmin ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>All announcements ({managed.length})</Text>
            {managed.length === 0 ? (
              <Text style={styles.empty}>No announcements yet.</Text>
            ) : (
              managed.map((a, idx) => (
                <Fragment key={a.id ?? `adm-${idx}`}>{renderCard(a, { showActions: true })}</Fragment>
              ))
            )}
          </View>
        ) : null}

        {isTeacher ? (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>For you ({teacherInbox.length})</Text>
              {teacherInbox.length === 0 ? (
                <Text style={styles.empty}>No announcements in your inbox.</Text>
              ) : (
                teacherInbox.map((a, idx) => (
                  <Fragment key={a.id ?? `in-${idx}`}>{renderCard(a, { showActions: false })}</Fragment>
                ))
              )}
            </View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your announcements ({managed.length})</Text>
              {managed.length === 0 ? (
                <Text style={styles.empty}>You have not created any announcements yet.</Text>
              ) : (
                managed.map((a, idx) => (
                  <Fragment key={a.id ?? `tea-${idx}`}>{renderCard(a, { showActions: true })}</Fragment>
                ))
              )}
            </View>
          </>
        ) : null}

        {isStudent ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your announcements ({received.length})</Text>
            {received.length === 0 ? (
              <Text style={styles.empty}>No announcements yet.</Text>
            ) : (
              received.map((a, idx) => (
                <Fragment key={a.id ?? `stu-${idx}`}>{renderCard(a, { showActions: false })}</Fragment>
              ))
            )}
          </View>
        ) : null}

        {!isAdmin && !isTeacher && !isStudent ? (
          <Text style={styles.muted}>Announcements are not available for your account.</Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b1220' },
  scrollContent: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b1220', padding: 24 },
  pageSubtitle: { color: '#94a3b8', fontSize: 14, marginBottom: 16 },
  section: { marginBottom: 24 },
  sectionTitle: { color: '#e2e8f0', fontSize: 16, fontWeight: '700', marginBottom: 12 },
  card: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  cardTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '600', flex: 1 },
  cardActions: { flexDirection: 'row', marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#1e293b' },
  cardMeta: { color: '#64748b', fontSize: 12, marginTop: 6 },
  cardPreview: { color: '#94a3b8', fontSize: 13, marginTop: 8 },
  empty: { color: '#64748b', fontSize: 14, fontStyle: 'italic' },
  muted: { color: '#94a3b8', fontSize: 14, textAlign: 'center' },
  error: { color: '#fca5a5', textAlign: 'center', marginBottom: 12 },
  retryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#1d4ed8',
    borderRadius: 8,
  },
  retryText: { color: '#fff', fontWeight: '600' },
  headerBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  headerBtnText: { color: '#38bdf8', fontSize: 16, fontWeight: '700' },
  smallBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  smallBtnText: { color: '#38bdf8', fontSize: 13, fontWeight: '600' },
  dangerText: { color: '#f87171', fontSize: 13, fontWeight: '600' },
});
