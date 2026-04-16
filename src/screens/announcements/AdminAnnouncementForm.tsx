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
import { getBusinessExams } from '../../api/examsApi';
import { createAnnouncement, updateAnnouncement } from '../../api/announcementsApi';
import { ANNOUNCEMENT_QUERY_KEYS } from '../../constants/announcementQueryKeys';
import type {
  Announcement,
  AnnouncementScope,
  CreateAnnouncementRequest,
  UpdateAnnouncementRequest,
} from '../../types/announcement';
import { DateTimeField } from '../../components/announcements/DateTimeField';
import { defaultEndDate, toISODateTime, toggleSetItem } from '../../utils/announcementDate';
import { mapApiError } from '../../utils/mapApiError';

type CourseRow = { id: number; name: string };
type BatchRow = { id: number; label: string };

type Props = {
  businessId: number;
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

export function AdminAnnouncementForm({ businessId, initial, onCancel, onSaved }: Props) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(initial?.id);

  const [heading, setHeading] = useState('');
  const [content, setContent] = useState('');
  const [startDate, setStartDate] = useState(() => new Date());
  const [endDate, setEndDate] = useState(() => new Date(defaultEndDate()));
  const [scope, setScope] = useState<AnnouncementScope>('BATCH');
  const [visibleToAdmins, setVisibleToAdmins] = useState(true);
  const [visibleToTeachers, setVisibleToTeachers] = useState(true);
  const [visibleToStudents, setVisibleToStudents] = useState(true);
  const [targetAllCourses, setTargetAllCourses] = useState(false);
  const [targetAllBatches, setTargetAllBatches] = useState(false);
  const [selectedCourseIds, setSelectedCourseIds] = useState<Set<number>>(new Set());
  const [selectedBatchIds, setSelectedBatchIds] = useState<Set<number>>(new Set());
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [metaLoading, setMetaLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const resetForCreate = useCallback(() => {
    const now = new Date();
    setHeading('');
    setContent('');
    setStartDate(now);
    setEndDate(new Date(defaultEndDate()));
    setScope('BATCH');
    setVisibleToAdmins(true);
    setVisibleToTeachers(true);
    setVisibleToStudents(true);
    setTargetAllCourses(false);
    setTargetAllBatches(false);
    setSelectedCourseIds(new Set());
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
      setScope((initial.scope as AnnouncementScope) ?? 'BATCH');
      setVisibleToAdmins(initial.visibleToAdmins ?? false);
      setVisibleToTeachers(initial.visibleToTeachers ?? false);
      setVisibleToStudents(initial.visibleToStudents ?? false);
      setTargetAllCourses(initial.targetAllCourses ?? false);
      setTargetAllBatches(initial.targetAllBatches ?? false);
      const cIds = new Set<number>();
      const bIds = new Set<number>();
      for (const t of initial.targets ?? []) {
        if (t.courseId != null) cIds.add(t.courseId);
        if (t.batchId != null) bIds.add(t.batchId);
      }
      setSelectedCourseIds(cIds);
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
        const examsRes = await getBusinessExams(businessId, 'courses');
        const fetchedExams = examsRes.data ?? [];
        const courseMap = new Map<number, CourseRow>();
        for (const exam of fetchedExams) {
          const examCourses = exam.courses ?? [];
          for (const course of examCourses) {
            if (course?.id != null && course.name) {
              courseMap.set(course.id, { id: course.id, name: course.name });
            }
          }
        }
        const courseRows = Array.from(courseMap.values()).sort((a, b) => a.name.localeCompare(b.name));

        const rawBatches = await getAllBatches('course');
        const batchRows: BatchRow[] = [];
        for (const b of rawBatches) {
          const row = batchLabelFromRow(b);
          if (row) batchRows.push(row);
        }
        batchRows.sort((a, b) => a.label.localeCompare(b.label));

        if (!cancelled) {
          setCourses(courseRows);
          setBatches(batchRows);
        }
      } catch {
        if (!cancelled) {
          setCourses([]);
          setBatches([]);
        }
      } finally {
        if (!cancelled) setMetaLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [businessId]);

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
        scope,
        targetAllCourses: scope === 'COURSE' ? targetAllCourses : false,
        targetAllBatches: scope === 'BATCH' ? targetAllBatches : false,
        courseIds: scope === 'COURSE' && !targetAllCourses ? Array.from(selectedCourseIds) : undefined,
        batchIds: scope === 'BATCH' && !targetAllBatches ? Array.from(selectedBatchIds) : undefined,
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
    if (endDate.getTime() <= startDate.getTime()) {
      setFormError('End time must be after start time');
      return;
    }
    if (!visibleToAdmins && !visibleToTeachers && !visibleToStudents) {
      setFormError('Select at least one audience');
      return;
    }
    if (scope === 'COURSE' && !targetAllCourses && selectedCourseIds.size === 0) {
      setFormError('Select at least one course, or choose all courses');
      return;
    }
    if (scope === 'BATCH' && !targetAllBatches && selectedBatchIds.size === 0) {
      setFormError('Select at least one batch, or choose all batches');
      return;
    }
    mutation.mutate();
  };

  const toggleCourse = (id: number) => {
    setSelectedCourseIds((prev) => toggleSetItem(prev, id));
  };

  const toggleBatch = (id: number) => {
    setSelectedBatchIds((prev) => toggleSetItem(prev, id));
  };

  const scopeHint = useMemo(
    () => (scope === 'COURSE' ? 'courses' : 'batches'),
    [scope]
  );

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <Text style={styles.hint}>Choose who can see it and which {scopeHint} it targets.</Text>

      <Text style={styles.label}>Heading</Text>
      <TextInput
        value={heading}
        onChangeText={setHeading}
        placeholder="e.g. Midterm schedule update"
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

      <Text style={styles.sectionTitle}>Scope</Text>
      <View style={styles.scopeRow}>
        <Pressable
          onPress={() => setScope('COURSE')}
          style={[styles.scopeChip, scope === 'COURSE' ? styles.scopeChipOn : undefined]}
        >
          <Text style={styles.scopeChipText}>By course</Text>
        </Pressable>
        <Pressable
          onPress={() => setScope('BATCH')}
          style={[styles.scopeChip, scope === 'BATCH' ? styles.scopeChipOn : undefined]}
        >
          <Text style={styles.scopeChipText}>By batch</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>Audience</Text>
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

      {scope === 'COURSE' ? (
        <>
          <View style={styles.row}>
            <Text style={styles.switchLabel}>All courses</Text>
            <Switch value={targetAllCourses} onValueChange={setTargetAllCourses} />
          </View>
          {!targetAllCourses ? (
            <View style={styles.batchBox}>
              {metaLoading ? (
                <ActivityIndicator color="#94a3b8" />
              ) : courses.length === 0 ? (
                <Text style={styles.subtle}>No courses found.</Text>
              ) : (
                courses.map((c) => (
                  <Pressable key={c.id} style={styles.batchRow} onPress={() => toggleCourse(c.id)}>
                    <Text style={styles.check}>{selectedCourseIds.has(c.id) ? '☑' : '☐'}</Text>
                    <Text style={styles.batchText}>{c.name}</Text>
                  </Pressable>
                ))
              )}
            </View>
          ) : null}
        </>
      ) : (
        <>
          <View style={styles.row}>
            <Text style={styles.switchLabel}>All batches</Text>
            <Switch value={targetAllBatches} onValueChange={setTargetAllBatches} />
          </View>
          {!targetAllBatches ? (
            <View style={styles.batchBox}>
              {metaLoading ? (
                <ActivityIndicator color="#94a3b8" />
              ) : batches.length === 0 ? (
                <Text style={styles.subtle}>No batches found.</Text>
              ) : (
                batches.map((b) => (
                  <Pressable key={b.id} style={styles.batchRow} onPress={() => toggleBatch(b.id)}>
                    <Text style={styles.check}>{selectedBatchIds.has(b.id) ? '☑' : '☐'}</Text>
                    <Text style={styles.batchText}>{b.label}</Text>
                  </Pressable>
                ))
              )}
            </View>
          ) : null}
        </>
      )}

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
  scopeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  scopeChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#475569',
  },
  scopeChipOn: { backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' },
  scopeChipText: { color: '#e2e8f0', fontSize: 14 },
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
