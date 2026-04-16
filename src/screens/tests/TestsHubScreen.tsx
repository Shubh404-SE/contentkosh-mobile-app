import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { useRole } from '../../hooks/useRole';
import { BATCH_UI } from '../../constants/batchUi';
import { TESTS_QUERY_KEYS } from '../../constants/testsQueryKeys';
import { listPracticeTests } from '../../api/practiceTestsApi';
import { listExamTests } from '../../api/examTestsApi';
import { listAvailablePracticeTests, startPracticeAttempt } from '../../api/practiceTestsApi';
import { listAvailableExamTests, startExamAttempt } from '../../api/examTestsApi';
import { getAllBatches } from '../../api/batchesApi';
import type { PracticeAvailableTest, PracticeTest, ExamAvailableTest, ExamTest, TestStatus } from '../../types/tests';
import type { BatchRecord } from '../../types/batch';
import { mapApiError } from '../../utils/mapApiError';
import { showToast } from '../../utils/toast';
import { TESTS_STACK } from '../../constants/navigation';
import type { TestsStackParamList } from './TestsStack';

type Nav = NativeStackNavigationProp<TestsStackParamList, typeof TESTS_STACK.HUB>;

type TestKind = 'PRACTICE' | 'EXAM';
type StatusFilter = 'ALL' | 'DRAFT' | 'PUBLISHED';

function statusToApi(filter: StatusFilter): TestStatus | undefined {
  if (filter === 'DRAFT') return 0;
  if (filter === 'PUBLISHED') return 1;
  return undefined;
}

function statusLabel(s: TestStatus): string {
  return s === 1 ? 'Published' : 'Draft';
}

function batchTitle(b: BatchRecord): string {
  return b.displayName || b.codeName || `Batch #${b.id}`;
}

export function TestsHubScreen() {
  const navigation = useNavigation<Nav>();
  const businessId = useAuthStore((s) => s.business?.id);
  const role = useRole();
  const queryClient = useQueryClient();

  const isTeacherOrAdmin = role === 'ADMIN' || role === 'TEACHER' || role === 'SUPERADMIN';
  const isStudent = role === 'STUDENT';

  const [kind, setKind] = useState<TestKind>('PRACTICE');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [startingTestId, setStartingTestId] = useState<string | null>(null);

  useEffect(() => {
    navigation.setOptions({
      headerRight: isTeacherOrAdmin
        ? () => (
            <Pressable
              onPress={() => navigation.navigate(TESTS_STACK.CREATE_TEST)}
              style={({ pressed }) => [styles.headerBtn, pressed && styles.headerBtnPressed]}
            >
              <Text style={styles.headerBtnText}>Create</Text>
            </Pressable>
          )
        : undefined,
    });
  }, [isTeacherOrAdmin, navigation]);

  const batchesQuery = useQuery({
    queryKey: ['tests', 'batches'],
    queryFn: () => getAllBatches('course'),
    enabled: isTeacherOrAdmin,
  });

  const apiStatus = statusToApi(statusFilter);

  const practiceQuery = useQuery({
    queryKey: TESTS_QUERY_KEYS.practiceList(businessId ?? 0, { status: apiStatus, batchId: selectedBatchId ?? undefined }),
    queryFn: () =>
      listPracticeTests({
        businessId: businessId!,
        status: apiStatus,
        batchId: selectedBatchId ?? undefined,
      }),
    enabled: isTeacherOrAdmin && typeof businessId === 'number',
  });

  const examQuery = useQuery({
    queryKey: TESTS_QUERY_KEYS.examList(businessId ?? 0, { status: apiStatus, batchId: selectedBatchId ?? undefined }),
    queryFn: () =>
      listExamTests({
        businessId: businessId!,
        status: apiStatus,
        batchId: selectedBatchId ?? undefined,
      }),
    enabled: isTeacherOrAdmin && typeof businessId === 'number',
  });

  const teacherLoading = batchesQuery.isLoading || practiceQuery.isLoading || examQuery.isLoading;
  const activeError =
    (kind === 'PRACTICE' ? practiceQuery.error : examQuery.error) || batchesQuery.error || null;
  const errorText = activeError ? mapApiError(activeError).message : null;

  const tests = useMemo(() => {
    if (kind === 'PRACTICE') return practiceQuery.data ?? [];
    return examQuery.data ?? [];
  }, [examQuery.data, kind, practiceQuery.data]);

  const availablePracticeQuery = useQuery({
    queryKey: ['tests', 'practice', 'available', businessId ?? 0],
    queryFn: () => listAvailablePracticeTests({ businessId: businessId! }),
    enabled: isStudent && typeof businessId === 'number',
  });

  const availableExamQuery = useQuery({
    queryKey: ['tests', 'exam', 'available', businessId ?? 0],
    queryFn: () => listAvailableExamTests({ businessId: businessId! }),
    enabled: isStudent && typeof businessId === 'number',
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (typeof businessId !== 'number') return;
      await queryClient.invalidateQueries({ queryKey: ['tests'] });
      await queryClient.invalidateQueries({ queryKey: ['batches', 'all'] });
    } catch (e) {
      showToast(mapApiError(e).message || 'Refresh failed', 'error');
    } finally {
      setRefreshing(false);
    }
  }, [businessId, queryClient]);

  const openPractice = (id: string) => navigation.navigate(TESTS_STACK.PRACTICE_DETAIL, { practiceTestId: id });
  const openExam = (id: string) => navigation.navigate(TESTS_STACK.EXAM_DETAIL, { examTestId: id });

  const batchChips = isTeacherOrAdmin && (batchesQuery.data ?? []).length > 0 && (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
      <Pressable
        onPress={() => setSelectedBatchId(null)}
        style={[styles.chip, selectedBatchId == null && styles.chipOn]}
      >
        <Text style={[styles.chipText, selectedBatchId == null && styles.chipTextOn]} numberOfLines={1}>
          All batches
        </Text>
      </Pressable>
      {(batchesQuery.data ?? []).map((b) => {
        if (typeof b.id !== 'number') return null;
        const on = selectedBatchId === b.id;
        return (
          <Pressable key={b.id} onPress={() => setSelectedBatchId(b.id!)} style={[styles.chip, on && styles.chipOn]}>
            <Text style={[styles.chipText, on && styles.chipTextOn]} numberOfLines={1}>
              {batchTitle(b)}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );

  const kindChips = (
    <View style={styles.segmentRow}>
      <Pressable onPress={() => setKind('PRACTICE')} style={[styles.segment, kind === 'PRACTICE' && styles.segmentOn]}>
        <Text style={[styles.segmentText, kind === 'PRACTICE' && styles.segmentTextOn]}>Practice</Text>
      </Pressable>
      <Pressable onPress={() => setKind('EXAM')} style={[styles.segment, kind === 'EXAM' && styles.segmentOn]}>
        <Text style={[styles.segmentText, kind === 'EXAM' && styles.segmentTextOn]}>Exam</Text>
      </Pressable>
    </View>
  );

  const statusChips = (
    <View style={styles.segmentRow}>
      {(['ALL', 'DRAFT', 'PUBLISHED'] as const).map((s) => {
        const on = statusFilter === s;
        const label = s === 'ALL' ? 'All' : s === 'DRAFT' ? 'Draft' : 'Published';
        return (
          <Pressable key={s} onPress={() => setStatusFilter(s)} style={[styles.segment, on && styles.segmentOn]}>
            <Text style={[styles.segmentText, on && styles.segmentTextOn]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  const renderItem = ({ item }: { item: PracticeTest | ExamTest }) => {
    const badgeOn = (item.status ?? 0) === 1;
    const badgeStyle = badgeOn ? styles.badgeOn : styles.badgeOff;
    const badgeTextStyle = badgeOn ? styles.badgeTextOn : styles.badgeTextOff;
    const subtitle = item.batchName ?? '';

    return (
      <Pressable
        onPress={() => (kind === 'PRACTICE' ? openPractice(item.id) : openExam(item.id))}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      >
        <View style={styles.cardTop}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.chev}>›</Text>
        </View>
        {subtitle ? (
          <Text style={styles.cardSub} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        <View style={styles.cardMetaRow}>
          <View style={[styles.badge, badgeStyle]}>
            <Text style={[styles.badgeText, badgeTextStyle]}>{statusLabel(item.status)}</Text>
          </View>
          {item.totalQuestions != null ? (
            <Text style={styles.metaText}>{item.totalQuestions} Q</Text>
          ) : (
            <Text style={styles.metaText}>— Q</Text>
          )}
          {item.totalMarks != null ? <Text style={styles.metaText}>{item.totalMarks} marks</Text> : null}
        </View>
      </Pressable>
    );
  };

  const studentTests = useMemo(() => {
    if (!isStudent) return [];
    if (kind === 'PRACTICE') return (availablePracticeQuery.data ?? []) as Array<PracticeAvailableTest | ExamAvailableTest>;
    return (availableExamQuery.data ?? []) as Array<PracticeAvailableTest | ExamAvailableTest>;
  }, [availableExamQuery.data, availablePracticeQuery.data, isStudent, kind]);

  const startStudentAttempt = async (test: PracticeAvailableTest | ExamAvailableTest) => {
    if (typeof businessId !== 'number') return;
    if (startingTestId) return;
    setStartingTestId(test.id);
    try {
      if (kind === 'PRACTICE') {
        const res = await startPracticeAttempt({ businessId, practiceTestId: test.id, language: 'en' });
        navigation.navigate(TESTS_STACK.PRACTICE_ATTEMPT, {
          attemptId: res.attemptId,
          startedAt: res.startedAt,
          testId: test.id,
          testName: test.name,
          durationMinutes: undefined,
          questions: res.questions,
        });
      } else {
        const t = test as ExamAvailableTest;
        const res = await startExamAttempt({ businessId, examTestId: test.id, language: 'en' });
        navigation.navigate(TESTS_STACK.EXAM_ATTEMPT, {
          attemptId: res.attemptId,
          startedAt: res.startedAt,
          testId: test.id,
          testName: test.name,
          durationMinutes: t.durationMinutes,
          questions: res.questions,
        });
      }
    } catch (e) {
      showToast(mapApiError(e).message || 'Could not start attempt', 'error');
    } finally {
      setStartingTestId(null);
    }
  };

  const openStudentResult = (attemptId: string) => {
    navigation.navigate(TESTS_STACK.TEST_RESULT, { kind: kind === 'PRACTICE' ? 'practice' : 'exam', attemptId });
  };

  const renderStudentItem = ({ item }: { item: PracticeAvailableTest | ExamAvailableTest }) => {
    const subtitle = item.batchName ?? '';
    const canAttempt = item.canAttempt !== false;
    const hasAttemptId = Boolean(item.attemptId);
    const isStarting = startingTestId === item.id;
    const actionLabel = canAttempt ? (isStarting ? 'Starting…' : 'Start') : hasAttemptId ? 'View result' : 'Locked';

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.name}
          </Text>
        </View>
        {subtitle ? (
          <Text style={styles.cardSub} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        <View style={styles.cardMetaRow}>
          {'totalQuestions' in item && item.totalQuestions != null ? (
            <Text style={styles.metaText}>{item.totalQuestions} Q</Text>
          ) : null}
          {'durationMinutes' in item && item.durationMinutes ? (
            <Text style={styles.metaText}>{item.durationMinutes} min</Text>
          ) : null}
          {item.totalMarks != null ? <Text style={styles.metaText}>{item.totalMarks} marks</Text> : null}
        </View>

        <Pressable
          onPress={() => {
            if (!canAttempt) {
              if (item.attemptId) openStudentResult(item.attemptId);
              return;
            }
            startStudentAttempt(item);
          }}
          style={({ pressed }) => [
            styles.primaryBtn,
            pressed && styles.primaryBtnPressed,
            (!canAttempt || isStarting) && styles.primaryBtnDisabled,
          ]}
          disabled={!canAttempt || isStarting}
        >
          <Text style={styles.primaryBtnText}>{actionLabel}</Text>
        </Pressable>
      </View>
    );
  };

  const header = (
    <View>
      <Text style={styles.contextLine}>
        {isStudent ? 'Start a new attempt or view your result.' : 'Manage practice and exam tests. Filter by status or batch.'}
      </Text>
      {kindChips}
      {isStudent ? null : statusChips}
      {isStudent ? null : batchChips}
      <Text style={styles.sectionLabel}>{kind === 'PRACTICE' ? 'Practice tests' : 'Exam tests'}</Text>
    </View>
  );

  if (isStudent) {
    const studentLoading = availablePracticeQuery.isLoading || availableExamQuery.isLoading;
    const activeStudentError = (kind === 'PRACTICE' ? availablePracticeQuery.error : availableExamQuery.error) ?? null;
    const studentErrorText = activeStudentError ? mapApiError(activeStudentError).message : null;

    return (
      <View style={styles.screen}>
        <FlatList
          data={studentTests as Array<PracticeAvailableTest | ExamAvailableTest>}
          keyExtractor={(item) => item.id}
          renderItem={renderStudentItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BATCH_UI.ACCENT} />}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={header}
          ListEmptyComponent={
            studentLoading ? (
              <View style={styles.center}>
                <ActivityIndicator color={BATCH_UI.ACCENT} />
              </View>
            ) : studentErrorText ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyTitle}>Could not load tests</Text>
                <Text style={styles.emptySub}>{studentErrorText}</Text>
                <Pressable
                  onPress={() => (kind === 'PRACTICE' ? availablePracticeQuery.refetch() : availableExamQuery.refetch())}
                  style={({ pressed }) => [styles.retryBtn, pressed && styles.retryBtnPressed]}
                >
                  <Text style={styles.retryText}>Retry</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyTitle}>No tests</Text>
                <Text style={styles.emptySub}>No available tests right now.</Text>
              </View>
            )
          }
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={tests as Array<PracticeTest | ExamTest>}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BATCH_UI.ACCENT} />}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={header}
        ListEmptyComponent={
          teacherLoading ? (
            <View style={styles.center}>
              <ActivityIndicator color={BATCH_UI.ACCENT} />
            </View>
          ) : errorText ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>Could not load tests</Text>
              <Text style={styles.emptySub}>{errorText}</Text>
              <Pressable
                onPress={() => (kind === 'PRACTICE' ? practiceQuery.refetch() : examQuery.refetch())}
                style={({ pressed }) => [styles.retryBtn, pressed && styles.retryBtnPressed]}
              >
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>No tests</Text>
              <Text style={styles.emptySub}>Try changing filters or create a test on web.</Text>
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
  segmentRow: {
    flexDirection: 'row',
    backgroundColor: BATCH_UI.BG_ELEVATED,
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 10,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentOn: {
    backgroundColor: BATCH_UI.ACCENT_DIM,
  },
  segmentText: {
    color: BATCH_UI.TEXT_MUTED,
    fontWeight: '800',
    fontSize: 13,
  },
  segmentTextOn: {
    color: BATCH_UI.TEXT,
  },
  chipScroll: {
    marginBottom: 14,
    maxHeight: 44,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER,
    backgroundColor: BATCH_UI.CARD,
    marginRight: 8,
    maxWidth: 220,
  },
  chipOn: {
    borderColor: BATCH_UI.ACCENT,
    backgroundColor: BATCH_UI.ACCENT_DIM,
  },
  chipText: {
    color: BATCH_UI.TEXT_MUTED,
    fontWeight: '700',
    fontSize: 13,
  },
  chipTextOn: {
    color: BATCH_UI.TEXT,
  },
  sectionLabel: {
    color: BATCH_UI.TEXT_DIM,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
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
    fontWeight: '900',
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
  cardMetaRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeOn: {
    borderColor: BATCH_UI.EMERALD,
    backgroundColor: BATCH_UI.EMERALD_DIM,
  },
  badgeOff: {
    borderColor: BATCH_UI.BORDER_STRONG,
    backgroundColor: BATCH_UI.BG_ELEVATED,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '900',
  },
  badgeTextOn: {
    color: BATCH_UI.EMERALD,
  },
  badgeTextOff: {
    color: BATCH_UI.TEXT_MUTED,
  },
  metaText: {
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
  primaryBtn: {
    marginTop: 14,
    backgroundColor: BATCH_UI.PRIMARY_BTN,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BATCH_UI.PRIMARY_BTN_BORDER,
  },
  primaryBtnPressed: {
    opacity: 0.9,
  },
  primaryBtnDisabled: {
    opacity: 0.7,
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 15,
  },
  headerBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER_STRONG,
    backgroundColor: BATCH_UI.BG_ELEVATED,
  },
  headerBtnPressed: {
    opacity: 0.9,
  },
  headerBtnText: {
    color: BATCH_UI.TEXT,
    fontWeight: '900',
  },
});

