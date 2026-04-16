import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getAllBatches, getBatchesByCourse } from '../../api/batchesApi';
import { getBusinessExams } from '../../api/examsApi';
import { getDashboard } from '../../api/dashboardApi';
import { useAuthStore } from '../../store/authStore';
import { useRole } from '../../hooks/useRole';
import { mapApiError } from '../../utils/mapApiError';
import { showToast } from '../../utils/toast';
import { BATCH_QUERY_KEYS } from '../../constants/batchQueryKeys';
import { BATCH_UI } from '../../constants/batchUi';
import { DASHBOARD_QUERY_KEY } from '../../constants/dashboardQueryKeys';
import { BATCHES_STACK, ROUTES } from '../../constants/navigation';
import type { BatchesStackParamList } from './BatchesStack';
import type { BatchRecord, CourseOption } from '../../types/batch';

type BatchesHubNav = NativeStackNavigationProp<BatchesStackParamList, typeof BATCHES_STACK.HUB>;

function flattenCoursesFromExams(businessId: number) {
  return getBusinessExams(businessId, 'courses').then((res) => {
    const exams = res.data ?? [];
    const options: CourseOption[] = [];
    for (const exam of exams) {
      const examCourses = exam.courses ?? [];
      for (const c of examCourses) {
        if (c.id == null) continue;
        options.push({
          id: c.id,
          name: c.name ?? `Course ${c.id}`,
          examId: exam.id,
          examName: exam.name,
        });
      }
    }
    options.sort((a, b) => b.id - a.id);
    return options;
  });
}

function batchTitle(b: BatchRecord): string {
  return b.displayName || b.codeName || `Batch #${b.id}`;
}

function memberCount(b: BatchRecord): number {
  return b.batchUsers?.length ?? 0;
}

export function BatchesHubScreen() {
  const navigation = useNavigation<BatchesHubNav>();
  const business = useAuthStore((s) => s.business);
  const role = useRole();
  const queryClient = useQueryClient();
  const isAdmin = role === 'ADMIN';
  const isTeacher = role === 'TEACHER';
  const isStudent = role === 'STUDENT';

  const [search, setSearch] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const businessId = business?.id;

  const coursesQuery = useQuery({
    queryKey: BATCH_QUERY_KEYS.courses(businessId ?? 0),
    queryFn: () => flattenCoursesFromExams(businessId!),
    enabled: isAdmin && typeof businessId === 'number',
  });

  useEffect(() => {
    if (!isAdmin || !coursesQuery.data || coursesQuery.data.length === 0) return;
    setSelectedCourseId((prev) => {
      if (prev != null && coursesQuery.data!.some((c) => c.id === prev)) return prev;
      return coursesQuery.data![0]!.id;
    });
  }, [isAdmin, coursesQuery.data]);

  const dashboardQuery = useQuery({
    queryKey: DASHBOARD_QUERY_KEY,
    queryFn: getDashboard,
  });

  const nonAdminBatchesQuery = useQuery({
    queryKey: BATCH_QUERY_KEYS.allWithCourse,
    queryFn: () => getAllBatches('course'),
    enabled: !isAdmin && role != null && role !== 'USER',
  });

  const adminBatchesQuery = useQuery({
    queryKey: BATCH_QUERY_KEYS.byCourse(selectedCourseId ?? 0, 'batchUsers'),
    queryFn: () => getBatchesByCourse(selectedCourseId!, { include: 'batchUsers' }),
    enabled: isAdmin && selectedCourseId != null,
  });

  const loading = isAdmin
    ? coursesQuery.isLoading || adminBatchesQuery.isLoading
    : nonAdminBatchesQuery.isLoading;

  const batches = useMemo(() => {
    if (isAdmin) return adminBatchesQuery.data ?? [];
    return nonAdminBatchesQuery.data ?? [];
  }, [adminBatchesQuery.data, isAdmin, nonAdminBatchesQuery.data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return batches;
    return batches.filter((b) => {
      const title = batchTitle(b).toLowerCase();
      const code = (b.codeName ?? '').toLowerCase();
      const course = (b.course?.name ?? '').toLowerCase();
      return title.includes(q) || code.includes(q) || course.includes(q);
    });
  }, [batches, search]);

  const myBatchesFromDashboard = useMemo(() => {
    const d = dashboardQuery.data as { myBatches?: Array<{ id?: number }> } | undefined;
    return new Set((d?.myBatches ?? []).map((x) => x.id).filter((id): id is number => typeof id === 'number'));
  }, [dashboardQuery.data]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });
      if (isAdmin) {
        await queryClient.invalidateQueries({ queryKey: ['batches', 'courses'] });
        if (selectedCourseId != null) {
          await queryClient.invalidateQueries({ queryKey: BATCH_QUERY_KEYS.byCourse(selectedCourseId, 'batchUsers') });
        }
      } else {
        await queryClient.invalidateQueries({ queryKey: BATCH_QUERY_KEYS.allWithCourse });
      }
    } catch (e) {
      showToast(mapApiError(e).message || 'Refresh failed', 'error');
    } finally {
      setRefreshing(false);
    }
  }, [isAdmin, queryClient, selectedCourseId]);

  /** One line under the nav header — no repeat of “Batches” (title is only in the stack header). */
  const contextLine = isAdmin
    ? 'Pick a course, then open or create a batch.'
    : isTeacher
      ? 'Classes you teach — use the bottom tabs for full Tests and Content libraries.'
      : isStudent
        ? 'Your enrollments — open Tests or Content from the tab bar anytime.'
        : '';

  const emptyPrimary = isAdmin
    ? 'No batches for this course yet.'
    : isTeacher
      ? 'You are not assigned to any batch yet.'
      : isStudent
        ? 'You are not enrolled in a batch yet.'
        : 'No batches available.';

  const emptySecondary = isAdmin
    ? 'Create a batch or choose another course above.'
    : 'When your administrator adds you to a class, it will appear here.';

  const openBatch = (batchId: number) => {
    navigation.navigate(BATCHES_STACK.DETAIL, { batchId });
  };

  const goTestsTab = () => {
    navigation.getParent()?.navigate(ROUTES.TABS.TESTS);
  };

  const goContentTab = () => {
    navigation.getParent()?.navigate(ROUTES.TABS.CONTENT);
  };

  const renderBatch = ({ item }: { item: BatchRecord }) => {
    const id = item.id;
    if (typeof id !== 'number') return null;
    const subtitle = item.course?.name ?? '';
    const highlight = !isAdmin && myBatchesFromDashboard.has(id);
    return (
      <Pressable
        onPress={() => openBatch(id)}
        style={({ pressed }) => [
          styles.card,
          highlight && styles.cardHighlight,
          pressed && styles.cardPressed,
        ]}
      >
        <View style={styles.cardTop}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {batchTitle(item)}
          </Text>
          <Text style={styles.cardChevron}>›</Text>
        </View>
        {subtitle ? (
          <Text style={styles.cardSub} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        <View style={styles.cardFooter}>
          <View style={styles.pill}>
            <Text style={styles.pillText}>
              {isAdmin ? `${memberCount(item)} students` : item.isActive === false ? 'Inactive' : 'Active'}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  const coursePicker = isAdmin && coursesQuery.data && coursesQuery.data.length > 0 && (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.courseScroll}>
      {coursesQuery.data.map((c) => {
        const on = c.id === selectedCourseId;
        return (
          <Pressable
            key={c.id}
            onPress={() => setSelectedCourseId(c.id)}
            style={[styles.courseChip, on && styles.courseChipOn]}
          >
            <Text style={[styles.courseChipText, on && styles.courseChipTextOn]} numberOfLines={1}>
              {c.name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );

  const showQuickLinks = isTeacher || isStudent;

  return (
    <View style={styles.screen}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderBatch}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BATCH_UI.ACCENT} />}
        ListHeaderComponent={
          <View>
            {contextLine ? <Text style={styles.contextLine}>{contextLine}</Text> : null}

            {showQuickLinks ? (
              <View style={styles.quickRow}>
                <Text style={styles.quickLabel}>Jump</Text>
                <Pressable onPress={goTestsTab} style={styles.quickLink}>
                  <Text style={styles.quickLinkText}>Tests</Text>
                </Pressable>
                <Text style={styles.quickDot}>·</Text>
                <Pressable onPress={goContentTab} style={styles.quickLink}>
                  <Text style={styles.quickLinkText}>Content</Text>
                </Pressable>
              </View>
            ) : null}

            <View style={styles.searchWrap}>
              <Text style={styles.searchIcon}>⌕</Text>
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search batches…"
                placeholderTextColor={BATCH_UI.TEXT_DIM}
                style={styles.searchInput}
              />
            </View>

            {coursePicker}

            {isAdmin && coursesQuery.data?.length === 0 && !coursesQuery.isLoading ? (
              <Text style={styles.warn}>No courses yet. Add a course under Exams first.</Text>
            ) : null}

            {isAdmin ? (
              <Pressable
                onPress={() =>
                  navigation.navigate(BATCHES_STACK.FORM, { mode: 'create', courseId: selectedCourseId ?? undefined })
                }
                style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
              >
                <Text style={styles.primaryBtnPlus}>＋</Text>
                <Text style={styles.primaryBtnText}>New batch</Text>
              </Pressable>
            ) : null}

            <Text style={styles.sectionLabel}>All batches</Text>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={BATCH_UI.ACCENT} />
            </View>
          ) : batches.length > 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>No matches</Text>
              <Text style={styles.emptySub}>Try another search term.</Text>
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>{emptyPrimary}</Text>
              <Text style={styles.emptySub}>{emptySecondary}</Text>
            </View>
          )
        }
        contentContainerStyle={styles.listContent}
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
  quickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 6,
  },
  quickLabel: {
    color: BATCH_UI.TEXT_DIM,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginRight: 4,
  },
  quickLink: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  quickLinkText: {
    color: BATCH_UI.ACCENT,
    fontSize: 15,
    fontWeight: '700',
  },
  quickDot: {
    color: BATCH_UI.TEXT_DIM,
    fontSize: 12,
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
  courseScroll: {
    marginBottom: 14,
    maxHeight: 44,
  },
  courseChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER,
    backgroundColor: BATCH_UI.CARD,
    marginRight: 8,
    maxWidth: 220,
  },
  courseChipOn: {
    borderColor: BATCH_UI.ACCENT,
    backgroundColor: BATCH_UI.ACCENT_DIM,
  },
  courseChipText: {
    color: BATCH_UI.TEXT_MUTED,
    fontWeight: '600',
    fontSize: 13,
  },
  courseChipTextOn: {
    color: BATCH_UI.TEXT,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: BATCH_UI.PRIMARY_BTN,
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: BATCH_UI.PRIMARY_BTN_BORDER,
  },
  primaryBtnPressed: {
    opacity: 0.88,
  },
  primaryBtnPlus: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
  sectionLabel: {
    color: BATCH_UI.TEXT_DIM,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  warn: {
    color: '#fbbf24',
    marginBottom: 12,
    fontSize: 13,
  },
  card: {
    backgroundColor: BATCH_UI.CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER,
    padding: 16,
    marginBottom: 8,
  },
  cardHighlight: {
    borderColor: BATCH_UI.ACCENT,
    backgroundColor: BATCH_UI.ACCENT_DIM,
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
    fontSize: 17,
    flex: 1,
    letterSpacing: -0.2,
  },
  cardChevron: {
    color: BATCH_UI.TEXT_DIM,
    fontSize: 22,
    fontWeight: '300',
    marginTop: -2,
  },
  cardSub: {
    color: BATCH_UI.TEXT_MUTED,
    marginTop: 6,
    fontSize: 13,
  },
  cardFooter: {
    marginTop: 12,
    flexDirection: 'row',
  },
  pill: {
    backgroundColor: BATCH_UI.BG_ELEVATED,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER,
  },
  pillText: {
    color: BATCH_UI.TEXT_MUTED,
    fontSize: 12,
    fontWeight: '700',
  },
  center: {
    padding: 24,
    alignItems: 'center',
  },
  emptyWrap: {
    paddingVertical: 24,
    paddingHorizontal: 8,
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
});
