import React, { useEffect, useState } from 'react';
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
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CoursesStackParamList } from './CoursesStack';
import { COURSES_STACK } from '../../constants/navigation';
import { COURSE_QUERY_KEYS } from '../../constants/courseQueryKeys';
import { createCourse, updateCourse } from '../../api/coursesApi';
import { validateDateRange, validateEntityName } from '../../utils/entityValidation';
import { toISODateTime } from '../../utils/isoDateTime';
import { mapApiError } from '../../utils/mapApiError';
import { showToast } from '../../utils/toast';

type Props = NativeStackScreenProps<CoursesStackParamList, typeof COURSES_STACK.COURSE_FORM>;

const NAME_MAX = 100;

export function CourseFormScreen({ route, navigation }: Props) {
  const { mode, examId, course } = route.params;
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [isActive, setIsActive] = useState(true);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== 'edit' || !course) return;
    setName(course.name ?? '');
    setDescription(course.description ?? '');
    setStartDate(course.startDate ? new Date(course.startDate) : undefined);
    setEndDate(course.endDate ? new Date(course.endDate) : undefined);
    setIsActive(course.status !== 'INACTIVE');
  }, [course, mode]);

  const createMutation = useMutation({
    mutationFn: () =>
      createCourse(examId, {
        name: name.trim(),
        description: description.trim() ? description.trim() : undefined,
        startDate: toISODateTime(startDate),
        endDate: toISODateTime(endDate),
        status: isActive ? 'ACTIVE' : 'INACTIVE',
        examId,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: COURSE_QUERY_KEYS.courses(examId) });
      showToast('Course created', 'success');
      navigation.pop();
    },
    onError: (e: unknown) => showToast(mapApiError(e).message, 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      updateCourse(examId, course!.id!, {
        name: name.trim(),
        description: description.trim() ? description.trim() : undefined,
        startDate: toISODateTime(startDate),
        endDate: toISODateTime(endDate),
        status: isActive ? 'ACTIVE' : 'INACTIVE',
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: COURSE_QUERY_KEYS.courses(examId) });
      if (course?.id != null) {
        await queryClient.invalidateQueries({ queryKey: COURSE_QUERY_KEYS.courseDetail(examId, course.id) });
      }
      showToast('Course updated', 'success');
      navigation.pop();
    },
    onError: (e: unknown) => showToast(mapApiError(e).message, 'error'),
  });

  const busy = createMutation.isPending || updateMutation.isPending;

  const onSubmit = () => {
    setErrorText(null);

    const nameErr = validateEntityName(name, 'Course name', NAME_MAX);
    if (nameErr) {
      setErrorText(nameErr);
      return;
    }

    const dateErr = validateDateRange(toISODateTime(startDate) || '', toISODateTime(endDate) || '');
    if (dateErr) {
      setErrorText(dateErr);
      return;
    }

    if (mode === 'edit' && (!course || course.id == null)) {
      setErrorText('Course is missing');
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

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {errorText ? <Text style={styles.banner}>{errorText}</Text> : null}

      <Text style={styles.label}>Course name</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Course name"
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
        <Text style={styles.dateBtnText}>{startDate ? startDate.toISOString().slice(0, 10) : 'Not set'}</Text>
      </Pressable>
      {showStartPicker ? (
        <DateTimePicker value={startDate || new Date()} mode="date" display="default" onChange={onStartChange} />
      ) : null}

      <Text style={styles.label}>End date</Text>
      <Pressable style={styles.dateBtn} onPress={() => setShowEndPicker(true)} disabled={busy}>
        <Text style={styles.dateBtnText}>{endDate ? endDate.toISOString().slice(0, 10) : 'Not set'}</Text>
      </Pressable>
      {showEndPicker ? (
        <DateTimePicker value={endDate || new Date()} mode="date" display="default" onChange={onEndChange} />
      ) : null}

      <View style={styles.row}>
        <Text style={styles.label}>Active</Text>
        <Switch value={isActive} onValueChange={setIsActive} disabled={busy} />
      </View>

      <Pressable style={[styles.submit, busy && styles.submitDisabled]} onPress={onSubmit} disabled={busy}>
        {busy ? (
          <ActivityIndicator />
        ) : (
          <Text style={styles.submitText}>{mode === 'create' ? 'Create course' : 'Save changes'}</Text>
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
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  submit: {
    marginTop: 18,
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: '#ffffff', fontWeight: '700' },
  banner: { color: '#fecaca' },
});
