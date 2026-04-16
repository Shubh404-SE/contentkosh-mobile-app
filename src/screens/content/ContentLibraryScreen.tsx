import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLayoutEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchContentFileArrayBuffer, listBatchContents, type ContentRecord } from '../../api/contentsApi';
import { getAllBatches } from '../../api/batchesApi';
import { listSubjectsForCurrentUser } from '../../api/subjectsApi';
import type { BatchRecord } from '../../types/batch';
import { CONTENT_QUERY_KEYS } from '../../constants/contentQueryKeys';
import { shareContentFileFromBuffer } from '../../utils/contentOpen';
import { buildSubjectsByCourseIndex } from '../../utils/subjectsByCourseIndex';
import { mapApiError } from '../../utils/mapApiError';
import { showToast } from '../../utils/toast';
import { SelectField } from '../../components/ui/SelectField';
import { useAuthStore } from '../../store/authStore';
import { CONTENT_STACK } from '../../constants/navigation';
import type { ContentStackParamList } from './ContentStack';

function sortBatchesDesc(batches: BatchRecord[]): BatchRecord[] {
  return [...batches].sort(
    (a, b) =>
      (b.createdAt ? new Date(b.createdAt).getTime() : 0) -
      (a.createdAt ? new Date(a.createdAt).getTime() : 0)
  );
}

export function ContentLibraryScreen() {
  const queryClient = useQueryClient();
  const navigation = useNavigation<NativeStackNavigationProp<ContentStackParamList, typeof CONTENT_STACK.LIBRARY>>();
  const role = useAuthStore((s) => s.user?.role);
  const canAdd = role === 'ADMIN' || role === 'SUPERADMIN' || role === 'TEACHER';
  const canManage = canAdd;
  const [selectedBatchId, setSelectedBatchId] = useState<number | undefined>(undefined);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');

  const batchesQuery = useQuery({
    queryKey: CONTENT_QUERY_KEYS.batches(),
    queryFn: async () => sortBatchesDesc(await getAllBatches()),
  });

  const subjectsQuery = useQuery({
    queryKey: CONTENT_QUERY_KEYS.subjectsUser(),
    queryFn: () => listSubjectsForCurrentUser(),
  });

  const subjectsIndex = useMemo(
    () => buildSubjectsByCourseIndex(subjectsQuery.data ?? []),
    [subjectsQuery.data]
  );

  useEffect(() => {
    const batches = batchesQuery.data ?? [];
    if (!selectedBatchId && batches.length > 0) {
      setSelectedBatchId(batches[0]!.id);
    }
  }, [batchesQuery.data, selectedBatchId]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: canAdd
        ? () => (
            <Pressable
              onPress={() => navigation.navigate(CONTENT_STACK.UPLOAD)}
              style={({ pressed }) => [styles.headerBtn, pressed && styles.headerBtnPressed]}
            >
              <Text style={styles.headerBtnText}>Add</Text>
            </Pressable>
          )
        : undefined,
    });
  }, [canAdd, navigation]);

  const selectedBatch = useMemo(
    () => (batchesQuery.data ?? []).find((b) => b.id === selectedBatchId),
    [batchesQuery.data, selectedBatchId]
  );

  const selectedCourseId = selectedBatch?.courseId;

  const subjectsForSelectedBatch = useMemo(() => {
    if (typeof selectedCourseId !== 'number') return [];
    return subjectsIndex.subjectsByCourseId.get(selectedCourseId) ?? [];
  }, [selectedCourseId, subjectsIndex.subjectsByCourseId]);

  const subjectIdsForSelectedCourse = useMemo(() => {
    if (typeof selectedCourseId !== 'number') return undefined;
    return subjectsIndex.subjectIdsByCourseId.get(selectedCourseId);
  }, [selectedCourseId, subjectsIndex.subjectIdsByCourseId]);

  useEffect(() => {
    if (selectedSubjectId === undefined) return;
    if (!subjectIdsForSelectedCourse?.has(selectedSubjectId)) {
      setSelectedSubjectId(undefined);
    }
  }, [selectedSubjectId, subjectIdsForSelectedCourse]);

  const contentsQuery = useQuery({
    queryKey: CONTENT_QUERY_KEYS.batchContents(selectedBatchId ?? 0),
    queryFn: () =>
      listBatchContents(selectedBatchId!, {
        status: 'ACTIVE',
      }),
    enabled: typeof selectedBatchId === 'number',
  });

  const filteredContents = useMemo(() => {
    const items = contentsQuery.data ?? [];
    const q = searchQuery.trim().toLowerCase();
    return items
      .filter((c) => {
        if (selectedSubjectId === undefined) return true;
        return c.subjectId === selectedSubjectId;
      })
      .filter((c) => {
        if (!q) return true;
        return (c.title ?? '').toLowerCase().includes(q);
      })
      .sort(
        (a, b) =>
          (b.createdAt ? new Date(b.createdAt).getTime() : 0) -
          (a.createdAt ? new Date(a.createdAt).getTime() : 0)
      );
  }, [contentsQuery.data, searchQuery, selectedSubjectId]);

  const openMutation = useMutation({
    mutationFn: async (c: ContentRecord) => {
      if (c.id == null) throw new Error('Invalid content id');
      const data = await fetchContentFileArrayBuffer(c.id);
      await shareContentFileFromBuffer({ content: c, data });
    },
    onError: (e: unknown) => {
      showToast(mapApiError(e).message || 'Could not open file', 'error');
    },
  });

  const onOpen = useCallback(
    (c: ContentRecord) => {
      if (openMutation.isPending) return;
      openMutation.mutate(c);
    },
    [openMutation]
  );

  const batches = batchesQuery.data ?? [];

  if (batchesQuery.isLoading || subjectsQuery.isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (batchesQuery.isError || subjectsQuery.isError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.err}>
          {mapApiError(batchesQuery.error ?? subjectsQuery.error).message || 'Failed to load data'}
        </Text>
      </View>
    );
  }

  if (batches.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>No batches available</Text>
        <Text style={styles.subtitle}>You need a batch assignment to see contents.</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <SelectField
        label="Batch"
        value={selectedBatchId}
        placeholder="Select batch"
        searchable
        options={batches
          .filter((b) => typeof b.id === 'number')
          .map((b) => ({ value: b.id as number, label: b.displayName ?? b.codeName ?? `Batch ${b.id}` }))}
        onChange={(id) => {
          setSelectedBatchId(id);
          setSelectedSubjectId(undefined);
        }}
      />

      <SelectField
        label="Subject (optional)"
        value={selectedSubjectId}
        placeholder="All subjects"
        searchable
        options={[
          { value: -1 as unknown as number, label: 'All' },
          ...subjectsForSelectedBatch
            .filter((s) => typeof s.id === 'number')
            .map((s) => ({ value: s.id as number, label: s.name ?? `Subject ${s.id}` })),
        ]}
        onChange={(id) => setSelectedSubjectId(id === (-1 as unknown as number) ? undefined : id)}
        disabled={subjectsForSelectedBatch.length === 0}
      />

      <TextInput
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search by title..."
        placeholderTextColor="#6b7aa3"
        style={styles.search}
      />

      {!selectedBatchId || contentsQuery.isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator />
        </View>
      ) : contentsQuery.isError ? (
        <View style={styles.centered}>
          <Text style={styles.err}>{mapApiError(contentsQuery.error).message}</Text>
        </View>
      ) : filteredContents.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.title}>{searchQuery.trim() ? 'No matching contents' : 'No contents yet'}</Text>
          <Text style={styles.subtitle}>
            {searchQuery.trim()
              ? 'Try a different search or clear subject filters.'
              : 'Uploaded files for this batch will show up here.'}
          </Text>
        </View>
      ) : (
        <FlatList
          style={{ flex: 1 }}
          data={filteredContents}
          keyExtractor={(c) => String(c.id)}
          refreshControl={
            <RefreshControl
              refreshing={contentsQuery.isFetching && !contentsQuery.isLoading}
              onRefresh={async () => {
                await queryClient.invalidateQueries({ queryKey: CONTENT_QUERY_KEYS.batchContents(selectedBatchId) });
              }}
            />
          }
          contentContainerStyle={styles.list}
          initialNumToRender={12}
          windowSize={7}
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => onOpen(item)}
              disabled={openMutation.isPending}
            >
              <View style={styles.cardTopRow}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                {canManage && typeof item.id === 'number' ? (
                  <View style={styles.cardActions}>
                    <Pressable
                      onPress={() => navigation.navigate(CONTENT_STACK.EDIT, { contentId: item.id! })}
                      style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
                    >
                      <Text style={styles.actionBtnText}>Edit</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
              <Text style={styles.meta}>
                {item.type} · {item.subject?.name ? `Subject: ${item.subject.name}` : 'No subject'}
              </Text>
              {item.createdAt ? <Text style={styles.meta}>Added {new Date(item.createdAt).toLocaleString()}</Text> : null}
              <Text style={styles.tapHint}>{openMutation.isPending ? 'Opening…' : 'Tap to open / share'}</Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0b1220', padding: 16, gap: 8 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  sectionLabel: { color: '#cbd5e1', fontWeight: '700' },
  search: {
    borderWidth: 1,
    borderColor: '#24304d',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#f8fafc',
    backgroundColor: '#111a2e',
  },
  list: { paddingBottom: 28, gap: 12 },
  card: {
    backgroundColor: '#111a2e',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#24304d',
    padding: 14,
    gap: 6,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    borderWidth: 1,
    borderColor: '#2563eb',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#0f172a',
  },
  actionBtnPressed: { opacity: 0.9 },
  actionBtnText: { color: '#93c5fd', fontWeight: '800', fontSize: 12 },
  cardTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '700' },
  meta: { color: '#94a3b8', fontSize: 13 },
  tapHint: { color: '#93c5fd', fontSize: 12, marginTop: 6, fontWeight: '600' },
  title: { color: '#f8fafc', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  subtitle: { marginTop: 8, color: '#94a3b8', textAlign: 'center' },
  err: { color: '#fecaca', textAlign: 'center' },
  headerBtn: { paddingHorizontal: 12, paddingVertical: 8, marginRight: 6 },
  headerBtnPressed: { opacity: 0.9 },
  headerBtnText: { color: '#93c5fd', fontWeight: '800', fontSize: 16 },
});
