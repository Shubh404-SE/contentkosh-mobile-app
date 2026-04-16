import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteBatch,
  getBatchById,
  getBatchUsers,
  removeUserFromBatch,
} from '../../api/batchesApi';
import { BATCH_QUERY_KEYS } from '../../constants/batchQueryKeys';
import { BATCH_UI } from '../../constants/batchUi';
import { DASHBOARD_QUERY_KEY } from '../../constants/dashboardQueryKeys';
import { BATCHES_STACK } from '../../constants/navigation';
import { mapApiError } from '../../utils/mapApiError';
import { showToast } from '../../utils/toast';
import type { BatchUserRecord } from '../../types/batch';
import type { BatchesStackParamList } from './BatchesStack';
import { useAuthStore } from '../../store/authStore';
import { AddBatchMemberModal } from '../../components/batches/AddBatchMemberModal';

type Props = NativeStackScreenProps<BatchesStackParamList, typeof BATCHES_STACK.DETAIL>;

type MemberTab = 'STUDENT' | 'TEACHER';

function userLabel(m: BatchUserRecord): string {
  return m.user?.name?.trim() || m.user?.email || `User #${m.userId ?? m.user?.id ?? '?'}`;
}

function initialsFromMember(m: BatchUserRecord): string {
  const n = m.user?.name?.trim();
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase().slice(0, 2);
    }
    return n.slice(0, 2).toUpperCase();
  }
  const em = m.user?.email ?? '';
  return em.slice(0, 2).toUpperCase() || '??';
}

export function BatchDetailScreen({ route, navigation }: Props) {
  const { batchId } = route.params;
  const user = useAuthStore((s) => s.user);
  const business = useAuthStore((s) => s.business);
  const businessId = business?.id ?? 0;
  const isAdmin = user?.role === 'ADMIN';
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<MemberTab>('STUDENT');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [addModalRole, setAddModalRole] = useState<'STUDENT' | 'TEACHER' | null>(null);

  const batchQuery = useQuery({
    queryKey: BATCH_QUERY_KEYS.detail(batchId),
    queryFn: () => getBatchById(batchId),
  });

  const membersQuery = useQuery({
    queryKey: BATCH_QUERY_KEYS.members(batchId, tab),
    queryFn: () => getBatchUsers(batchId, tab),
    enabled: batchQuery.isSuccess,
  });

  const batch = batchQuery.data;

  useLayoutEffect(() => {
    const title = batch?.displayName || batch?.codeName || 'Batch';
    navigation.setOptions({
      title,
      headerRight: () =>
        isAdmin ? (
          <Pressable
            onPress={() => navigation.navigate(BATCHES_STACK.FORM, { mode: 'edit', batchId })}
            style={styles.headerBtn}
          >
            <Text style={styles.headerBtnText}>Edit</Text>
          </Pressable>
        ) : null,
    });
  }, [batch?.codeName, batch?.displayName, isAdmin, navigation]);

  const removeMutation = useMutation({
    mutationFn: (payload: { userId: number }) => removeUserFromBatch({ batchId, userId: payload.userId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: BATCH_QUERY_KEYS.members(batchId, tab) });
      await queryClient.invalidateQueries({ queryKey: BATCH_QUERY_KEYS.detail(batchId) });
      showToast('Member removed', 'success');
    },
    onError: (e) => {
      showToast(mapApiError(e).message || 'Remove failed', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteBatch(batchId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['batches'] });
      await queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });
      showToast('Batch deleted', 'success');
      navigation.popToTop();
    },
    onError: (e) => {
      showToast(mapApiError(e).message || 'Delete failed', 'error');
    },
  });

  const onConfirmDeleteBatch = () => {
    Alert.alert('Delete batch', 'Are you sure you want to delete this batch?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          if (!deleteMutation.isPending) deleteMutation.mutate();
        },
      },
    ]);
  };

  const onRemoveMember = (m: BatchUserRecord) => {
    const uid = m.userId ?? m.user?.id;
    if (typeof uid !== 'number') return;
    Alert.alert('Remove member', 'Remove this user from the batch?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          if (!removeMutation.isPending) removeMutation.mutate({ userId: uid });
        },
      },
    ]);
  };

  const filteredMembers = useMemo(() => {
    const list = membersQuery.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((m) => {
      const name = (m.user?.name ?? '').toLowerCase();
      const email = (m.user?.email ?? '').toLowerCase();
      return name.includes(q) || email.includes(q) || String(m.userId ?? '').includes(q);
    });
  }, [membersQuery.data, search]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: BATCH_QUERY_KEYS.detail(batchId) });
      await queryClient.invalidateQueries({ queryKey: BATCH_QUERY_KEYS.members(batchId, tab) });
    } catch (e) {
      showToast(mapApiError(e).message || 'Refresh failed', 'error');
    } finally {
      setRefreshing(false);
    }
  }, [batchId, queryClient, tab]);

  if (batchQuery.isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={BATCH_UI.ACCENT} />
      </View>
    );
  }

  if (batchQuery.isError || !batch) {
    return (
      <View style={styles.centered}>
        <Text style={styles.err}>{mapApiError(batchQuery.error).message || 'Batch not found'}</Text>
      </View>
    );
  }

  const start = batch.startDate ? String(batch.startDate).slice(0, 10) : '—';
  const end = batch.endDate ? String(batch.endDate).slice(0, 10) : '—';
  const active = batch.isActive !== false;

  const listHeader = (
    <View style={styles.headerBlock}>
      <View style={styles.hero}>
        <View style={styles.heroAccent} />
        <Text style={styles.heroCode}>{batch.codeName ?? '—'}</Text>
        <Text style={styles.heroTitle}>{batch.displayName ?? batch.codeName ?? 'Batch'}</Text>
        {batch.course?.name ? <Text style={styles.heroCourse}>{batch.course.name}</Text> : null}
        <View style={styles.heroMeta}>
          <View style={styles.metaChip}>
            <Text style={styles.metaChipText}>
              {start} → {end}
            </Text>
          </View>
          <View style={[styles.statusPill, !active && styles.statusPillOff]}>
            <Text style={[styles.statusPillText, !active && styles.statusPillTextOff]}>
              {active ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>
      </View>

      {isAdmin ? (
        <View style={styles.adminActions}>
          <Pressable
            onPress={() => setAddModalRole('STUDENT')}
            style={({ pressed }) => [styles.addMemberBtn, pressed && styles.addMemberBtnPressed]}
          >
            <Text style={styles.addMemberIcon}>＋</Text>
            <Text style={styles.addMemberLabel}>Add student</Text>
          </Pressable>
          <Pressable
            onPress={() => setAddModalRole('TEACHER')}
            style={({ pressed }) => [styles.addMemberBtn, styles.addMemberBtnAlt, pressed && styles.addMemberBtnPressed]}
          >
            <Text style={[styles.addMemberIcon, styles.addMemberIconAlt]}>＋</Text>
            <Text style={[styles.addMemberLabel, styles.addMemberLabelAlt]}>Add teacher</Text>
          </Pressable>
        </View>
      ) : null}

      {isAdmin ? (
        <Pressable onPress={onConfirmDeleteBatch} style={styles.dangerOutline} disabled={deleteMutation.isPending}>
          <Text style={styles.dangerOutlineText}>{deleteMutation.isPending ? 'Deleting…' : 'Delete batch'}</Text>
        </Pressable>
      ) : null}

      <Text style={styles.membersHeading}>Members</Text>
      <View style={styles.tabRow}>
        <Pressable onPress={() => setTab('STUDENT')} style={[styles.tab, tab === 'STUDENT' && styles.tabOn]}>
          <Text style={[styles.tabText, tab === 'STUDENT' && styles.tabTextOn]}>Students</Text>
        </Pressable>
        <Pressable onPress={() => setTab('TEACHER')} style={[styles.tab, tab === 'TEACHER' && styles.tabOn]}>
          <Text style={[styles.tabText, tab === 'TEACHER' && styles.tabTextOn]}>Teachers</Text>
        </Pressable>
      </View>

      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search members…"
          placeholderTextColor={BATCH_UI.TEXT_DIM}
          style={styles.searchInput}
        />
      </View>
    </View>
  );

  return (
    <View style={styles.screen}>
      <FlatList
        data={filteredMembers}
        keyExtractor={(item, index) => String(item.userId ?? item.user?.id ?? index)}
        ListHeaderComponent={listHeader}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BATCH_UI.ACCENT} />}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.memberRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initialsFromMember(item)}</Text>
            </View>
            <View style={styles.memberBody}>
              <Text style={styles.memberName}>{userLabel(item)}</Text>
              {item.user?.email ? <Text style={styles.memberEmail}>{item.user.email}</Text> : null}
            </View>
            {isAdmin ? (
              <Pressable
                onPress={() => onRemoveMember(item)}
                style={styles.removeBtn}
                disabled={removeMutation.isPending}
              >
                <Text style={styles.removeBtnText}>Remove</Text>
              </Pressable>
            ) : null}
          </View>
        )}
        ListEmptyComponent={
          membersQuery.isLoading ? (
            <View style={styles.inlineLoad}>
              <ActivityIndicator color={BATCH_UI.ACCENT} />
            </View>
          ) : (
            <Text style={styles.emptyMembers}>No one in this tab yet.</Text>
          )
        }
      />

      {isAdmin && businessId > 0 && addModalRole ? (
        <AddBatchMemberModal
          visible={addModalRole != null}
          onClose={() => setAddModalRole(null)}
          batchId={batchId}
          businessId={businessId}
          roleToAdd={addModalRole}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BATCH_UI.BG,
  },
  listContent: {
    paddingBottom: 32,
  },
  headerBlock: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: BATCH_UI.BG,
  },
  err: {
    color: '#fecaca',
    textAlign: 'center',
  },
  hero: {
    backgroundColor: BATCH_UI.CARD,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER,
    padding: 18,
    overflow: 'hidden',
  },
  heroAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: BATCH_UI.ACCENT,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  heroCode: {
    color: BATCH_UI.TEXT_MUTED,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginLeft: 8,
  },
  heroTitle: {
    color: BATCH_UI.TEXT,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 6,
    marginLeft: 8,
    letterSpacing: -0.4,
  },
  heroCourse: {
    color: BATCH_UI.TEXT_MUTED,
    fontSize: 14,
    marginTop: 6,
    marginLeft: 8,
  },
  heroMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
    marginLeft: 8,
    alignItems: 'center',
  },
  metaChip: {
    backgroundColor: BATCH_UI.BG_ELEVATED,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER,
  },
  metaChipText: {
    color: BATCH_UI.TEXT_MUTED,
    fontSize: 13,
    fontWeight: '600',
  },
  statusPill: {
    backgroundColor: BATCH_UI.EMERALD_DIM,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.35)',
  },
  statusPillOff: {
    backgroundColor: BATCH_UI.BG_ELEVATED,
    borderColor: BATCH_UI.BORDER,
  },
  statusPillText: {
    color: BATCH_UI.EMERALD,
    fontSize: 12,
    fontWeight: '800',
  },
  statusPillTextOff: {
    color: BATCH_UI.TEXT_DIM,
  },
  adminActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  addMemberBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: BATCH_UI.PRIMARY_BTN,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BATCH_UI.PRIMARY_BTN_BORDER,
  },
  addMemberBtnAlt: {
    backgroundColor: BATCH_UI.CARD,
    borderColor: BATCH_UI.ACCENT,
  },
  addMemberBtnPressed: {
    opacity: 0.9,
  },
  addMemberIcon: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  addMemberIconAlt: {
    color: BATCH_UI.ACCENT,
  },
  addMemberLabel: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  addMemberLabelAlt: {
    color: BATCH_UI.ACCENT,
  },
  dangerOutline: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.45)',
    backgroundColor: BATCH_UI.DANGER_BG,
  },
  dangerOutlineText: {
    color: BATCH_UI.DANGER,
    fontWeight: '800',
    fontSize: 14,
  },
  membersHeading: {
    marginTop: 22,
    marginBottom: 10,
    color: BATCH_UI.TEXT_DIM,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER,
    backgroundColor: BATCH_UI.CARD,
    alignItems: 'center',
  },
  tabOn: {
    borderColor: BATCH_UI.ACCENT,
    backgroundColor: BATCH_UI.ACCENT_DIM,
  },
  tabText: {
    color: BATCH_UI.TEXT_MUTED,
    fontWeight: '800',
    fontSize: 14,
  },
  tabTextOn: {
    color: BATCH_UI.TEXT,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER,
    backgroundColor: BATCH_UI.CARD,
    borderRadius: 14,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  searchIcon: {
    color: BATCH_UI.TEXT_DIM,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    color: BATCH_UI.TEXT,
    fontSize: 15,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BATCH_UI.BORDER,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: BATCH_UI.ACCENT_DIM,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: BATCH_UI.ACCENT,
    fontWeight: '800',
    fontSize: 15,
  },
  memberBody: {
    flex: 1,
  },
  memberName: {
    color: BATCH_UI.TEXT,
    fontWeight: '700',
    fontSize: 16,
  },
  memberEmail: {
    color: BATCH_UI.TEXT_MUTED,
    marginTop: 2,
    fontSize: 13,
  },
  removeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  removeBtnText: {
    color: BATCH_UI.DANGER,
    fontWeight: '800',
    fontSize: 13,
  },
  emptyMembers: {
    color: BATCH_UI.TEXT_DIM,
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 24,
    fontSize: 14,
  },
  inlineLoad: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  headerBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  headerBtnText: {
    color: BATCH_UI.ACCENT,
    fontWeight: '800',
    fontSize: 16,
  },
});
