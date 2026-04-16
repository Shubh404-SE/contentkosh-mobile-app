import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addUserToBatch, getBatchUsers } from '../../api/batchesApi';
import { getBusinessUsers } from '../../api/usersApi';
import { BATCH_QUERY_KEYS } from '../../constants/batchQueryKeys';
import { BATCH_UI } from '../../constants/batchUi';
import { mapApiError } from '../../utils/mapApiError';
import { showToast } from '../../utils/toast';
import type { User } from '../../api/apiTypes';

type MemberRole = 'STUDENT' | 'TEACHER';

type Props = {
  visible: boolean;
  onClose: () => void;
  batchId: number;
  businessId: number;
  roleToAdd: MemberRole;
};

function initialsFromUser(u: User): string {
  const n = u.name?.trim();
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase().slice(0, 2);
    }
    return n.slice(0, 2).toUpperCase();
  }
  return (u.email ?? '?').slice(0, 2).toUpperCase();
}

export function AddBatchMemberModal({ visible, onClose, batchId, businessId, roleToAdd }: Props) {
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!visible) setSearch('');
  }, [visible]);

  const businessUsersQuery = useQuery({
    queryKey: ['businessUsers', businessId, roleToAdd],
    queryFn: () => getBusinessUsers(businessId, roleToAdd),
    enabled: visible && businessId > 0,
  });

  const batchUsersQuery = useQuery({
    queryKey: ['batches', batchId, 'users', 'allMembers'],
    queryFn: () => getBatchUsers(batchId),
    enabled: visible,
  });

  const existingUserIds = useMemo(() => {
    const rows = batchUsersQuery.data ?? [];
    const ids = new Set<number>();
    for (const r of rows) {
      const id = r.userId ?? r.user?.id;
      if (typeof id === 'number') ids.add(id);
    }
    return ids;
  }, [batchUsersQuery.data]);

  const candidates = useMemo(() => {
    const list = businessUsersQuery.data ?? [];
    const q = search.trim().toLowerCase();
    return list
      .filter((u) => !existingUserIds.has(u.id))
      .filter((u) => {
        if (!q) return true;
        const name = (u.name ?? '').toLowerCase();
        const email = (u.email ?? '').toLowerCase();
        return name.includes(q) || email.includes(q) || String(u.id).includes(q);
      });
  }, [businessUsersQuery.data, existingUserIds, search]);

  const addMutation = useMutation({
    mutationFn: (userId: number) => addUserToBatch({ batchId, userId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: BATCH_QUERY_KEYS.detail(batchId) });
      await queryClient.invalidateQueries({ queryKey: ['batches', batchId, 'users'] });
      showToast(
        roleToAdd === 'STUDENT' ? 'Student added to batch' : 'Teacher added to batch',
        'success'
      );
      onClose();
    },
    onError: (e) => showToast(mapApiError(e).message || 'Could not add user', 'error'),
  });

  const title = roleToAdd === 'STUDENT' ? 'Add student' : 'Add teacher';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={onClose}
    >
      <View style={[styles.sheet, { paddingTop: Math.max(insets.top, 12) + 8 }]}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={12} style={styles.closeHit}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </View>
        <Text style={styles.sheetHint}>
          Only users who belong to your organization and have the {roleToAdd === 'STUDENT' ? 'student' : 'teacher'}{' '}
          role are listed.
        </Text>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name or email…"
          placeholderTextColor={BATCH_UI.TEXT_DIM}
          style={styles.search}
        />
        {businessUsersQuery.isLoading || batchUsersQuery.isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={BATCH_UI.ACCENT} />
          </View>
        ) : (
          <FlatList
            data={candidates}
            keyExtractor={(item) => String(item.id)}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <Text style={styles.empty}>
                {search.trim() ? 'No matching users.' : 'No users available to add.'}
              </Text>
            }
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [styles.userRow, pressed && styles.userRowPressed]}
                onPress={() => {
                  if (addMutation.isPending) return;
                  addMutation.mutate(item.id);
                }}
                disabled={addMutation.isPending}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initialsFromUser(item)}</Text>
                </View>
                <View style={styles.userMeta}>
                  <Text style={styles.userName}>{item.name?.trim() || 'Unnamed'}</Text>
                  <Text style={styles.userEmail}>{item.email}</Text>
                </View>
                <Text style={styles.addChevron}>{addMutation.isPending ? '…' : 'Add'}</Text>
              </Pressable>
            )}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: BATCH_UI.BG,
    paddingHorizontal: 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sheetTitle: {
    color: BATCH_UI.TEXT,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  closeHit: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  closeText: {
    color: BATCH_UI.ACCENT,
    fontWeight: '700',
    fontSize: 16,
  },
  sheetHint: {
    color: BATCH_UI.TEXT_MUTED,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  search: {
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER,
    backgroundColor: BATCH_UI.CARD,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: BATCH_UI.TEXT,
    fontSize: 15,
    marginBottom: 12,
  },
  loadingWrap: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 40,
  },
  empty: {
    color: BATCH_UI.TEXT_DIM,
    textAlign: 'center',
    marginTop: 24,
    fontSize: 15,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BATCH_UI.BORDER,
  },
  userRowPressed: {
    backgroundColor: BATCH_UI.CARD_HOVER,
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
    fontSize: 16,
  },
  userMeta: {
    flex: 1,
  },
  userName: {
    color: BATCH_UI.TEXT,
    fontWeight: '700',
    fontSize: 16,
  },
  userEmail: {
    color: BATCH_UI.TEXT_MUTED,
    fontSize: 13,
    marginTop: 2,
  },
  addChevron: {
    color: BATCH_UI.EMERALD,
    fontWeight: '800',
    fontSize: 15,
  },
});
