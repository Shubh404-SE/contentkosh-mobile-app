import React, { useCallback, useLayoutEffect, useMemo } from 'react';
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
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ExamsStackParamList } from './ExamsStack';
import { COURSES_STACK, EXAMS_STACK, ROUTES } from '../../constants/navigation';
import { EXAM_QUERY_KEYS } from '../../constants/examQueryKeys';
import { deleteExam, listBusinessExams, type ExamRecord } from '../../api/examsApi';
import { useAuthStore } from '../../store/authStore';
import { mapApiError } from '../../utils/mapApiError';
import { showToast } from '../../utils/toast';

type Nav = NativeStackNavigationProp<ExamsStackParamList, typeof EXAMS_STACK.LIST>;

export function ExamListScreen() {
  const navigation = useNavigation<Nav>();
  const business = useAuthStore((s) => s.business);
  const role = useAuthStore((s) => s.user?.role);
  const businessId = business?.id;
  const isAdmin = role === 'ADMIN';
  const queryClient = useQueryClient();

  const examsQuery = useQuery({
    queryKey: EXAM_QUERY_KEYS.list(businessId ?? 0),
    queryFn: () => listBusinessExams(businessId!, 'courses'),
    enabled: typeof businessId === 'number',
  });

  useFocusEffect(
    useCallback(() => {
      if (typeof businessId === 'number') {
        void queryClient.invalidateQueries({ queryKey: EXAM_QUERY_KEYS.list(businessId) });
      }
    }, [businessId, queryClient])
  );

  const deleteMutation = useMutation({
    mutationFn: (examId: number) => deleteExam(businessId!, examId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: EXAM_QUERY_KEYS.list(businessId ?? 0) });
      showToast('Exam deleted', 'success');
    },
    onError: (e: unknown) => {
      showToast(mapApiError(e).message, 'error');
    },
  });

  const sortedExams = useMemo(() => {
    const list = examsQuery.data ?? [];
    return [...list].sort(
      (a, b) =>
        (b.createdAt ? new Date(b.createdAt).getTime() : 0) -
        (a.createdAt ? new Date(a.createdAt).getTime() : 0)
    );
  }, [examsQuery.data]);

  const onOpenCourses = useCallback(
    (exam: ExamRecord) => {
      if (exam.id == null) return;
      const parent = navigation.getParent();
      // Drawer now only hosts Tabs; navigate to hidden Courses tab so bottom bar stays visible.
      (parent as any)?.navigate(ROUTES.APP.DRAWER_TABS, {
        screen: ROUTES.TABS.COURSES,
        params: { screen: COURSES_STACK.LIST, params: { initialExamId: exam.id } },
      });
    },
    [navigation]
  );

  const onConfirmDelete = useCallback(
    (exam: ExamRecord) => {
      if (!businessId || exam.id == null) return;
      Alert.alert(
        'Delete exam',
        `Delete "${exam.name ?? 'this exam'}"? This cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              if (deleteMutation.isPending) return;
              deleteMutation.mutate(exam.id!);
            },
          },
        ]
      );
    },
    [businessId, deleteMutation]
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: isAdmin
        ? () => (
            <Pressable
              onPress={() => navigation.navigate(EXAMS_STACK.FORM, { mode: 'create' })}
              style={styles.headerBtn}
            >
              <Text style={styles.headerBtnText}>Add</Text>
            </Pressable>
          )
        : undefined,
    });
  }, [isAdmin, navigation]);

  if (examsQuery.isLoading && !examsQuery.data) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (examsQuery.isError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          {mapApiError(examsQuery.error).message || 'Failed to load exams'}
        </Text>
      </View>
    );
  }

  if (sortedExams.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>No exams created</Text>
        <Text style={styles.subtitle}>
          {isAdmin ? 'Create an exam to organize courses and subjects.' : 'Nothing to show yet.'}
        </Text>
        {isAdmin ? (
          <Pressable
            style={styles.primaryBtn}
            onPress={() => navigation.navigate(EXAMS_STACK.FORM, { mode: 'create' })}
          >
            <Text style={styles.primaryBtnText}>Create exam</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <FlatList
      data={sortedExams}
      keyExtractor={(item) => String(item.id ?? Math.random())}
      refreshControl={
        <RefreshControl
          refreshing={examsQuery.isFetching && !examsQuery.isLoading}
          onRefresh={() => void examsQuery.refetch()}
        />
      }
      contentContainerStyle={styles.listContent}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{item.name ?? `Exam ${item.id}`}</Text>
          {item.code ? <Text style={styles.muted}>Code: {item.code}</Text> : null}
          {item.description ? <Text style={styles.desc}>{item.description}</Text> : null}
          <Text style={styles.muted}>
            Courses: {item.courses?.length ?? 0}
          </Text>
          <View style={styles.row}>
            <Pressable style={styles.secondaryBtn} onPress={() => onOpenCourses(item)}>
              <Text style={styles.secondaryBtnText}>Courses</Text>
            </Pressable>
            {isAdmin ? (
              <>
                <Pressable
                  style={styles.secondaryBtn}
                  onPress={() => navigation.navigate(EXAMS_STACK.FORM, { mode: 'edit', exam: item })}
                >
                  <Text style={styles.secondaryBtnText}>Edit</Text>
                </Pressable>
                <Pressable
                  style={styles.dangerOutline}
                  onPress={() => onConfirmDelete(item)}
                  disabled={deleteMutation.isPending}
                >
                  <Text style={styles.dangerText}>Delete</Text>
                </Pressable>
              </>
            ) : null}
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    backgroundColor: '#0b1220',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  listContent: { padding: 16, paddingBottom: 32, gap: 12 },
  card: {
    backgroundColor: '#111a2e',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#24304d',
    padding: 14,
    gap: 6,
  },
  cardTitle: { color: '#f8fafc', fontSize: 17, fontWeight: '700' },
  desc: { color: '#cbd5e1', fontSize: 14, lineHeight: 20 },
  muted: { color: '#94a3b8', fontSize: 13 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
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
  title: { color: '#f8fafc', fontSize: 20, fontWeight: '700', textAlign: 'center' },
  subtitle: { marginTop: 8, color: '#94a3b8', textAlign: 'center' },
  primaryBtn: {
    marginTop: 18,
    backgroundColor: '#2563eb',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryBtnText: { color: '#ffffff', fontWeight: '700' },
  errorText: { color: '#fecaca', textAlign: 'center' },
  headerBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  headerBtnText: { color: '#93c5fd', fontWeight: '700', fontSize: 16 },
});
