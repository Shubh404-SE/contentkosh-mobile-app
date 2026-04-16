import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CoursesStackParamList } from './CoursesStack';
import { COURSES_STACK } from '../../constants/navigation';
import { COURSE_QUERY_KEYS } from '../../constants/courseQueryKeys';
import {
  deleteCourse,
  listCoursesForExam,
  type CourseRecord,
} from '../../api/coursesApi';
import { listBusinessExams } from '../../api/examsApi';
import { useAuthStore } from '../../store/authStore';
import { resolveDisplayedCourseStatus } from '../../utils/courseStatus';
import { mapApiError } from '../../utils/mapApiError';
import { showToast } from '../../utils/toast';

type Nav = NativeStackNavigationProp<CoursesStackParamList, typeof COURSES_STACK.LIST>;
type R = RouteProp<CoursesStackParamList, typeof COURSES_STACK.LIST>;

export function CourseListScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<R>();
  const business = useAuthStore((s) => s.business);
  const role = useAuthStore((s) => s.user?.role);
  const businessId = business?.id;
  const isAdmin = role === 'ADMIN' || role === 'SUPERADMIN';
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExamId, setSelectedExamId] = useState<number | undefined>(undefined);

  const examsQuery = useQuery({
    queryKey: COURSE_QUERY_KEYS.exams(businessId ?? 0),
    queryFn: () => listBusinessExams(businessId!),
    enabled: typeof businessId === 'number',
  });

  useEffect(() => {
    if (examsQuery.data && examsQuery.data.length > 0 && selectedExamId === undefined) {
      const fromNav = route.params?.initialExamId;
      const pick =
        fromNav && examsQuery.data.some((e) => e.id === fromNav)
          ? fromNav
          : examsQuery.data[0]!.id;
      if (typeof pick === 'number') setSelectedExamId(pick);
    }
  }, [examsQuery.data, route.params?.initialExamId, selectedExamId]);

  useFocusEffect(
    useCallback(() => {
      const id = route.params?.initialExamId;
      if (typeof id === 'number') setSelectedExamId(id);
    }, [route.params?.initialExamId])
  );

  const coursesQuery = useQuery({
    queryKey: COURSE_QUERY_KEYS.courses(selectedExamId ?? 0),
    queryFn: () => listCoursesForExam(selectedExamId!, { include: 'subjects' }),
    enabled: typeof selectedExamId === 'number',
  });

  const deleteMutation = useMutation({
    mutationFn: (args: { examId: number; courseId: number }) => deleteCourse(args.examId, args.courseId),
    onSuccess: async () => {
      if (typeof selectedExamId === 'number') {
        await queryClient.invalidateQueries({ queryKey: COURSE_QUERY_KEYS.courses(selectedExamId) });
      }
      showToast('Course deleted', 'success');
    },
    onError: (e: unknown) => showToast(mapApiError(e).message, 'error'),
  });

  const exams = examsQuery.data ?? [];

  const extendedCourses: Array<CourseRecord & { examId: number; examName?: string }> = useMemo(() => {
    if (!coursesQuery.data || selectedExamId == null) return [];
    const examName = exams.find((e) => e.id === selectedExamId)?.name;
    const list = coursesQuery.data.map((c) => ({
      ...c,
      examId: selectedExamId,
      examName,
      status: resolveDisplayedCourseStatus(c),
    }));
    return list.sort(
      (a, b) =>
        (b.createdAt ? new Date(b.createdAt).getTime() : 0) -
        (a.createdAt ? new Date(a.createdAt).getTime() : 0)
    );
  }, [coursesQuery.data, exams, selectedExamId]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return extendedCourses;
    return extendedCourses.filter(
      (c) =>
        (c.name ?? '').toLowerCase().includes(q) ||
        (c.description ?? '').toLowerCase().includes(q)
    );
  }, [extendedCourses, searchQuery]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: isAdmin
        ? () => (
            <Pressable
              onPress={() => {
                if (selectedExamId == null) {
                  showToast('Select an exam first', 'error');
                  return;
                }
                navigation.navigate(COURSES_STACK.COURSE_FORM, {
                  mode: 'create',
                  examId: selectedExamId,
                });
              }}
              style={styles.headerBtn}
            >
              <Text style={styles.headerBtnText}>Add</Text>
            </Pressable>
          )
        : undefined,
    });
  }, [isAdmin, navigation, selectedExamId]);

  const onDelete = useCallback(
    (c: CourseRecord & { examId: number }) => {
      if (c.id == null) return;
      Alert.alert(
        'Delete course',
        `Delete "${c.name ?? 'this course'}"? Subjects under it will be removed.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              if (deleteMutation.isPending) return;
              deleteMutation.mutate({ examId: c.examId, courseId: c.id! });
            },
          },
        ]
      );
    },
    [deleteMutation]
  );

  if (examsQuery.isLoading && !examsQuery.data) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!businessId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.err}>Business context missing</Text>
      </View>
    );
  }

  if (exams.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>No exams found</Text>
        <Text style={styles.subtitle}>
          {isAdmin ? 'Create an exam first, then add courses to it.' : 'Nothing to show yet.'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.label}>Exam</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
        {exams.map((e) => {
          if (e.id == null) return null;
          const active = e.id === selectedExamId;
          return (
            <Pressable
              key={String(e.id)}
              onPress={() => setSelectedExamId(e.id)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{e.name ?? `Exam ${e.id}`}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <TextInput
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search courses..."
        placeholderTextColor="#6b7aa3"
        style={styles.search}
      />

      {coursesQuery.isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator />
        </View>
      ) : coursesQuery.isError ? (
        <View style={styles.centered}>
          <Text style={styles.err}>{mapApiError(coursesQuery.error).message}</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.title}>
            {searchQuery.trim() ? 'No courses match your search' : 'No courses in this exam'}
          </Text>
          {isAdmin && !searchQuery.trim() ? (
            <Pressable
              style={styles.primaryBtn}
              onPress={() => {
                if (selectedExamId == null) return;
                navigation.navigate(COURSES_STACK.COURSE_FORM, { mode: 'create', examId: selectedExamId });
              }}
            >
              <Text style={styles.primaryBtnText}>Add course</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <FlatList
          style={{ flex: 1 }}
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          refreshControl={
            <RefreshControl
              refreshing={coursesQuery.isFetching && !coursesQuery.isLoading}
              onRefresh={() => void coursesQuery.refetch()}
            />
          }
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.name ?? `Course ${item.id}`}</Text>
              {item.examName ? <Text style={styles.muted}>Exam: {item.examName}</Text> : null}
              <Text style={styles.muted}>Status: {item.status}</Text>
              <Text style={styles.muted}>Subjects: {item.subjects?.length ?? 0}</Text>
              <View style={styles.row}>
                <Pressable
                  style={styles.secondaryBtn}
                  onPress={() =>
                    navigation.navigate(COURSES_STACK.SUBJECTS, {
                      courseId: item.id!,
                      examId: item.examId,
                      courseName: item.name,
                    })
                  }
                >
                  <Text style={styles.secondaryBtnText}>Subjects</Text>
                </Pressable>
                {isAdmin ? (
                  <>
                    <Pressable
                      style={styles.secondaryBtn}
                      onPress={() =>
                        navigation.navigate(COURSES_STACK.COURSE_FORM, {
                          mode: 'edit',
                          examId: item.examId,
                          course: item,
                        })
                      }
                    >
                      <Text style={styles.secondaryBtnText}>Edit</Text>
                    </Pressable>
                    <Pressable style={styles.dangerOutline} onPress={() => onDelete(item)}>
                      <Text style={styles.dangerText}>Delete</Text>
                    </Pressable>
                  </>
                ) : null}
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0b1220', padding: 16, gap: 10 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  label: { color: '#cbd5e1', fontWeight: '700' },
  chipsRow: { maxHeight: 44 },
  chip: {
    borderWidth: 1,
    borderColor: '#24304d',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    marginRight: 8,
    backgroundColor: '#111a2e',
  },
  chipActive: { borderColor: '#2563eb', backgroundColor: '#172554' },
  chipText: { color: '#cbd5e1', fontWeight: '600' },
  chipTextActive: { color: '#dbeafe' },
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
  cardTitle: { color: '#f8fafc', fontSize: 17, fontWeight: '700' },
  muted: { color: '#94a3b8', fontSize: 13 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
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
  primaryBtn: {
    marginTop: 14,
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
  err: { color: '#fecaca', textAlign: 'center' },
  headerBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  headerBtnText: { color: '#93c5fd', fontWeight: '700', fontSize: 16 },
});
