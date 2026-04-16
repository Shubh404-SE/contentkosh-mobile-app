import React, { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { BATCH_UI } from '../../constants/batchUi';
import { STUDENTS_QUERY_KEYS } from '../../constants/studentsQueryKeys';
import { getBusinessUsers } from '../../api/usersApi';
import { getAllBatches } from '../../api/batchesApi';
import type { BatchRecord } from '../../types/batch';
import { mapApiError } from '../../utils/mapApiError';
import { BATCHES_STACK, ROUTES } from '../../constants/navigation';
import type { StudentsStackParamList } from './StudentsStack';

type Props = NativeStackScreenProps<StudentsStackParamList, 'StudentDetail'>;

function batchTitle(b: BatchRecord): string {
  return b.displayName || b.codeName || `Batch #${b.id}`;
}

export function StudentDetailScreen({ route, navigation }: Props) {
  const { studentId } = route.params;
  const businessId = useAuthStore((s) => s.business?.id);

  const studentQuery = useQuery({
    queryKey: ['students', 'detail', businessId ?? 0, studentId],
    queryFn: async () => {
      const users = await getBusinessUsers(businessId!, 'STUDENT');
      const match = users.find((u) => u.id === studentId);
      if (!match) throw new Error('Student not found');
      return match;
    },
    enabled: typeof businessId === 'number',
  });

  const batchesQuery = useQuery({
    queryKey: STUDENTS_QUERY_KEYS.batchesWithUsers(),
    queryFn: () => getAllBatches('batchUsers,course'),
    enabled: typeof businessId === 'number',
  });

  const student = studentQuery.data;

  const enrolledBatches = useMemo(() => {
    const batches = batchesQuery.data ?? [];
    return batches.filter((b) => (b.batchUsers ?? []).some((bu) => bu.userId === studentId));
  }, [batchesQuery.data, studentId]);

  const goToBatch = (batchId: number) => {
    // Jump to Tabs.Batches and open the detail screen.
    const parent = navigation.getParent();
    if (!parent) return;
    const nav = parent as unknown as { navigate: (name: string, params?: unknown) => void };
    nav.navigate(ROUTES.APP.DRAWER_TABS, {
      screen: ROUTES.TABS.BATCHES,
      params: { screen: BATCHES_STACK.DETAIL, params: { batchId } },
    });
  };

  const isLoading = studentQuery.isLoading || batchesQuery.isLoading;
  const errorText =
    (studentQuery.error && mapApiError(studentQuery.error).message) ||
    (batchesQuery.error && mapApiError(batchesQuery.error).message) ||
    null;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={BATCH_UI.ACCENT} />
        </View>
      ) : errorText ? (
        <View style={styles.card}>
          <Text style={styles.title}>Could not load student</Text>
          <Text style={styles.sub}>{errorText}</Text>
          <Pressable
            onPress={() => {
              studentQuery.refetch();
              batchesQuery.refetch();
            }}
            style={({ pressed }) => [styles.retryBtn, pressed && styles.retryBtnPressed]}
          >
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : !student ? (
        <View style={styles.card}>
          <Text style={styles.title}>Student not found</Text>
          <Text style={styles.sub}>They may have been removed from this business.</Text>
        </View>
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.title}>{student.name || student.email}</Text>
            <Text style={styles.sub}>{student.email}</Text>
            <View style={styles.metaRow}>
              <View style={styles.pill}>
                <Text style={styles.pillText}>ID {student.id}</Text>
              </View>
              <View style={styles.pill}>
                <Text style={styles.pillText}>Role {student.role}</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Enrolled batches</Text>
            {batchesQuery.isFetching ? (
              <Text style={styles.sectionHint}>Refreshing…</Text>
            ) : enrolledBatches.length === 0 ? (
              <Text style={styles.sectionHint}>No batch enrollment found.</Text>
            ) : (
              enrolledBatches.map((b) => {
                if (typeof b.id !== 'number') return null;
                const course = b.course?.name ?? '';
                return (
                  <Pressable
                    key={b.id}
                    onPress={() => goToBatch(b.id!)}
                    style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                  >
                    <View style={styles.rowLeft}>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {batchTitle(b)}
                      </Text>
                      {course ? (
                        <Text style={styles.rowSub} numberOfLines={1}>
                          {course}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={styles.chev}>›</Text>
                  </Pressable>
                );
              })
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BATCH_UI.BG,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  center: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  card: {
    backgroundColor: BATCH_UI.CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER,
    padding: 16,
  },
  title: {
    color: BATCH_UI.TEXT,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  sub: {
    color: BATCH_UI.TEXT_MUTED,
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  pill: {
    backgroundColor: BATCH_UI.BG_ELEVATED,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER,
  },
  pillText: {
    color: BATCH_UI.TEXT_MUTED,
    fontSize: 12,
    fontWeight: '700',
  },
  section: {
    marginTop: 18,
  },
  sectionLabel: {
    color: BATCH_UI.TEXT_DIM,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  sectionHint: {
    color: BATCH_UI.TEXT_MUTED,
    fontSize: 14,
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: BATCH_UI.CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER,
    padding: 14,
    marginBottom: 8,
  },
  rowPressed: {
    backgroundColor: BATCH_UI.CARD_HOVER,
  },
  rowLeft: {
    flex: 1,
    marginRight: 12,
  },
  rowTitle: {
    color: BATCH_UI.TEXT,
    fontSize: 15,
    fontWeight: '800',
  },
  rowSub: {
    color: BATCH_UI.TEXT_MUTED,
    marginTop: 4,
    fontSize: 13,
  },
  chev: {
    color: BATCH_UI.TEXT_DIM,
    fontSize: 22,
    fontWeight: '300',
    marginTop: -2,
  },
  retryBtn: {
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER_STRONG,
    backgroundColor: BATCH_UI.BG_ELEVATED,
    alignSelf: 'flex-start',
  },
  retryBtnPressed: {
    opacity: 0.9,
  },
  retryText: {
    color: BATCH_UI.TEXT,
    fontWeight: '800',
  },
});

