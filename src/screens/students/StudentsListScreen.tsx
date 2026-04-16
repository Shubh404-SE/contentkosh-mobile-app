import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getBusinessUsers } from '../../api/usersApi';
import { useAuthStore } from '../../store/authStore';
import { STUDENTS_QUERY_KEYS } from '../../constants/studentsQueryKeys';
import type { User } from '../../api/apiTypes';
import { mapApiError } from '../../utils/mapApiError';
import { showToast } from '../../utils/toast';
import { BATCH_UI } from '../../constants/batchUi';
import { STUDENTS_STACK } from '../../constants/navigation';
import type { StudentsStackParamList } from './StudentsStack';

type StudentsNav = NativeStackNavigationProp<StudentsStackParamList, typeof STUDENTS_STACK.LIST>;

function displayName(u: User): string {
  const name = (u.name ?? '').trim();
  if (name) return name;
  return u.email;
}

export function StudentsListScreen() {
  const navigation = useNavigation<StudentsNav>();
  const businessId = useAuthStore((s) => s.business?.id);
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const studentsQuery = useQuery({
    queryKey: STUDENTS_QUERY_KEYS.students(businessId ?? 0),
    queryFn: () => getBusinessUsers(businessId!, 'STUDENT'),
    enabled: typeof businessId === 'number',
  });

  const students = studentsQuery.data ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => {
      const n = (s.name ?? '').toLowerCase();
      const e = (s.email ?? '').toLowerCase();
      return n.includes(q) || e.includes(q);
    });
  }, [search, students]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (typeof businessId === 'number') {
        await queryClient.invalidateQueries({ queryKey: STUDENTS_QUERY_KEYS.students(businessId) });
      }
    } catch (e) {
      showToast(mapApiError(e).message || 'Refresh failed', 'error');
    } finally {
      setRefreshing(false);
    }
  }, [businessId, queryClient]);

  const openStudent = (studentId: number) => {
    navigation.navigate(STUDENTS_STACK.DETAIL, { studentId });
  };

  const renderRow = ({ item }: { item: User }) => {
    return (
      <Pressable
        onPress={() => openStudent(item.id)}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      >
        <View style={styles.cardTop}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {displayName(item)}
          </Text>
          <Text style={styles.chev}>›</Text>
        </View>
        <Text style={styles.cardSub} numberOfLines={1}>
          {item.email}
        </Text>
      </Pressable>
    );
  };

  const loading = studentsQuery.isLoading || studentsQuery.isFetching;
  const errorText = studentsQuery.error ? mapApiError(studentsQuery.error).message : null;

  return (
    <View style={styles.screen}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderRow}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BATCH_UI.ACCENT} />}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <Text style={styles.contextLine}>Search and open a student to view details and batch enrollment.</Text>
            <View style={styles.searchWrap}>
              <Text style={styles.searchIcon}>⌕</Text>
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search students…"
                placeholderTextColor={BATCH_UI.TEXT_DIM}
                style={styles.searchInput}
                autoCapitalize="none"
              />
            </View>
            <Text style={styles.sectionLabel}>Students</Text>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={BATCH_UI.ACCENT} />
            </View>
          ) : errorText ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>Could not load students</Text>
              <Text style={styles.emptySub}>{errorText}</Text>
              <Pressable
                onPress={() => studentsQuery.refetch()}
                style={({ pressed }) => [styles.retryBtn, pressed && styles.retryBtnPressed]}
              >
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </View>
          ) : students.length > 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>No matches</Text>
              <Text style={styles.emptySub}>Try another search term.</Text>
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>No students found</Text>
              <Text style={styles.emptySub}>When students join your business, they will appear here.</Text>
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
  card: {
    backgroundColor: BATCH_UI.CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER,
    padding: 16,
    marginBottom: 8,
  },
  cardPressed: {
    backgroundColor: BATCH_UI.CARD_HOVER,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: {
    color: BATCH_UI.TEXT,
    fontWeight: '800',
    fontSize: 16,
    flex: 1,
    letterSpacing: -0.2,
  },
  cardSub: {
    color: BATCH_UI.TEXT_MUTED,
    marginTop: 6,
    fontSize: 13,
  },
  chev: {
    color: BATCH_UI.TEXT_DIM,
    fontSize: 22,
    fontWeight: '300',
    marginTop: -2,
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
});

