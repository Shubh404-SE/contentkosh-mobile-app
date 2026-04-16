import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BATCH_UI } from '../../constants/batchUi';
import type { ContentStackParamList } from './ContentStack';
import { CONTENT_STACK } from '../../constants/navigation';
import { deleteContent, getContent, updateContent } from '../../api/contentsApi';
import { getAllBatches } from '../../api/batchesApi';
import { listSubjectsForCurrentUser } from '../../api/subjectsApi';
import { SelectField } from '../../components/ui/SelectField';
import { mapApiError } from '../../utils/mapApiError';
import { showToast } from '../../utils/toast';
import { CONTENT_QUERY_KEYS } from '../../constants/contentQueryKeys';

type Props = NativeStackScreenProps<ContentStackParamList, typeof CONTENT_STACK.EDIT>;

export function ContentEditScreen({ route, navigation }: Props) {
  const queryClient = useQueryClient();
  const { contentId } = route.params;

  const contentQuery = useQuery({
    queryKey: ['content', 'detail', contentId],
    queryFn: () => getContent(contentId),
  });

  const batchesQuery = useQuery({
    queryKey: CONTENT_QUERY_KEYS.batches(),
    queryFn: () => getAllBatches('course'),
  });

  const subjectsQuery = useQuery({
    queryKey: CONTENT_QUERY_KEYS.subjectsUser(),
    queryFn: () => listSubjectsForCurrentUser(),
  });

  const content = contentQuery.data;
  const batch = useMemo(() => {
    if (!content) return undefined;
    return (batchesQuery.data ?? []).find((b) => b.id === content.batchId);
  }, [batchesQuery.data, content]);

  const allowedSubjects = useMemo(() => {
    const list = subjectsQuery.data ?? [];
    const courseId = batch?.courseId;
    const filtered = typeof courseId === 'number' ? list.filter((s) => s.courseId === courseId) : list;
    return filtered
      .filter((s) => typeof s.id === 'number')
      .map((s) => ({ value: s.id as number, label: s.name ?? `Subject ${s.id}` }));
  }, [batch?.courseId, subjectsQuery.data]);

  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [subjectId, setSubjectId] = useState<number | undefined>(undefined);

  React.useEffect(() => {
    if (!content) return;
    setTitle(content.title ?? '');
    setStatus((content.status ?? 'ACTIVE') as 'ACTIVE' | 'INACTIVE');
    setSubjectId(typeof content.subjectId === 'number' ? content.subjectId : undefined);
  }, [content]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!content) throw new Error('Missing content');
      const t = title.trim();
      if (!t) throw new Error('Title is required');
      if (typeof subjectId !== 'number') throw new Error('Select a subject');
      return await updateContent(contentId, { title: t, status, subjectId });
    },
    onSuccess: async (updated) => {
      showToast('Saved', 'success');
      await queryClient.invalidateQueries({ queryKey: ['content', 'detail', contentId] });
      await queryClient.invalidateQueries({ queryKey: CONTENT_QUERY_KEYS.batchContents(updated.batchId) });
      navigation.goBack();
    },
    onError: (e) => showToast(mapApiError(e).message || 'Save failed', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!content) throw new Error('Missing content');
      await deleteContent(contentId);
      return content.batchId;
    },
    onSuccess: async (batchId) => {
      showToast('Deleted', 'success');
      await queryClient.invalidateQueries({ queryKey: CONTENT_QUERY_KEYS.batchContents(batchId) });
      navigation.goBack();
    },
    onError: (e) => showToast(mapApiError(e).message || 'Delete failed', 'error'),
  });

  if (contentQuery.isLoading) {
    return (
      <View style={styles.screen}>
        <Text style={styles.sub}>Loading…</Text>
      </View>
    );
  }

  if (!content) {
    return (
      <View style={styles.screen}>
        <Text style={styles.sub}>Content not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Edit content</Text>
      <Text style={styles.sub}>Update title, subject, and status.</Text>

      <Text style={styles.label}>Title</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Content title"
        placeholderTextColor={BATCH_UI.TEXT_DIM}
        style={styles.input}
      />

      <SelectField
        label="Subject"
        value={subjectId}
        placeholder="Select subject"
        options={allowedSubjects}
        onChange={setSubjectId}
        searchable
        disabled={allowedSubjects.length === 0}
      />

      <SelectField
        label="Status"
        value={status}
        placeholder="Select status"
        options={[
          { value: 'ACTIVE', label: 'Active' },
          { value: 'INACTIVE', label: 'Inactive' },
        ]}
        onChange={setStatus}
      />

      <Pressable
        onPress={() => {
          if (saveMutation.isPending) return;
          saveMutation.mutate();
        }}
        style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed, saveMutation.isPending && styles.primaryBtnDisabled]}
      >
        <Text style={styles.primaryBtnText}>{saveMutation.isPending ? 'Saving…' : 'Save'}</Text>
      </Pressable>

      <Pressable
        onPress={() => {
          if (deleteMutation.isPending) return;
          Alert.alert('Delete content?', 'This will remove the content for this batch.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate() },
          ]);
        }}
        style={({ pressed }) => [styles.dangerBtn, pressed && styles.dangerBtnPressed, deleteMutation.isPending && styles.primaryBtnDisabled]}
      >
        <Text style={styles.dangerBtnText}>{deleteMutation.isPending ? 'Deleting…' : 'Delete'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BATCH_UI.BG },
  content: { padding: 16, paddingBottom: 32 },
  title: { color: BATCH_UI.TEXT, fontWeight: '900', fontSize: 18 },
  sub: { marginTop: 8, color: BATCH_UI.TEXT_MUTED, lineHeight: 20, marginBottom: 14 },
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
  primaryBtn: {
    marginTop: 20,
    backgroundColor: BATCH_UI.PRIMARY_BTN,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BATCH_UI.PRIMARY_BTN_BORDER,
  },
  primaryBtnPressed: { opacity: 0.92 },
  primaryBtnDisabled: { opacity: 0.7 },
  primaryBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  dangerBtn: {
    marginTop: 12,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BATCH_UI.DANGER,
    backgroundColor: BATCH_UI.DANGER_BG,
  },
  dangerBtnPressed: { opacity: 0.92 },
  dangerBtnText: { color: BATCH_UI.DANGER, fontWeight: '900', fontSize: 16 },
});

