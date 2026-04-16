import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UserRole, UserSummary } from '../../api/apiTypes';
import { deleteUser, getBusinessUsers } from '../../api/usersApi';
import { ADMIN_USERS_STACK } from '../../constants/navigation';
import { ADMIN_USERS_QUERY_KEYS } from '../../constants/adminUsersQueryKeys';
import { BATCH_UI } from '../../constants/batchUi';
import { useAuthStore } from '../../store/authStore';
import { mapApiError } from '../../utils/mapApiError';
import { showToast } from '../../utils/toast';
import type { AdminUsersStackParamList } from './AdminUsersStack';

type AdminUsersNav = NativeStackNavigationProp<AdminUsersStackParamList, typeof ADMIN_USERS_STACK.LIST>;

type RoleFilter = 'ALL' | UserRole;

const ROLE_FILTERS: readonly RoleFilter[] = ['ALL', 'SUPERADMIN', 'ADMIN', 'TEACHER', 'STUDENT', 'USER'] as const;

function displayName(u: UserSummary): string {
  const name = (u.name ?? '').trim();
  if (name) return name;
  return u.email;
}

function rolePillColor(role: UserRole): { bg: string; text: string; border: string } {
  switch (role) {
    case 'SUPERADMIN':
    case 'ADMIN':
      return { bg: 'rgba(248, 113, 113, 0.12)', text: '#fecaca', border: 'rgba(248, 113, 113, 0.35)' };
    case 'TEACHER':
      return { bg: 'rgba(34, 211, 238, 0.12)', text: '#67e8f9', border: 'rgba(34, 211, 238, 0.35)' };
    case 'STUDENT':
      return { bg: 'rgba(34, 197, 94, 0.12)', text: '#86efac', border: 'rgba(34, 197, 94, 0.30)' };
    default:
      return { bg: 'rgba(148, 163, 184, 0.10)', text: '#cbd5e1', border: 'rgba(148, 163, 184, 0.22)' };
  }
}

export function AdminUsersListScreen() {
  const navigation = useNavigation<AdminUsersNav>();
  const queryClient = useQueryClient();
  const businessId = useAuthStore((s) => s.business?.id);
  const currentUserId = useAuthStore((s) => s.user?.id ?? null);
  const role = useAuthStore((s) => s.user?.role ?? null);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');
  const [refreshing, setRefreshing] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addMobile, setAddMobile] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addRole, setAddRole] = useState<UserRole>('STUDENT');

  const usersQuery = useQuery({
    queryKey: ADMIN_USERS_QUERY_KEYS.users(businessId ?? 0),
    queryFn: () => getBusinessUsers(businessId!),
    enabled: typeof businessId === 'number',
  });

  const deleteMutation = useMutation({
    mutationFn: (userIdToDelete: number) => deleteUser(userIdToDelete),
    onSuccess: async () => {
      if (typeof businessId === 'number') {
        await queryClient.invalidateQueries({ queryKey: ADMIN_USERS_QUERY_KEYS.users(businessId) });
      }
      showToast('User removed', 'success');
    },
    onError: (e) => {
      showToast(mapApiError(e).message || 'Failed to remove user', 'error');
    },
  });

  const users = usersQuery.data ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users
      .filter((u) => (roleFilter === 'ALL' ? true : u.role === roleFilter))
      .filter((u) => {
        if (!q) return true;
        const n = (u.name ?? '').toLowerCase();
        const e = (u.email ?? '').toLowerCase();
        const r = (u.role ?? '').toLowerCase();
        return n.includes(q) || e.includes(q) || r.includes(q);
      })
      .sort((a, b) => (displayName(a) > displayName(b) ? 1 : -1));
  }, [roleFilter, search, users]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (typeof businessId === 'number') {
        await queryClient.invalidateQueries({ queryKey: ADMIN_USERS_QUERY_KEYS.users(businessId) });
      }
    } catch (e) {
      showToast(mapApiError(e).message || 'Refresh failed', 'error');
    } finally {
      setRefreshing(false);
    }
  }, [businessId, queryClient]);

  const openTeacher = (userId: number) => {
    const u = users.find((x) => x.id === userId);
    navigation.navigate(ADMIN_USERS_STACK.TEACHER_DETAIL, {
      userId,
      user: u ? { id: u.id, email: u.email, name: u.name, mobile: u.mobile } : undefined,
    });
  };

  const confirmDelete = (user: UserSummary) => {
    if (deleteMutation.isPending) return;
    if (currentUserId != null && user.id === currentUserId) {
      showToast('You cannot remove your own account from the app.', 'error');
      return;
    }

    Alert.alert('Remove user', `Remove ${displayName(user)}? They will no longer have access.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => deleteMutation.mutate(user.id),
      },
    ]);
  };

  const renderRow = ({ item }: { item: UserSummary }) => {
    const isTeacher = item.role === 'TEACHER';
    const pill = rolePillColor(item.role);

    return (
      <Pressable
        onPress={() => (isTeacher ? openTeacher(item.id) : undefined)}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed, !isTeacher && styles.cardDisabled]}
      >
        <View style={styles.cardTop}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {displayName(item)}
            </Text>
            <Text style={styles.cardSub} numberOfLines={1}>
              {item.email}
            </Text>
          </View>
          <View style={[styles.rolePill, { backgroundColor: pill.bg, borderColor: pill.border }]}>
            <Text style={[styles.rolePillText, { color: pill.text }]}>{item.role}</Text>
          </View>
        </View>

        <View style={styles.cardActions}>
          {isTeacher ? <Text style={styles.teacherHint}>Open profile</Text> : <Text style={styles.teacherHint}>—</Text>}
          <Pressable
            onPress={() => confirmDelete(item)}
            style={({ pressed }) => [styles.removeBtn, pressed && styles.removeBtnPressed]}
            accessibilityRole="button"
          >
            <Text style={styles.removeBtnText}>Remove</Text>
          </Pressable>
        </View>
      </Pressable>
    );
  };

  const loading = usersQuery.isLoading || usersQuery.isFetching;
  const errorText = usersQuery.error ? mapApiError(usersQuery.error).message : null;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight:
        role === 'ADMIN' || role === 'SUPERADMIN'
          ? () => (
              <Pressable onPress={() => setIsAddOpen(true)} style={({ pressed }) => [styles.headerBtn, pressed && styles.headerBtnPressed]}>
                <Text style={styles.headerBtnText}>Add</Text>
              </Pressable>
            )
          : undefined,
    });
  }, [navigation, role]);

  return (
    <View style={styles.screen}>
      <Modal visible={isAddOpen} animationType="slide" transparent onRequestClose={() => setIsAddOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add user</Text>
            <Text style={styles.modalSub}>Create a user under this business.</Text>

            <Text style={styles.modalLabel}>Name</Text>
            <TextInput value={addName} onChangeText={setAddName} placeholder="Full name" placeholderTextColor={BATCH_UI.TEXT_DIM} style={styles.modalInput} />

            <Text style={styles.modalLabel}>Email</Text>
            <TextInput value={addEmail} onChangeText={setAddEmail} placeholder="email@example.com" autoCapitalize="none" placeholderTextColor={BATCH_UI.TEXT_DIM} style={styles.modalInput} />

            <Text style={styles.modalLabel}>Mobile (optional)</Text>
            <TextInput value={addMobile} onChangeText={setAddMobile} placeholder="9999999999" placeholderTextColor={BATCH_UI.TEXT_DIM} style={styles.modalInput} />

            <Text style={styles.modalLabel}>Password</Text>
            <TextInput value={addPassword} onChangeText={setAddPassword} placeholder="Min 6 characters" secureTextEntry placeholderTextColor={BATCH_UI.TEXT_DIM} style={styles.modalInput} />

            <Text style={styles.modalLabel}>Role</Text>
            <View style={styles.rolePickRow}>
              {(['ADMIN', 'TEACHER', 'STUDENT', 'USER'] as const).map((r) => {
                const on = addRole === r;
                return (
                  <Pressable key={r} onPress={() => setAddRole(r)} style={({ pressed }) => [styles.rolePick, on && styles.rolePickOn, pressed && styles.chipPressed]}>
                    <Text style={[styles.rolePickText, on && styles.rolePickTextOn]}>{r}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.modalFooter}>
              <Pressable onPress={() => setIsAddOpen(false)} style={({ pressed }) => [styles.modalBtn, pressed && styles.chipPressed]}>
                <Text style={styles.modalBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={async () => {
                  if (typeof businessId !== 'number') return;
                  const name = addName.trim();
                  const email = addEmail.trim();
                  const password = addPassword;
                  if (!name || !email || !password) {
                    showToast('Name, email, and password are required', 'error');
                    return;
                  }
                  try {
                    // Lazy import to avoid circular deps in Jest.
                    const { createBusinessUser } = await import('../../api/usersWriteApi');
                    await createBusinessUser(businessId, {
                      name,
                      email,
                      mobile: addMobile.trim() || undefined,
                      password,
                      role: addRole,
                    });
                    setIsAddOpen(false);
                    setAddName('');
                    setAddEmail('');
                    setAddMobile('');
                    setAddPassword('');
                    setAddRole('STUDENT');
                    await queryClient.invalidateQueries({ queryKey: ADMIN_USERS_QUERY_KEYS.users(businessId) });
                    showToast('User created', 'success');
                  } catch (e) {
                    showToast(mapApiError(e).message || 'Failed to create user', 'error');
                  }
                }}
                style={({ pressed }) => [styles.modalBtnPrimary, pressed && styles.chipPressed]}
              >
                <Text style={styles.modalBtnPrimaryText}>Create</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderRow}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BATCH_UI.ACCENT} />}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <Text style={styles.contextLine}>Search users and open a teacher to view their profile.</Text>
            <View style={styles.searchWrap}>
              <Text style={styles.searchIcon}>⌕</Text>
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search users…"
                placeholderTextColor={BATCH_UI.TEXT_DIM}
                style={styles.searchInput}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.filtersRow}>
              <Text style={styles.sectionLabel}>Role</Text>
              <View style={styles.chipsRow}>
                {ROLE_FILTERS.map((r) => {
                  const on = roleFilter === r;
                  return (
                    <Pressable
                      key={r}
                      onPress={() => setRoleFilter(r)}
                      style={({ pressed }) => [styles.chip, on && styles.chipOn, pressed && styles.chipPressed]}
                    >
                      <Text style={[styles.chipText, on && styles.chipTextOn]}>{r === 'ALL' ? 'All' : r}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <Text style={styles.sectionLabel}>Users ({filtered.length})</Text>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={BATCH_UI.ACCENT} />
            </View>
          ) : errorText ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>Could not load users</Text>
              <Text style={styles.emptySub}>{errorText}</Text>
              <Pressable onPress={() => usersQuery.refetch()} style={({ pressed }) => [styles.retryBtn, pressed && styles.retryBtnPressed]}>
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </View>
          ) : users.length > 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>No matches</Text>
              <Text style={styles.emptySub}>Try another search term or role filter.</Text>
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>No users found</Text>
              <Text style={styles.emptySub}>Users in your business will appear here.</Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BATCH_UI.BG,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
    flexGrow: 1,
  },
  contextLine: {
    color: BATCH_UI.TEXT_MUTED,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  sectionLabel: {
    color: BATCH_UI.TEXT_DIM,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER,
    backgroundColor: BATCH_UI.CARD,
    borderRadius: 14,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  searchIcon: {
    color: BATCH_UI.TEXT_DIM,
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    color: BATCH_UI.TEXT,
    fontSize: 15,
  },
  filtersRow: {
    marginBottom: 14,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER,
    backgroundColor: BATCH_UI.CARD,
  },
  chipOn: {
    borderColor: 'rgba(34, 211, 238, 0.35)',
    backgroundColor: 'rgba(34, 211, 238, 0.12)',
  },
  chipPressed: {
    opacity: 0.92,
  },
  chipText: {
    color: BATCH_UI.TEXT_MUTED,
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.2,
  },
  chipTextOn: {
    color: '#67e8f9',
  },
  card: {
    backgroundColor: BATCH_UI.CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER,
    padding: 16,
    marginBottom: 8,
  },
  cardDisabled: {
    opacity: 0.97,
  },
  cardPressed: {
    backgroundColor: BATCH_UI.CARD_HOVER,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  cardTitle: {
    color: BATCH_UI.TEXT,
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: -0.2,
  },
  cardSub: {
    color: BATCH_UI.TEXT_MUTED,
    marginTop: 6,
    fontSize: 13,
  },
  rolePill: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  rolePillText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  cardActions: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  teacherHint: {
    color: BATCH_UI.TEXT_DIM,
    fontSize: 12,
    fontWeight: '800',
  },
  removeBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.35)',
    backgroundColor: 'rgba(248, 113, 113, 0.10)',
  },
  removeBtnPressed: {
    opacity: 0.9,
  },
  removeBtnText: {
    color: '#fecaca',
    fontWeight: '900',
  },
  center: {
    padding: 24,
    alignItems: 'center',
  },
  emptyWrap: {
    paddingVertical: 24,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  emptyTitle: {
    color: BATCH_UI.TEXT,
    fontWeight: '700',
    fontSize: 16,
    textAlign: 'center',
  },
  emptySub: {
    color: BATCH_UI.TEXT_MUTED,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
    fontSize: 14,
  },
  retryBtn: {
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER_STRONG,
    backgroundColor: BATCH_UI.BG_ELEVATED,
  },
  retryBtnPressed: {
    opacity: 0.9,
  },
  retryText: {
    color: BATCH_UI.TEXT,
    fontWeight: '800',
  },
  headerBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER_STRONG,
    backgroundColor: BATCH_UI.BG_ELEVATED,
  },
  headerBtnPressed: { opacity: 0.9 },
  headerBtnText: { color: BATCH_UI.TEXT, fontWeight: '900' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    padding: 16,
    justifyContent: 'center',
  },
  modalCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER,
    backgroundColor: BATCH_UI.CARD,
    padding: 16,
  },
  modalTitle: { color: BATCH_UI.TEXT, fontSize: 18, fontWeight: '900' },
  modalSub: { color: BATCH_UI.TEXT_MUTED, marginTop: 6, marginBottom: 12, lineHeight: 20 },
  modalLabel: { color: BATCH_UI.TEXT_DIM, fontWeight: '900', fontSize: 11, letterSpacing: 1, marginTop: 10, textTransform: 'uppercase' },
  modalInput: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER,
    borderRadius: 14,
    backgroundColor: BATCH_UI.BG_ELEVATED,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: BATCH_UI.TEXT,
  },
  rolePickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  rolePick: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER,
    backgroundColor: BATCH_UI.BG_ELEVATED,
  },
  rolePickOn: { borderColor: 'rgba(34, 211, 238, 0.35)', backgroundColor: 'rgba(34, 211, 238, 0.12)' },
  rolePickText: { color: BATCH_UI.TEXT_MUTED, fontWeight: '900', fontSize: 12 },
  rolePickTextOn: { color: '#67e8f9' },
  modalFooter: { flexDirection: 'row', gap: 10, marginTop: 16, justifyContent: 'flex-end' },
  modalBtn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER_STRONG,
    backgroundColor: BATCH_UI.BG_ELEVATED,
  },
  modalBtnText: { color: BATCH_UI.TEXT, fontWeight: '900' },
  modalBtnPrimary: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: BATCH_UI.PRIMARY_BTN,
    borderWidth: 1,
    borderColor: BATCH_UI.PRIMARY_BTN_BORDER,
  },
  modalBtnPrimaryText: { color: '#fff', fontWeight: '900' },
});

