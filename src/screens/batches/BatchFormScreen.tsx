import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createBatch, getBatchById, updateBatch } from '../../api/batchesApi';
import { getBusinessExams } from '../../api/examsApi';
import { useAuthStore } from '../../store/authStore';
import { BATCH_QUERY_KEYS } from '../../constants/batchQueryKeys';
import { BATCH_UI } from '../../constants/batchUi';
import { DASHBOARD_QUERY_KEY } from '../../constants/dashboardQueryKeys';
import { BATCHES_STACK } from '../../constants/navigation';
import { mapApiError } from '../../utils/mapApiError';
import { showToast } from '../../utils/toast';
import type { CourseOption } from '../../types/batch';
import type { BatchesStackParamList } from './BatchesStack';

type Props = NativeStackScreenProps<BatchesStackParamList, typeof BATCHES_STACK.FORM>;

function flattenCourses(businessId: number): Promise<CourseOption[]> {
  return getBusinessExams(businessId, 'courses').then((res) => {
    const exams = res.data ?? [];
    const options: CourseOption[] = [];
    for (const exam of exams) {
      for (const c of exam.courses ?? []) {
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

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function BatchFormScreen({ route, navigation }: Props) {
  const { mode, batchId, courseId: initialCourseId } = route.params;
  const business = useAuthStore((s) => s.business);
  const businessId = business?.id;
  const queryClient = useQueryClient();

  const [codeName, setCodeName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [startDate, setStartDate] = useState(() => new Date());
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d;
  });
  const [isActive, setIsActive] = useState(true);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const coursesQuery = useQuery({
    queryKey: BATCH_QUERY_KEYS.courses(businessId ?? 0),
    queryFn: () => flattenCourses(businessId!),
    enabled: mode === 'create' && typeof businessId === 'number',
  });

  const existingQuery = useQuery({
    queryKey: BATCH_QUERY_KEYS.detail(batchId ?? 0),
    queryFn: () => getBatchById(batchId!),
    enabled: mode === 'edit' && typeof batchId === 'number',
  });

  useEffect(() => {
    if (mode !== 'edit' || !existingQuery.data) return;
    const b = existingQuery.data;
    setCodeName(b.codeName ?? '');
    setDisplayName(b.displayName ?? '');
    if (b.startDate) setStartDate(new Date(b.startDate));
    if (b.endDate) setEndDate(new Date(b.endDate));
    setIsActive(b.isActive !== false);
    if (b.courseId != null) setSelectedCourseId(b.courseId);
  }, [existingQuery.data, mode]);

  useEffect(() => {
    if (mode !== 'create' || !coursesQuery.data || coursesQuery.data.length === 0) return;
    setSelectedCourseId((prev) => {
      if (prev != null) return prev;
      if (initialCourseId != null && coursesQuery.data!.some((c) => c.id === initialCourseId)) {
        return initialCourseId;
      }
      return coursesQuery.data![0]!.id;
    });
  }, [coursesQuery.data, initialCourseId, mode]);

  const createMutation = useMutation({
    mutationFn: () =>
      createBatch({
        codeName: codeName.trim(),
        displayName: displayName.trim(),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        courseId: selectedCourseId!,
        isActive,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['batches'] });
      await queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });
      showToast('Batch created', 'success');
      navigation.pop();
    },
    onError: (e) => showToast(mapApiError(e).message || 'Create failed', 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      updateBatch(batchId!, {
        codeName: codeName.trim(),
        displayName: displayName.trim(),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        isActive,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['batches'] });
      await queryClient.invalidateQueries({ queryKey: BATCH_QUERY_KEYS.detail(batchId!) });
      await queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });
      showToast('Batch updated', 'success');
      navigation.pop();
    },
    onError: (e) => showToast(mapApiError(e).message || 'Update failed', 'error'),
  });

  const busy = createMutation.isPending || updateMutation.isPending;

  const onSubmit = () => {
    if (!codeName.trim() || !displayName.trim()) {
      showToast('Code and display name are required', 'error');
      return;
    }
    if (mode === 'create') {
      if (selectedCourseId == null) {
        showToast('Select a course', 'error');
        return;
      }
      createMutation.mutate();
      return;
    }
    updateMutation.mutate();
  };

  const onStartChange = (_: DateTimePickerEvent, date?: Date) => {
    setShowStartPicker(false);
    if (date) setStartDate(date);
  };

  const onEndChange = (_: DateTimePickerEvent, date?: Date) => {
    setShowEndPicker(false);
    if (date) setEndDate(date);
  };

  const courseChips = useMemo(() => {
    if (mode !== 'create' || !coursesQuery.data) return null;
    return (
      <View style={styles.chipWrap}>
        {coursesQuery.data.map((c) => {
          const on = c.id === selectedCourseId;
          return (
            <Pressable
              key={c.id}
              onPress={() => setSelectedCourseId(c.id)}
              style={[styles.chip, on && styles.chipOn]}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]} numberOfLines={2}>
                {c.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  }, [coursesQuery.data, mode, selectedCourseId]);

  if (mode === 'edit' && existingQuery.isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={BATCH_UI.ACCENT} />
      </View>
    );
  }

  if (mode === 'edit' && existingQuery.isError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.err}>{mapApiError(existingQuery.error).message || 'Failed to load batch'}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.lead}>
        {mode === 'create'
          ? 'Create a batch under a course. Students and teachers are added after creation.'
          : 'Update identifiers, schedule, and visibility.'}
      </Text>

      {mode === 'create' ? (
        <View style={styles.card}>
          <Text style={styles.cardKicker}>Course</Text>
          <Text style={styles.cardTitle}>Where this batch belongs</Text>
          {coursesQuery.isLoading ? (
            <ActivityIndicator color={BATCH_UI.ACCENT} style={{ marginTop: 12 }} />
          ) : (
            courseChips
          )}
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardKicker}>Identity</Text>
        <Text style={styles.cardTitle}>Names & code</Text>
        <Text style={styles.fieldLabel}>Code name</Text>
        <TextInput
          value={codeName}
          onChangeText={setCodeName}
          style={styles.input}
          placeholder="e.g. NEET-A-2026"
          placeholderTextColor={BATCH_UI.TEXT_DIM}
        />
        <Text style={styles.fieldLabel}>Display name</Text>
        <TextInput
          value={displayName}
          onChangeText={setDisplayName}
          style={styles.input}
          placeholder="Shown to teachers and students"
          placeholderTextColor={BATCH_UI.TEXT_DIM}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardKicker}>Schedule</Text>
        <Text style={styles.cardTitle}>Start & end dates</Text>
        <View style={styles.dateRow}>
          <View style={styles.dateCol}>
            <Text style={styles.fieldLabel}>Starts</Text>
            <Pressable onPress={() => setShowStartPicker(true)} style={styles.dateBtn}>
              <Text style={styles.dateBtnText}>{formatDate(startDate)}</Text>
            </Pressable>
          </View>
          <View style={styles.dateCol}>
            <Text style={styles.fieldLabel}>Ends</Text>
            <Pressable onPress={() => setShowEndPicker(true)} style={styles.dateBtn}>
              <Text style={styles.dateBtnText}>{formatDate(endDate)}</Text>
            </Pressable>
          </View>
        </View>
        {showStartPicker ? (
          <DateTimePicker value={startDate} mode="date" display="default" onChange={onStartChange} />
        ) : null}
        {showEndPicker ? (
          <DateTimePicker value={endDate} mode="date" display="default" onChange={onEndChange} />
        ) : null}
      </View>

      <View style={styles.card}>
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardKicker}>Status</Text>
            <Text style={styles.switchTitle}>Batch active</Text>
            <Text style={styles.switchSub}>Inactive batches stay hidden from default lists.</Text>
          </View>
          <Switch value={isActive} onValueChange={setIsActive} trackColor={{ false: '#334155', true: BATCH_UI.ACCENT }} />
        </View>
      </View>

      <Pressable onPress={onSubmit} style={[styles.submit, busy && styles.submitDisabled]} disabled={busy}>
        <Text style={styles.submitText}>{busy ? 'Saving…' : mode === 'create' ? 'Create batch' : 'Save changes'}</Text>
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
    paddingBottom: 48,
  },
  lead: {
    color: BATCH_UI.TEXT_MUTED,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 18,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BATCH_UI.BG,
    padding: 24,
  },
  err: {
    color: '#fecaca',
    textAlign: 'center',
  },
  card: {
    backgroundColor: BATCH_UI.CARD,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER,
    padding: 16,
    marginBottom: 14,
  },
  cardKicker: {
    color: BATCH_UI.ACCENT,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  cardTitle: {
    color: BATCH_UI.TEXT,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
    marginBottom: 14,
    letterSpacing: -0.3,
  },
  fieldLabel: {
    color: BATCH_UI.TEXT_MUTED,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER,
    backgroundColor: BATCH_UI.BG_ELEVATED,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: BATCH_UI.TEXT,
    fontSize: 15,
  },
  chipWrap: {
    gap: 8,
  },
  chip: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER,
    backgroundColor: BATCH_UI.BG_ELEVATED,
  },
  chipOn: {
    borderColor: BATCH_UI.ACCENT,
    backgroundColor: BATCH_UI.ACCENT_DIM,
  },
  chipText: {
    color: BATCH_UI.TEXT_MUTED,
    fontWeight: '600',
    fontSize: 15,
  },
  chipTextOn: {
    color: BATCH_UI.TEXT,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateCol: {
    flex: 1,
  },
  dateBtn: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER,
    backgroundColor: BATCH_UI.BG_ELEVATED,
    alignItems: 'center',
  },
  dateBtnText: {
    color: BATCH_UI.TEXT,
    fontWeight: '700',
    fontSize: 16,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  switchTitle: {
    color: BATCH_UI.TEXT,
    fontWeight: '800',
    fontSize: 16,
    marginTop: 4,
  },
  switchSub: {
    color: BATCH_UI.TEXT_DIM,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  submit: {
    marginTop: 8,
    backgroundColor: BATCH_UI.PRIMARY_BTN,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BATCH_UI.PRIMARY_BTN_BORDER,
  },
  submitDisabled: {
    opacity: 0.55,
  },
  submitText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 17,
  },
});
