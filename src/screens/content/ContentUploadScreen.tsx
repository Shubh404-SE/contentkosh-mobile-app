import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useNavigation } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BATCH_UI } from '../../constants/batchUi';
import { SelectField } from '../../components/ui/SelectField';
import { getAllBatches } from '../../api/batchesApi';
import { listSubjectsForCurrentUser } from '../../api/subjectsApi';
import { uploadBatchContent } from '../../api/contentsApi';
import { mapApiError } from '../../utils/mapApiError';
import { showToast } from '../../utils/toast';
import { CONTENT_QUERY_KEYS } from '../../constants/contentQueryKeys';

export function ContentUploadScreen() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  const [batchId, setBatchId] = useState<number | undefined>(undefined);
  const [subjectId, setSubjectId] = useState<number | undefined>(undefined);
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<{ uri: string; name: string; mimeType?: string } | null>(null);

  const batchesQuery = useQuery({
    queryKey: CONTENT_QUERY_KEYS.batches(),
    queryFn: () => getAllBatches('course'),
  });

  const subjectsQuery = useQuery({
    queryKey: CONTENT_QUERY_KEYS.subjectsUser(),
    queryFn: () => listSubjectsForCurrentUser(),
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

  const pickFile = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      // Let backend validate extensions; this is just a UX filter.
      type: [
        'application/pdf',
        'image/*',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ],
    });

    if (res.canceled) return;
    const asset = res.assets?.[0];
    if (!asset?.uri) return;
    setFile({ uri: asset.uri, name: asset.name ?? 'file', mimeType: asset.mimeType ?? undefined });
    if (!title.trim() && asset.name) {
      setTitle(asset.name.replace(/\.[a-zA-Z0-9]+$/, ''));
    }
  };

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (typeof batchId !== 'number') throw new Error('Select a batch');
      if (typeof subjectId !== 'number') throw new Error('Select a subject');
      if (!file) throw new Error('Pick a file to upload');
      const t = title.trim();
      if (!t) throw new Error('Enter a title');
      return await uploadBatchContent({ batchId, subjectId, title: t, status, file });
    },
    onSuccess: async () => {
      showToast('Uploaded', 'success');
      if (typeof batchId === 'number') {
        await queryClient.invalidateQueries({ queryKey: CONTENT_QUERY_KEYS.batchContents(batchId) });
      }
      const nav = navigation as unknown as { goBack?: () => void };
      nav.goBack?.();
    },
    onError: (e) => showToast(mapApiError(e).message || 'Upload failed', 'error'),
  });

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Upload content</Text>
      <Text style={styles.sub}>Upload a PDF, image, or document to a batch.</Text>

      <SelectField
        label="Batch"
        value={batchId}
        placeholder="Select batch"
        options={batches
          .filter((b) => typeof b.id === 'number')
          .map((b) => ({ value: b.id as number, label: b.displayName ?? b.codeName ?? `Batch ${b.id}` }))}
        onChange={(id) => {
          setBatchId(id);
          setSubjectId(undefined);
        }}
        searchable
        disabled={batches.length === 0}
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
        label="Status"
        value={status}
        placeholder="Select status"
        options={[
          { value: 'ACTIVE', label: 'Active' },
          { value: 'INACTIVE', label: 'Inactive' },
        ]}
        onChange={setStatus}
      />

      <Text style={styles.label}>Title</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Content title"
        placeholderTextColor={BATCH_UI.TEXT_DIM}
        style={styles.input}
      />

      <Text style={styles.label}>File</Text>
      <Pressable onPress={pickFile} style={({ pressed }) => [styles.secondaryBtn, pressed && styles.secondaryBtnPressed]}>
        <Text style={styles.secondaryBtnText}>{file ? `Change file (${file.name})` : 'Pick file'}</Text>
      </Pressable>
      {file ? <Text style={styles.fileHint}>Selected: {file.name}</Text> : null}

      <Pressable
        onPress={() => {
          if (uploadMutation.isPending) return;
          uploadMutation.mutate();
        }}
        style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed, uploadMutation.isPending && styles.primaryBtnDisabled]}
      >
        <Text style={styles.primaryBtnText}>{uploadMutation.isPending ? 'Uploading…' : 'Upload'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BATCH_UI.BG,
  },
  content: { padding: 16, paddingBottom: 32 },
  title: {
    color: BATCH_UI.TEXT,
    fontWeight: '900',
    fontSize: 18,
  },
  sub: {
    marginTop: 10,
    color: BATCH_UI.TEXT_MUTED,
    lineHeight: 20,
    marginBottom: 14,
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
  fileHint: {
    marginTop: 8,
    color: BATCH_UI.TEXT_MUTED,
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
});

