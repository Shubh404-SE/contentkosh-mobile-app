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
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CoursesStackParamList } from './CoursesStack';
import { COURSES_STACK } from '../../constants/navigation';
import { COURSE_QUERY_KEYS } from '../../constants/courseQueryKeys';
import { createSubject, updateSubject } from '../../api/subjectsApi';
import { validateEntityName } from '../../utils/entityValidation';
import { mapApiError } from '../../utils/mapApiError';
import { showToast } from '../../utils/toast';

type Props = NativeStackScreenProps<CoursesStackParamList, typeof COURSES_STACK.SUBJECT_FORM>;

const NAME_MAX = 100;

export function SubjectFormScreen({ route, navigation }: Props) {
  const { mode, examId, courseId, subject } = route.params;
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== 'edit' || !subject) return;
    setName(subject.name ?? '');
    setDescription(subject.description ?? '');
    setIsActive(subject.status !== 'INACTIVE');
  }, [mode, subject]);

  const createMutation = useMutation({
    mutationFn: () =>
      createSubject(examId, courseId, {
        name: name.trim(),
        description: description.trim() ? description.trim() : undefined,
        status: isActive ? 'ACTIVE' : 'INACTIVE',
        courseId,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: COURSE_QUERY_KEYS.subjects(examId, courseId) });
      await queryClient.invalidateQueries({ queryKey: COURSE_QUERY_KEYS.courses(examId) });
      showToast('Subject created', 'success');
      navigation.pop();
    },
    onError: (e: unknown) => showToast(mapApiError(e).message, 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      updateSubject(examId, courseId, subject!.id!, {
        name: name.trim(),
        description: description.trim() ? description.trim() : undefined,
        status: isActive ? 'ACTIVE' : 'INACTIVE',
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: COURSE_QUERY_KEYS.subjects(examId, courseId) });
      showToast('Subject updated', 'success');
      navigation.pop();
    },
    onError: (e: unknown) => showToast(mapApiError(e).message, 'error'),
  });

  const busy = createMutation.isPending || updateMutation.isPending;

  const onSubmit = () => {
    setErrorText(null);
    const nameErr = validateEntityName(name, 'Subject name', NAME_MAX);
    if (nameErr) {
      setErrorText(nameErr);
      return;
    }
    if (mode === 'edit' && (!subject || subject.id == null)) {
      setErrorText('Subject is missing');
      return;
    }
    if (mode === 'create') createMutation.mutate();
    else updateMutation.mutate();
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {errorText ? <Text style={styles.banner}>{errorText}</Text> : null}

      <Text style={styles.label}>Subject name</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Subject name"
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

      <View style={styles.row}>
        <Text style={styles.label}>Active</Text>
        <Switch value={isActive} onValueChange={setIsActive} disabled={busy} />
      </View>

      <Pressable style={[styles.submit, busy && styles.submitDisabled]} onPress={onSubmit} disabled={busy}>
        {busy ? (
          <ActivityIndicator />
        ) : (
          <Text style={styles.submitText}>{mode === 'create' ? 'Create subject' : 'Save changes'}</Text>
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
