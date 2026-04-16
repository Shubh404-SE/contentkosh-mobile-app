import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useMutation, useQuery } from '@tanstack/react-query';
import { BATCH_UI } from '../../constants/batchUi';
import { useAuthStore } from '../../store/authStore';
import { getAllBatches } from '../../api/batchesApi';
import { listSubjectsForCurrentUser } from '../../api/subjectsApi';
import { SelectField } from '../../components/ui/SelectField';
import { createPracticeTest } from '../../api/practiceTestsApi';
import { createExamTest } from '../../api/examTestsApi';
import { mapApiError } from '../../utils/mapApiError';
import { showToast } from '../../utils/toast';
import { TESTS_STACK } from '../../constants/navigation';
import type { TestsStackParamList } from './TestsStack';
import type { TestLanguage } from '../../types/tests';

type Props = NativeStackScreenProps<TestsStackParamList, 'CreateTest'>;

type Kind = 'PRACTICE' | 'EXAM';

const LANGUAGE_OPTIONS: Array<{ value: TestLanguage; label: string }> = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
];

const RESULT_VIS_OPTIONS: Array<{ value: 0 | 1; label: string }> = [
  { value: 0, label: 'After deadline' },
  { value: 1, label: 'Hidden' },
];

function safeBatchLabel(b: { displayName?: string; codeName?: string; id?: number }) {
  return b.displayName || b.codeName || `Batch ${b.id ?? ''}`;
}

export function CreateTestScreen({ navigation }: Props) {
  const businessId = useAuthStore((s) => s.business?.id);

  const [kind, setKind] = useState<Kind>('PRACTICE');
  const [batchId, setBatchId] = useState<number | undefined>(undefined);
  const [subjectId, setSubjectId] = useState<number | undefined>(undefined);
  const [language, setLanguage] = useState<TestLanguage>('en');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const [startAt, setStartAt] = useState<Date>(new Date());
  const [deadlineAt, setDeadlineAt] = useState<Date>(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [resultVisibility, setResultVisibility] = useState<0 | 1>(0);

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showDeadlinePicker, setShowDeadlinePicker] = useState(false);

  const batchesQuery = useQuery({
    queryKey: ['tests', 'create', 'batches'],
    queryFn: () => getAllBatches('course'),
    enabled: typeof businessId === 'number',
  });

  const subjectsQuery = useQuery({
    queryKey: ['tests', 'create', 'subjects'],
    queryFn: () => listSubjectsForCurrentUser(),
    enabled: typeof businessId === 'number',
  });

  const batches = batchesQuery.data ?? [];

  useEffect(() => {
    if (batchId != null) return;
    const first = batches.find((b) => typeof b.id === 'number')?.id;
    if (typeof first === 'number') setBatchId(first);
  }, [batchId, batches]);

  const courseIdForBatch = useMemo(() => {
    const b = batches.find((x) => x.id === batchId);
    return b?.courseId;
  }, [batchId, batches]);

  const subjectOptions = useMemo(() => {
    const list = subjectsQuery.data ?? [];
    const filtered =
      typeof courseIdForBatch === 'number' ? list.filter((s) => s.courseId === courseIdForBatch) : list;
    return filtered
      .filter((s) => typeof s.id === 'number')
      .map((s) => ({ value: s.id as number, label: s.name ?? `Subject ${s.id}` }));
  }, [courseIdForBatch, subjectsQuery.data]);

  useEffect(() => {
    if (subjectOptions.length === 0) {
      setSubjectId(undefined);
      return;
    }
    setSubjectId((prev) => {
      if (prev && subjectOptions.some((o) => o.value === prev)) return prev;
      return subjectOptions[0]!.value;
    });
  }, [subjectOptions]);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (typeof businessId !== 'number') throw new Error('Missing business');
      if (typeof batchId !== 'number') throw new Error('Select a batch');
      if (typeof subjectId !== 'number') throw new Error('Select a subject');
      const trimmedName = name.trim();
      if (!trimmedName) throw new Error('Enter a test name');

      if (kind === 'PRACTICE') {
        const test = await createPracticeTest({
          businessId,
          body: {
            batchId,
            subjectId,
            name: trimmedName,
            description: description.trim() || undefined,
            language,
          },
        });
        return { kind: 'practice' as const, id: test.id };
      }

      const dur = Number(durationMinutes);
      if (Number.isNaN(dur) || dur <= 0) throw new Error('Duration must be a positive number');

      const test = await createExamTest({
        businessId,
        body: {
          batchId,
          subjectId,
          name: trimmedName,
          description: description.trim() || undefined,
          startAt: startAt.toISOString(),
          deadlineAt: deadlineAt.toISOString(),
          durationMinutes: dur,
          defaultMarksPerQuestion: 1,
          resultVisibility,
          language,
        },
      });
      return { kind: 'exam' as const, id: test.id };
    },
    onSuccess: (res) => {
      showToast('Test created', 'success');
      if (res.kind === 'practice') {
        navigation.replace(TESTS_STACK.PRACTICE_DETAIL, { practiceTestId: res.id });
      } else {
        navigation.replace(TESTS_STACK.EXAM_DETAIL, { examTestId: res.id });
      }
    },
    onError: (e) => showToast(mapApiError(e).message || 'Create failed', 'error'),
  });

  const batchOptions = useMemo(
    () =>
      batches
        .filter((b) => typeof b.id === 'number')
        .map((b) => ({ value: b.id as number, label: safeBatchLabel(b) })),
    [batches]
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Create test</Text>
      <Text style={styles.sub}>Create a practice or exam test for a batch.</Text>

      <View style={styles.segmentRow}>
        <Pressable onPress={() => setKind('PRACTICE')} style={[styles.segment, kind === 'PRACTICE' && styles.segmentOn]}>
          <Text style={[styles.segmentText, kind === 'PRACTICE' && styles.segmentTextOn]}>Practice</Text>
        </Pressable>
        <Pressable onPress={() => setKind('EXAM')} style={[styles.segment, kind === 'EXAM' && styles.segmentOn]}>
          <Text style={[styles.segmentText, kind === 'EXAM' && styles.segmentTextOn]}>Exam</Text>
        </Pressable>
      </View>

      <SelectField
        label="Batch"
        value={batchId}
        placeholder="Select batch"
        options={batchOptions}
        onChange={setBatchId}
        searchable
        disabled={batchOptions.length === 0}
      />

      <SelectField
        label="Subject"
        value={subjectId}
        placeholder={subjectOptions.length === 0 ? 'No subjects' : 'Select subject'}
        options={subjectOptions}
        onChange={setSubjectId}
        searchable
        disabled={subjectOptions.length === 0}
      />

      <SelectField
        label="Language"
        value={language}
        placeholder="Select language"
        options={LANGUAGE_OPTIONS}
        onChange={setLanguage}
      />

      <Text style={styles.label}>Test name</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Test title"
        placeholderTextColor={BATCH_UI.TEXT_DIM}
        style={styles.input}
      />

      <Text style={styles.label}>Description (optional)</Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="Short description"
        placeholderTextColor={BATCH_UI.TEXT_DIM}
        style={[styles.input, styles.inputMultiline]}
        multiline
      />

      {kind === 'EXAM' ? (
        <>
          <Text style={styles.sectionLabel}>Schedule</Text>
          <Pressable onPress={() => setShowStartPicker(true)} style={({ pressed }) => [styles.rowBtn, pressed && styles.rowBtnPressed]}>
            <Text style={styles.rowBtnLabel}>Start</Text>
            <Text style={styles.rowBtnValue}>{startAt.toLocaleString()}</Text>
          </Pressable>
          <Pressable onPress={() => setShowDeadlinePicker(true)} style={({ pressed }) => [styles.rowBtn, pressed && styles.rowBtnPressed]}>
            <Text style={styles.rowBtnLabel}>Deadline</Text>
            <Text style={styles.rowBtnValue}>{deadlineAt.toLocaleString()}</Text>
          </Pressable>

          {showStartPicker ? (
            <DateTimePicker
              value={startAt}
              mode="datetime"
              onChange={(_, d) => {
                setShowStartPicker(false);
                if (d) setStartAt(d);
              }}
            />
          ) : null}

          {showDeadlinePicker ? (
            <DateTimePicker
              value={deadlineAt}
              mode="datetime"
              onChange={(_, d) => {
                setShowDeadlinePicker(false);
                if (d) setDeadlineAt(d);
              }}
            />
          ) : null}

          <Text style={styles.label}>Duration (minutes)</Text>
          <TextInput
            value={durationMinutes}
            onChangeText={setDurationMinutes}
            placeholder="60"
            placeholderTextColor={BATCH_UI.TEXT_DIM}
            style={styles.input}
            keyboardType="numeric"
          />

          <SelectField
            label="Result visibility"
            value={resultVisibility}
            placeholder="Select visibility"
            options={RESULT_VIS_OPTIONS}
            onChange={setResultVisibility}
          />
        </>
      ) : null}

      <Pressable
        onPress={() => {
          if (createMutation.isPending) return;
          createMutation.mutate();
        }}
        style={({ pressed }) => [
          styles.primaryBtn,
          pressed && styles.primaryBtnPressed,
          createMutation.isPending && styles.primaryBtnDisabled,
        ]}
      >
        <Text style={styles.primaryBtnText}>{createMutation.isPending ? 'Creating…' : 'Create'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BATCH_UI.BG,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  title: {
    color: BATCH_UI.TEXT,
    fontSize: 20,
    fontWeight: '900',
  },
  sub: {
    marginTop: 6,
    color: BATCH_UI.TEXT_MUTED,
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
    marginBottom: 14,
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
    fontWeight: '900',
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
  sectionLabel: {
    color: BATCH_UI.TEXT_DIM,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 18,
    marginBottom: 10,
  },
  rowBtn: {
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER,
    backgroundColor: BATCH_UI.CARD,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
  },
  rowBtnPressed: {
    backgroundColor: BATCH_UI.CARD_HOVER,
  },
  rowBtnLabel: {
    color: BATCH_UI.TEXT_DIM,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  rowBtnValue: {
    marginTop: 6,
    color: BATCH_UI.TEXT,
    fontWeight: '800',
  },
  primaryBtn: {
    marginTop: 20,
    backgroundColor: BATCH_UI.PRIMARY_BTN,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BATCH_UI.PRIMARY_BTN_BORDER,
  },
  primaryBtnPressed: {
    opacity: 0.92,
  },
  primaryBtnDisabled: {
    opacity: 0.7,
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 16,
  },
});

