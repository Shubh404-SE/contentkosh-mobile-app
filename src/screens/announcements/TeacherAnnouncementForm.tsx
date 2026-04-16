import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllBatches } from '../../api/batchesApi';
import { createAnnouncement, updateAnnouncement } from '../../api/announcementsApi';
import { ANNOUNCEMENT_QUERY_KEYS } from '../../constants/announcementQueryKeys';
import type { Announcement, CreateAnnouncementRequest, UpdateAnnouncementRequest } from '../../types/announcement';
import { DateTimeField } from '../../components/announcements/DateTimeField';
import {
  defaultEndDate,
  toISODateTime,
  toggleSetItem,
} from '../../utils/announcementDate';
import { mapApiError } from '../../utils/mapApiError';

type BatchRow = { id: number; label: string };

type Props = {
  initial: Announcement | null;
  onCancel: () => void;
  onSaved: () => void;
};

function batchLabelFromRow(b: { id?: number; displayName?: string; codeName?: string }): BatchRow | null {
  if (b.id == null) return null;
  const label =
    b.displayName && b.codeName
      ? `${b.displayName} (${b.codeName})`
      : b.displayName || b.codeName || `Batch #${b.id}`;
  return { id: b.id, label };
}

export function TeacherAnnouncementForm({ initial, onCancel, onSaved }: Props) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(initial?.id);

  const [heading, setHeading] = useState('');
  const [content, setContent] = useState('');
  const [startDate, setStartDate] = useState(() => new Date());
  const [endDate, setEndDate] = useState(() => new Date(defaultEndDate()));
  const [visibleToAdmins, setVisibleToAdmins] = useState(false);
  const [visibleToTeachers, setVisibleToTeachers] = useState(true);
  const [visibleToStudents, setVisibleToStudents] = useState(true);
  const [targetAllBatches, setTargetAllBatches] = useState(false);
  const [selectedBatchIds, setSelectedBatchIds] = useState<Set<number>>(new Set());
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [metaLoading, setMetaLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const resetForCreate = useCallback(() => {
    const now = new Date();
    setHeading('');
    setContent('');
    setStartDate(now);
    setEndDate(new Date(defaultEndDate()));
    setVisibleToAdmins(false);
    setVisibleToTeachers(true);
    setVisibleToStudents(true);
    setTargetAllBatches(false);
    setSelectedBatchIds(new Set());
  }, []);

  useEffect(() => {
    if (initial?.id) {
      setHeading(initial.heading ?? '');
      setContent(initial.content ?? '');
      const s = toISODateTime(initial.startDate);
      const e = toISODateTime(initial.endDate);
      if (s) setStartDate(new Date(s));
      if (e) setEndDate(new Date(e));
      setVisibleToAdmins(initial.visibleToAdmins ?? false);
      setVisibleToTeachers(initial.visibleToTeachers ?? true);
      setVisibleToStudents(initial.visibleToStudents ?? true);
      setTargetAllBatches(initial.targetAllBatches ?? false);
      const bIds = new Set<number>();
      for (const t of initial.targets ?? []) {
        if (t.batchId != null) bIds.add(t.batchId);
      }
      setSelectedBatchIds(bIds);
    } else {
      resetForCreate();
    }
  }, [initial, resetForCreate]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setMetaLoading(true);
      try {
        const raw = await getAllBatches('course');
        const rows: BatchRow[] = [];
        for (const b of raw) {
          const row = batchLabelFromRow(b);
          if (row) rows.push(row);
        }
        if (!cancelled) setBatches(rows.sort((a, b) => a.label.localeCompare(b.label)));
      } catch {
        if (!cancelled) setBatches([]);
      } finally {
        if (!cancelled) setMetaLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const mutation = useMutation({
    mutationFn: async () => {
      const startIso = startDate.toISOString();
      const endIso = endDate.toISOString();
      const base: CreateAnnouncementRequest = {
        heading: heading.trim(),
        content: content.trim(),
        startDate: startIso,
        endDate: endIso,
        isActive: true,
        visibleToAdmins,
        visibleToTeachers,
        visibleToStudents,
        scope: 'BATCH',
        targetAllCourses: false,
        targetAllBatches,
        batchIds: !targetAllBatches ? Array.from(selectedBatchIds) : undefined,
      };
      if (initial?.id) {
        const updateBody: UpdateAnnouncementRequest = base;
        return updateAnnouncement(initial.id, updateBody);
      }
      return createAnnouncement(base);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ANNOUNCEMENT_QUERY_KEYS.bundle() });
      onSaved();
    },
    onError: (e: unknown) => {
      setFormError(mapApiError(e).message);
    },
  });

  const submit = () => {
    if (mutation.isPending) return;
    setFormError(null);
    if (!heading.trim() || !content.trim()) {
      setFormError('Heading and content are required');
      return;
    }
    if (!visibleToStudents) {
      setFormError('Announcements for students must remain visible to students');
      return;
    }
    if (endDate.getTime() <= startDate.getTime()) {
      setFormError('End time must be after start time');
      return;
    }
    if (!targetAllBatches && selectedBatchIds.size === 0) {
      setFormError('Select at least one batch, or choose all your batches');
      return;
    }
    mutation.mutate();
  };

  const toggleBatch = (id: number) => {
    setSelectedBatchIds((prev) => toggleSetItem(prev, id));
  };

  const batchList = useMemo(() => batches, [batches]);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <Text style={styles.hint}>Students in selected batches will see this during the active time window.</Text>

      <Text style={styles.label}>Heading</Text>
      <TextInput
        value={heading}
        onChangeText={setHeading}
        placeholder="e.g. Homework deadline"
        placeholderTextColor="#64748b"
        style={styles.input}
      />
      <Text style={styles.counter}>{heading.trim().length}/120</Text>

      <Text style={styles.label}>Content</Text>
      <TextInput
        value={content}
        onChangeText={setContent}
        placeholder="Write the announcement details here…"
        placeholderTextColor="#64748b"
        style={[styles.input, styles.textarea]}
        multiline
      />

      <DateTimeField label="Starts" value={startDate} onChange={setStartDate} />
      <DateTimeField label="Ends" value={endDate} onChange={setEndDate} minimumDate={startDate} />

      <Text style={styles.sectionTitle}>Audience</Text>
      <Text style={styles.subtle}>Students must remain selected.</Text>
      <View style={styles.row}>
        <Text style={styles.switchLabel}>Admins</Text>
        <Switch value={visibleToAdmins} onValueChange={setVisibleToAdmins} />
      </View>
      <View style={styles.row}>
        <Text style={styles.switchLabel}>Teachers</Text>
        <Switch value={visibleToTeachers} onValueChange={setVisibleToTeachers} />
      </View>
      <View style={styles.row}>
        <Text style={styles.switchLabel}>Students</Text>
        <Switch value={visibleToStudents} onValueChange={setVisibleToStudents} />
      </View>

      <View style={styles.row}>
        <Text style={styles.switchLabel}>All batches I belong to</Text>
        <Switch value={targetAllBatches} onValueChange={setTargetAllBatches} />
      </View>

      {!targetAllBatches ? (
        <View style={styles.batchBox}>
          {metaLoading ? (
            <ActivityIndicator color="#94a3b8" />
          ) : batchList.length === 0 ? (
            <Text style={styles.subtle}>No batches found.</Text>
          ) : (
            batchList.map((b) => (
              <Pressable key={b.id} style={styles.batchRow} onPress={() => toggleBatch(b.id)}>
                <Text style={styles.check}>{selectedBatchIds.has(b.id) ? '☑' : '☐'}</Text>
                <Text style={styles.batchText}>{b.label}</Text>
              </Pressable>
            ))
          )}
        </View>
      ) : null}

      {formError ? <Text style={styles.error}>{formError}</Text> : null}

      <View style={styles.actions}>
        <Pressable onPress={onCancel} style={styles.secondaryBtn} disabled={mutation.isPending}>
          <Text style={styles.secondaryText}>Cancel</Text>
        </Pressable>
        <Pressable onPress={submit} style={styles.primaryBtn} disabled={mutation.isPending || metaLoading}>
          {mutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryText}>{isEdit ? 'Save changes' : 'Publish'}</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#0b1220' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  hint: { color: '#94a3b8', fontSize: 13, marginBottom: 16 },
  label: { color: '#cbd5e1', fontSize: 13, marginBottom: 6, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#f8fafc',
    fontSize: 15,
    backgroundColor: '#111827',
  },
  textarea: { minHeight: 120, textAlignVertical: 'top' },
  counter: { color: '#64748b', fontSize: 12, marginTop: 4, marginBottom: 12 },
  sectionTitle: { color: '#e2e8f0', fontSize: 15, fontWeight: '700', marginTop: 8 },
  subtle: { color: '#64748b', fontSize: 12, marginBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  switchLabel: { color: '#e2e8f0', fontSize: 14 },
  batchBox: {
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 8,
    maxHeight: 200,
  },
  batchRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  check: { color: '#38bdf8', width: 28, fontSize: 16 },
  batchText: { color: '#e2e8f0', fontSize: 14, flex: 1 },
  error: { color: '#fca5a5', marginTop: 8, marginBottom: 4 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 20 },
  secondaryBtn: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: '#475569' },
  secondaryText: { color: '#e2e8f0', fontSize: 15 },
  primaryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#2563eb',
    minWidth: 120,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
