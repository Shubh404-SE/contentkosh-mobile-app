import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ExamsStackParamList } from './ExamsStack';
import { EXAMS_STACK } from '../../constants/navigation';
import { EXAM_QUERY_KEYS } from '../../constants/examQueryKeys';
import { createExam, updateExam, type ExamRecord } from '../../api/examsApi';
import { useAuthStore } from '../../store/authStore';
import { validateDateRange, validateEntityName } from '../../utils/entityValidation';
import { toISODateTime } from '../../utils/isoDateTime';
import { mapApiError } from '../../utils/mapApiError';
import { showToast } from '../../utils/toast';

type Props = NativeStackScreenProps<ExamsStackParamList, typeof EXAMS_STACK.FORM>;

export function ExamFormScreen({ route, navigation }: Props) {
  const { mode, exam } = route.params;
  const business = useAuthStore((s) => s.business);
  const businessId = business?.id;
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [code, setCode] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== 'edit' || !exam) return;
    setName(exam.name ?? '');
    setDescription(exam.description ?? '');
    setCode(exam.code ?? '');
    setStartDate(exam.startDate ? new Date(exam.startDate) : undefined);
    setEndDate(exam.endDate ? new Date(exam.endDate) : undefined);
  }, [exam, mode]);

  const createMutation = useMutation({
    mutationFn: () =>
      createExam(businessId!, {
        name: name.trim(),
        description: description.trim() || undefined,
        code: code.trim() || undefined,
        startDate: toISODateTime(startDate),
        endDate: toISODateTime(endDate),
        businessId: businessId!,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: EXAM_QUERY_KEYS.list(businessId ?? 0) });
      showToast('Exam created', 'success');
      navigation.pop();
    },
    onError: (e: unknown) => showToast(mapApiError(e).message, 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      updateExam(businessId!, exam!.id!, {
        name: name.trim(),
        description: description.trim() || undefined,
        code: code.trim() || undefined,
        startDate: toISODateTime(startDate),
        endDate: toISODateTime(endDate),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: EXAM_QUERY_KEYS.list(businessId ?? 0) });
      showToast('Exam updated', 'success');
      navigation.pop();
    },
    onError: (e: unknown) => showToast(mapApiError(e).message, 'error'),
  });

  const busy = createMutation.isPending || updateMutation.isPending;

  const onSubmit = () => {
    setErrorText(null);

    const nameErr = validateEntityName(name, 'Exam name');
    if (nameErr) {
      setErrorText(nameErr);
      return;
    }

    if (mode === 'create' && startDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      if (start < today) {
        setErrorText('Start Date cannot be in the past');
        return;
      }
    }

    const dr = validateDateRange(toISODateTime(startDate) || '', toISODateTime(endDate) || '');
    if (dr) {
      setErrorText(dr);
      return;
    }

    if (typeof businessId !== 'number') {
      setErrorText('Business is not available');
      return;
    }

    if (mode === 'edit' && (!exam || exam.id == null)) {
      setErrorText('Exam is missing');
      return;
    }

    if (mode === 'create') createMutation.mutate();
    else updateMutation.mutate();
  };

  const onStartChange = (_e: DateTimePickerEvent, d?: Date) => {
    setShowStartPicker(false);
    if (d) setStartDate(d);
  };

  const onEndChange = (_e: DateTimePickerEvent, d?: Date) => {
    setShowEndPicker(false);
    if (d) setEndDate(d);
  };

  if (typeof businessId !== 'number') {
    return (
      <View style={styles.centered}>
        <Text style={styles.err}>Business context missing</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {errorText ? <Text style={styles.banner}>{errorText}</Text> : null}

      <Text style={styles.label}>Exam name</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="e.g. UPSC"
        placeholderTextColor="#6b7aa3"
        style={styles.input}
        editable={!busy}
      />

      <Text style={styles.label}>Code (optional)</Text>
      <TextInput
        value={code}
        onChangeText={setCode}
        placeholder="Short code"
        placeholderTextColor="#6b7aa3"
        style={styles.input}
        editable={!busy}
      />

      <Text style={styles.label}>Description</Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="Optional"
        placeholderTextColor="#6b7aa3"
        style={[styles.input, styles.multiline]}
        multiline
        editable={!busy}
      />

      <Text style={styles.label}>Start date</Text>
      <Pressable style={styles.dateBtn} onPress={() => setShowStartPicker(true)} disabled={busy}>
        <Text style={styles.dateBtnText}>
          {startDate ? startDate.toISOString().slice(0, 10) : 'Not set'}
        </Text>
      </Pressable>
      {showStartPicker ? (
        <DateTimePicker value={startDate || new Date()} mode="date" display="default" onChange={onStartChange} />
      ) : null}

      <Text style={styles.label}>End date</Text>
      <Pressable style={styles.dateBtn} onPress={() => setShowEndPicker(true)} disabled={busy}>
        <Text style={styles.dateBtnText}>
          {endDate ? endDate.toISOString().slice(0, 10) : 'Not set'}
        </Text>
      </Pressable>
      {showEndPicker ? (
        <DateTimePicker value={endDate || new Date()} mode="date" display="default" onChange={onEndChange} />
      ) : null}

      <Pressable style={[styles.submit, busy && styles.submitDisabled]} onPress={onSubmit} disabled={busy}>
        {busy ? (
          <ActivityIndicator />
        ) : (
          <Text style={styles.submitText}>{mode === 'create' ? 'Create exam' : 'Save changes'}</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0b1220' },
  content: { padding: 16, paddingBottom: 32, gap: 8 },
  label: { color: '#cbd5e1', fontWeight: '600', marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#24304d',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#f8fafc',
    backgroundColor: '#111a2e',
  },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
  dateBtn: {
    borderWidth: 1,
    borderColor: '#24304d',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#111a2e',
  },
  dateBtnText: { color: '#e2e8f0' },
  submit: {
    marginTop: 18,
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: '#ffffff', fontWeight: '700' },
  banner: { color: '#fecaca', marginBottom: 8 },
  centered: { flex: 1, backgroundColor: '#0b1220', alignItems: 'center', justifyContent: 'center' },
  err: { color: '#fecaca' },
});
