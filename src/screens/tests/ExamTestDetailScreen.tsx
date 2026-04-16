import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BATCH_UI } from '../../constants/batchUi';
import type { TestsStackParamList } from './TestsStack';
import { useAuthStore } from '../../store/authStore';
import { exportExamAnalyticsCsv, getExamTest, listExamQuestions, updateExamTest } from '../../api/examTestsApi';
import type { TestQuestion } from '../../types/testQuestions';
import { QUESTION_TYPE_LABEL } from '../../types/testQuestions';
import { mapApiError } from '../../utils/mapApiError';
import { showToast } from '../../utils/toast';
import { TESTS_STACK } from '../../constants/navigation';
import { useRole } from '../../hooks/useRole';
import { shareTextFile } from '../../utils/shareTextFile';
import { listSubjectsForCurrentUser } from '../../api/subjectsApi';
import { SelectField } from '../../components/ui/SelectField';

type Props = NativeStackScreenProps<TestsStackParamList, 'ExamTestDetail'>;

type TabKey = 'SETTINGS' | 'QUESTIONS';

export function ExamTestDetailScreen({ route, navigation }: Props) {
  const businessId = useAuthStore((s) => s.business?.id);
  const role = useRole();
  const queryClient = useQueryClient();
  const { examTestId } = route.params;

  const [tab, setTab] = useState<TabKey>('SETTINGS');

  const testQuery = useQuery({
    queryKey: ['tests', 'exam', 'detail', businessId ?? 0, examTestId],
    queryFn: () => getExamTest({ businessId: businessId!, examTestId }),
    enabled: typeof businessId === 'number',
  });

  const questionsQuery = useQuery({
    queryKey: ['tests', 'exam', 'questions', businessId ?? 0, examTestId],
    queryFn: () => listExamQuestions({ businessId: businessId!, examTestId }),
    enabled: typeof businessId === 'number',
  });

  const test = testQuery.data;
  const questions = questionsQuery.data ?? [];

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [subjectId, setSubjectId] = useState<number | undefined>(undefined);
  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  const [startAt, setStartAt] = useState('');
  const [deadlineAt, setDeadlineAt] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [defaultMarks, setDefaultMarks] = useState('');
  const [negativeMarks, setNegativeMarks] = useState('');
  const [resultVisibility, setResultVisibility] = useState<0 | 1>(0);
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleOptions, setShuffleOptions] = useState(false);

  React.useEffect(() => {
    if (!test) return;
    setName(test.name ?? '');
    setDescription(test.description ?? '');
    setSubjectId(typeof (test as any).subjectId === 'number' ? (test as any).subjectId : undefined);
    setLanguage(((test as any).language ?? 'en') as 'en' | 'hi');
    setStartAt(test.startAt ?? '');
    setDeadlineAt(test.deadlineAt ?? '');
    setDurationMinutes(String(test.durationMinutes ?? ''));
    setDefaultMarks(String(test.defaultMarksPerQuestion ?? ''));
    setNegativeMarks(String(test.negativeMarksPerQuestion ?? ''));
    setResultVisibility((test.resultVisibility ?? 0) as 0 | 1);
    setShuffleQuestions(Boolean(test.shuffleQuestions));
    setShuffleOptions(Boolean(test.shuffleOptions));
  }, [test]);

  const subjectsQuery = useQuery({
    queryKey: ['tests', 'subjects', 'user'],
    queryFn: () => listSubjectsForCurrentUser(),
    enabled: role === 'ADMIN' || role === 'TEACHER' || role === 'SUPERADMIN',
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const dur = durationMinutes.trim() ? Number(durationMinutes) : undefined;
      const dm = defaultMarks.trim() ? Number(defaultMarks) : undefined;
      const nm = negativeMarks.trim() ? Number(negativeMarks) : undefined;
      if (dur !== undefined && Number.isNaN(dur)) throw new Error('Duration must be a number');
      if (dm !== undefined && Number.isNaN(dm)) throw new Error('Default marks must be a number');
      if (nm !== undefined && Number.isNaN(nm)) throw new Error('Negative marks must be a number');

      return await updateExamTest({
        businessId: businessId!,
        examTestId,
        body: {
          name: name.trim(),
          description: description.trim() || undefined,
          subjectId: subjectId ?? null,
          startAt: startAt.trim() || undefined,
          deadlineAt: deadlineAt.trim() || undefined,
          durationMinutes: dur,
          defaultMarksPerQuestion: dm,
          negativeMarksPerQuestion: nm,
          resultVisibility,
          shuffleQuestions,
          shuffleOptions,
          language,
        },
      });
    },
    onSuccess: async () => {
      showToast('Saved', 'success');
      await queryClient.invalidateQueries({ queryKey: ['tests', 'exam', 'detail', businessId ?? 0, examTestId] });
    },
    onError: (e) => showToast(mapApiError(e).message || 'Save failed', 'error'),
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      if (typeof businessId !== 'number') throw new Error('Missing business');
      const csv = await exportExamAnalyticsCsv({ businessId, examTestId });
      await shareTextFile({
        fileNameBase: `exam-test-${examTestId}-analytics`,
        extension: '.csv',
        mimeType: 'text/csv',
        contents: csv,
      });
    },
    onError: (e) => showToast(mapApiError(e).message || 'Export failed', 'error'),
  });

  const onRefresh = useCallback(async () => {
    await Promise.all([testQuery.refetch(), questionsQuery.refetch()]);
  }, [questionsQuery, testQuery]);

  const openCreateQuestion = () => {
    navigation.navigate(TESTS_STACK.EXAM_QUESTION_EDITOR, { examTestId, mode: 'create' });
  };

  const openEditQuestion = (qId: string) => {
    navigation.navigate(TESTS_STACK.EXAM_QUESTION_EDITOR, { examTestId, mode: 'edit', questionId: qId });
  };

  const tabRow = (
    <View style={styles.segmentRow}>
      <Pressable onPress={() => setTab('SETTINGS')} style={[styles.segment, tab === 'SETTINGS' && styles.segmentOn]}>
        <Text style={[styles.segmentText, tab === 'SETTINGS' && styles.segmentTextOn]}>Settings</Text>
      </Pressable>
      <Pressable onPress={() => setTab('QUESTIONS')} style={[styles.segment, tab === 'QUESTIONS' && styles.segmentOn]}>
        <Text style={[styles.segmentText, tab === 'QUESTIONS' && styles.segmentTextOn]}>Questions</Text>
      </Pressable>
    </View>
  );

  if (testQuery.isLoading) {
    return (
      <View style={styles.screen}>
        <View style={styles.center}>
          <ActivityIndicator color={BATCH_UI.ACCENT} />
        </View>
      </View>
    );
  }

  const errorText = testQuery.error ? mapApiError(testQuery.error).message : null;
  if (errorText) {
    return (
      <View style={styles.screen}>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>Could not load test</Text>
          <Text style={styles.emptySub}>{errorText}</Text>
          <Pressable onPress={() => testQuery.refetch()} style={({ pressed }) => [styles.retryBtn, pressed && styles.retryBtnPressed]}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!test) {
    return (
      <View style={styles.screen}>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>Not found</Text>
          <Text style={styles.emptySub}>This exam test may have been deleted.</Text>
        </View>
      </View>
    );
  }

  if (tab === 'SETTINGS') {
    return (
      <View style={styles.screen}>
        <FlatList
          data={[]}
          keyExtractor={() => 'x'}
          renderItem={null}
          refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={BATCH_UI.ACCENT} />}
          ListHeaderComponent={
            <View style={styles.content}>
              <Text style={styles.title}>{test.name}</Text>
              <Text style={styles.sub}>Edit settings for this exam test.</Text>
              {tabRow}

              {role === 'ADMIN' || role === 'TEACHER' || role === 'SUPERADMIN' ? (
                <Pressable
                  onPress={() => {
                    if (exportMutation.isPending) return;
                    exportMutation.mutate();
                  }}
                  style={({ pressed }) => [
                    styles.secondaryBtn,
                    pressed && styles.secondaryBtnPressed,
                    exportMutation.isPending && styles.primaryBtnDisabled,
                  ]}
                >
                  <Text style={styles.secondaryBtnText}>{exportMutation.isPending ? 'Exporting…' : 'Export analytics (CSV)'}</Text>
                </Pressable>
              ) : null}

              <SelectField
                label="Subject"
                value={subjectId}
                placeholder="Select subject"
                options={(subjectsQuery.data ?? [])
                  .filter((s) => typeof s.id === 'number')
                  .map((s) => ({ value: s.id as number, label: s.name ?? `Subject ${s.id}` }))}
                onChange={setSubjectId}
                searchable
                disabled={subjectsQuery.isLoading || (subjectsQuery.data ?? []).length === 0}
              />

              <SelectField
                label="Language"
                value={language}
                placeholder="Select language"
                options={[
                  { value: 'en', label: 'English' },
                  { value: 'hi', label: 'Hindi' },
                ]}
                onChange={setLanguage}
              />

              <Text style={styles.label}>Name</Text>
              <TextInput value={name} onChangeText={setName} placeholder="Test name" placeholderTextColor={BATCH_UI.TEXT_DIM} style={styles.input} />

              <Text style={styles.label}>Description</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Optional description"
                placeholderTextColor={BATCH_UI.TEXT_DIM}
                style={[styles.input, styles.inputMultiline]}
                multiline
              />

              <Text style={styles.label}>Start at (ISO)</Text>
              <TextInput
                value={startAt}
                onChangeText={setStartAt}
                placeholder="2026-01-01T10:00:00Z"
                placeholderTextColor={BATCH_UI.TEXT_DIM}
                style={styles.input}
                autoCapitalize="none"
              />

              <Text style={styles.label}>Deadline at (ISO)</Text>
              <TextInput
                value={deadlineAt}
                onChangeText={setDeadlineAt}
                placeholder="2026-01-01T11:00:00Z"
                placeholderTextColor={BATCH_UI.TEXT_DIM}
                style={styles.input}
                autoCapitalize="none"
              />

              <Text style={styles.label}>Duration (minutes)</Text>
              <TextInput
                value={durationMinutes}
                onChangeText={setDurationMinutes}
                placeholder="e.g. 60"
                placeholderTextColor={BATCH_UI.TEXT_DIM}
                style={styles.input}
                keyboardType="numeric"
              />

              <Text style={styles.label}>Default marks per question</Text>
              <TextInput
                value={defaultMarks}
                onChangeText={setDefaultMarks}
                placeholder="e.g. 1"
                placeholderTextColor={BATCH_UI.TEXT_DIM}
                style={styles.input}
                keyboardType="numeric"
              />

              <Text style={styles.label}>Negative marks per question</Text>
              <TextInput
                value={negativeMarks}
                onChangeText={setNegativeMarks}
                placeholder="e.g. 0.25"
                placeholderTextColor={BATCH_UI.TEXT_DIM}
                style={styles.input}
                keyboardType="numeric"
              />

              <SelectField
                label="Result visibility"
                value={resultVisibility}
                placeholder="Select visibility"
                options={[
                  { value: 0, label: 'After deadline' },
                  { value: 1, label: 'Hidden' },
                ]}
                onChange={setResultVisibility}
              />

              <View style={styles.toggleRow}>
                <Text style={styles.toggleText}>Shuffle questions</Text>
                <Switch value={shuffleQuestions} onValueChange={setShuffleQuestions} />
              </View>
              <View style={styles.toggleRow}>
                <Text style={styles.toggleText}>Shuffle options</Text>
                <Switch value={shuffleOptions} onValueChange={setShuffleOptions} />
              </View>

              <Pressable
                onPress={() => {
                  if (saveMutation.isPending) return;
                  saveMutation.mutate();
                }}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  pressed && styles.primaryBtnPressed,
                  saveMutation.isPending && styles.primaryBtnDisabled,
                ]}
              >
                <Text style={styles.primaryBtnText}>{saveMutation.isPending ? 'Saving…' : 'Save settings'}</Text>
              </Pressable>
            </View>
          }
        />
      </View>
    );
  }

  const renderQuestion = ({ item }: { item: TestQuestion }) => (
    <Pressable onPress={() => openEditQuestion(item.id)} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <View style={styles.cardTop}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.questionText}
        </Text>
        <Text style={styles.chev}>›</Text>
      </View>
      <Text style={styles.cardSub}>{QUESTION_TYPE_LABEL[item.type] ?? `Type ${item.type}`}</Text>
    </Pressable>
  );

  return (
    <View style={styles.screen}>
      <FlatList
        data={questions}
        keyExtractor={(q) => q.id}
        renderItem={renderQuestion}
        refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={BATCH_UI.ACCENT} />}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <Text style={styles.title}>{test.name}</Text>
            <Text style={styles.sub}>Add and edit questions.</Text>
            {tabRow}
            <Pressable onPress={openCreateQuestion} style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}>
              <Text style={styles.primaryBtnText}>＋ Add question</Text>
            </Pressable>
            <Text style={styles.sectionLabel}>Questions</Text>
          </View>
        }
        ListEmptyComponent={
          questionsQuery.isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator color={BATCH_UI.ACCENT} />
            </View>
          ) : questionsQuery.error ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>Could not load questions</Text>
              <Text style={styles.emptySub}>{mapApiError(questionsQuery.error).message}</Text>
              <Pressable onPress={() => questionsQuery.refetch()} style={({ pressed }) => [styles.retryBtn, pressed && styles.retryBtnPressed]}>
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>No questions yet</Text>
              <Text style={styles.emptySub}>Add your first question to start building this test.</Text>
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
  title: {
    color: BATCH_UI.TEXT,
    fontSize: 18,
    fontWeight: '900',
  },
  sub: {
    marginTop: 8,
    color: BATCH_UI.TEXT_MUTED,
    lineHeight: 20,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
    flexGrow: 1,
  },
  center: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  segmentRow: {
    flexDirection: 'row',
    backgroundColor: BATCH_UI.BG_ELEVATED,
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER,
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 14,
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
  label: {
    color: BATCH_UI.TEXT_DIM,
    marginTop: 14,
    marginBottom: 8,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  input: {
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER,
    backgroundColor: BATCH_UI.CARD,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: BATCH_UI.TEXT,
    fontSize: 15,
  },
  inputMultiline: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  toggleRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  toggleText: {
    color: BATCH_UI.TEXT,
    fontSize: 15,
    fontWeight: '700',
  },
  primaryBtn: {
    marginTop: 18,
    backgroundColor: BATCH_UI.PRIMARY_BTN,
    borderRadius: 14,
    paddingVertical: 14,
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
    fontSize: 16,
  },
  sectionLabel: {
    color: BATCH_UI.TEXT_DIM,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 18,
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
    fontSize: 15,
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
  secondaryBtn: {
    marginTop: 14,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER_STRONG,
    backgroundColor: BATCH_UI.BG_ELEVATED,
  },
  secondaryBtnPressed: {
    opacity: 0.9,
  },
  secondaryBtnText: {
    color: BATCH_UI.TEXT,
    fontWeight: '900',
  },
});

