import React, { useCallback, useLayoutEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CoursesStackParamList } from './CoursesStack';
import { COURSES_STACK } from '../../constants/navigation';
import { COURSE_QUERY_KEYS } from '../../constants/courseQueryKeys';
import { deleteSubject, listSubjectsForCourse, type SubjectRecord } from '../../api/subjectsApi';
import { useAuthStore } from '../../store/authStore';
import { mapApiError } from '../../utils/mapApiError';
import { showToast } from '../../utils/toast';

type Props = NativeStackScreenProps<CoursesStackParamList, typeof COURSES_STACK.SUBJECTS>;

export function CourseSubjectsScreen({ route, navigation }: Props) {
  const { courseId, examId, courseName } = route.params;
  const role = useAuthStore((s) => s.user?.role);
  const isAdmin = role === 'ADMIN';
  const queryClient = useQueryClient();

  const subjectsQuery = useQuery({
    queryKey: COURSE_QUERY_KEYS.subjects(examId, courseId),
    queryFn: () => listSubjectsForCourse(examId, courseId),
  });

  const deleteMutation = useMutation({
    mutationFn: (subjectId: number) => deleteSubject(examId, courseId, subjectId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: COURSE_QUERY_KEYS.subjects(examId, courseId) });
      await queryClient.invalidateQueries({ queryKey: COURSE_QUERY_KEYS.courseDetail(examId, courseId) });
      await queryClient.invalidateQueries({ queryKey: COURSE_QUERY_KEYS.courses(examId) });
      showToast('Subject deleted', 'success');
    },
    onError: (e: unknown) => showToast(mapApiError(e).message, 'error'),
  });

  const sorted = React.useMemo(() => {
    const list = subjectsQuery.data ?? [];
    return [...list].sort(
      (a, b) =>
        (b.createdAt ? new Date(b.createdAt).getTime() : 0) -
        (a.createdAt ? new Date(a.createdAt).getTime() : 0)
    );
  }, [subjectsQuery.data]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: courseName ? `${courseName} · Subjects` : 'Subjects',
      headerRight: isAdmin
        ? () => (
            <Pressable
              onPress={() =>
                navigation.navigate(COURSES_STACK.SUBJECT_FORM, {
                  mode: 'create',
                  examId,
                  courseId,
                })
              }
              style={styles.headerBtn}
            >
              <Text style={styles.headerBtnText}>Add</Text>
            </Pressable>
          )
        : undefined,
    });
  }, [courseId, courseName, examId, isAdmin, navigation]);

  const onDelete = useCallback(
    (s: SubjectRecord) => {
      if (s.id == null) return;
      Alert.alert(
        'Delete subject',
        `Delete "${s.name ?? 'this subject'}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              if (deleteMutation.isPending) return;
              deleteMutation.mutate(s.id!);
            },
          },
        ]
      );
    },
    [deleteMutation]
  );

  if (subjectsQuery.isLoading && !subjectsQuery.data) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (subjectsQuery.isError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.err}>{mapApiError(subjectsQuery.error).message}</Text>
      </View>
    );
  }

  if (sorted.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>No subjects yet</Text>
        <Text style={styles.subtitle}>
          {isAdmin ? 'Add a subject to organize materials under this course.' : 'No subjects available.'}
        </Text>
        {isAdmin ? (
          <Pressable
            style={styles.primaryBtn}
            onPress={() =>
              navigation.navigate(COURSES_STACK.SUBJECT_FORM, { mode: 'create', examId, courseId })
            }
          >
            <Text style={styles.primaryBtnText}>Add subject</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: '#0b1220' }}
      contentContainerStyle={styles.list}
      data={sorted}
      keyExtractor={(s) => String(s.id)}
      refreshControl={
        <RefreshControl
          refreshing={subjectsQuery.isFetching && !subjectsQuery.isLoading}
          onRefresh={() => void subjectsQuery.refetch()}
        />
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{item.name ?? `Subject ${item.id}`}</Text>
          <Text style={styles.muted}>Status: {item.status ?? '—'}</Text>
          {item.description ? <Text style={styles.desc}>{item.description}</Text> : null}
          {isAdmin ? (
            <View style={styles.row}>
              <Pressable
                style={styles.secondaryBtn}
                onPress={() =>
                  navigation.navigate(COURSES_STACK.SUBJECT_FORM, {
                    mode: 'edit',
                    examId,
                    courseId,
                    subject: item,
                  })
                }
              >
                <Text style={styles.secondaryBtnText}>Edit</Text>
              </Pressable>
              <Pressable style={styles.dangerOutline} onPress={() => onDelete(item)}>
                <Text style={styles.dangerText}>Delete</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0b1220' },
  centered: { flex: 1, backgroundColor: '#0b1220', alignItems: 'center', justifyContent: 'center', padding: 16 },
  list: { padding: 16, gap: 12, paddingBottom: 28 },
  card: {
    backgroundColor: '#111a2e',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#24304d',
    padding: 14,
    gap: 6,
  },
  cardTitle: { color: '#f8fafc', fontSize: 17, fontWeight: '700' },
  muted: { color: '#94a3b8', fontSize: 13 },
  desc: { color: '#cbd5e1' },
  row: { flexDirection: 'row', gap: 8, marginTop: 8 },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  secondaryBtnText: { color: '#93c5fd', fontWeight: '600' },
  dangerOutline: {
    borderWidth: 1,
    borderColor: '#f87171',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  dangerText: { color: '#fecaca', fontWeight: '600' },
  title: { color: '#f8fafc', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  subtitle: { marginTop: 8, color: '#94a3b8', textAlign: 'center' },
  primaryBtn: { marginTop: 14, backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
  err: { color: '#fecaca', textAlign: 'center' },
  headerBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  headerBtnText: { color: '#93c5fd', fontWeight: '700', fontSize: 16 },
});
