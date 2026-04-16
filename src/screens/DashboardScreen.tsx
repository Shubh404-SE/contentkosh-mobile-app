import React, { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getDashboard, type DashboardResponse } from '../api/dashboardApi';
import { useAuthStore } from '../store/authStore';
import { mapApiError } from '../utils/mapApiError';
import { BATCHES_STACK, ROUTES } from '../constants/navigation';
import { DASHBOARD_QUERY_KEY } from '../constants/dashboardQueryKeys';
import type { AppTabsParamList } from '../navigation/AppTabs';

type StatCardModel = { label: string; value: number; statKey: string };

type DashboardNavigation = BottomTabNavigationProp<AppTabsParamList, typeof ROUTES.TABS.HOME>;

function toStatCards(stats?: Record<string, number | undefined>): StatCardModel[] {
  if (!stats) return [];
  const entries = Object.entries(stats)
    .filter(([, v]) => typeof v === 'number')
    .map(([k, v]) => ({ key: k, value: v as number }));

  const labelByKey: Record<string, string> = {
    totalUsers: 'Users',
    totalTeachers: 'Teachers',
    totalStudents: 'Students',
    totalExams: 'Exams',
    totalCourses: 'Courses',
    totalBatches: 'Batches',
    totalContent: 'Content',
    activeAnnouncements: 'Announcements',
    enrolledBatches: 'Batches',
  };

  return entries.map(({ key, value }) => ({
    statKey: key,
    label: labelByKey[key] ?? key,
    value,
  }));
}

function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.errorBanner}>
      <Text style={styles.errorText}>{message}</Text>
      <TouchableOpacity onPress={onRetry} style={styles.retryButton}>
        <Text style={styles.retryText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
}

function StatGrid({
  cards,
  onPressStat,
}: {
  cards: StatCardModel[];
  onPressStat: (statKey: string) => void;
}) {
  const batchKeys = new Set(['totalBatches', 'enrolledBatches']);
  return (
    <View style={styles.grid}>
      {cards.map((c) => {
        const isBatch = batchKeys.has(c.statKey);
        const inner = (
          <>
            <Text style={styles.statValue}>{c.value}</Text>
            <Text style={styles.statLabel}>{c.label}</Text>
          </>
        );
        return isBatch ? (
          <TouchableOpacity
            key={c.statKey}
            style={styles.statCard}
            onPress={() => onPressStat(c.statKey)}
            accessibilityRole="button"
          >
            {inner}
          </TouchableOpacity>
        ) : (
          <View key={c.statKey} style={styles.statCard}>
            {inner}
          </View>
        );
      })}
    </View>
  );
}

function SkeletonDashboard() {
  return (
    <View>
      <View style={styles.skeletonHeader} />
      <View style={styles.grid}>
        {Array.from({ length: 6 }).map((_, idx) => (
          <View key={idx} style={styles.skeletonCard} />
        ))}
      </View>
      <View style={styles.skeletonBlock} />
      <View style={styles.skeletonBlock} />
    </View>
  );
}

export function DashboardScreen() {
  const user = useAuthStore((s) => s.user);
  const navigation = useNavigation<DashboardNavigation>();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: DASHBOARD_QUERY_KEY,
    queryFn: getDashboard,
  });

  const title = 'Dashboard';
  const subtitle = user ? `Welcome back, ${user.role}` : 'Welcome back';

  const goBatchesTab = useCallback(() => {
    navigation.navigate(ROUTES.TABS.BATCHES, { screen: BATCHES_STACK.HUB });
  }, [navigation]);

  const goBatchDetail = useCallback(
    (batchId: number) => {
      navigation.navigate(ROUTES.TABS.BATCHES, {
        screen: BATCHES_STACK.DETAIL,
        params: { batchId },
      });
    },
    [navigation]
  );

  const onRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });
  }, [queryClient]);

  const onRetry = useCallback(async () => {
    await query.refetch();
  }, [query]);

  const role = user?.role ?? 'USER';

  const onPressStat = useCallback(
    (statKey: string) => {
      if (statKey === 'totalBatches' || statKey === 'enrolledBatches') {
        goBatchesTab();
      }
    },
    [goBatchesTab]
  );

  const data = query.data;
  const statCards = useMemo(() => toStatCards((data as { stats?: Record<string, number | undefined> } | undefined)?.stats), [data]);

  const body = useMemo(() => {
    if (!data) return null;

    if (role === 'ADMIN' || role === 'SUPERADMIN') {
      const d = data as DashboardResponse & {
        recentUsers?: Array<{ id?: number; name?: string; email?: string; role?: string }>;
        recentAnnouncements?: Array<{ id?: number; heading?: string; startDate?: string }>;
      };
      return (
        <View>
          <StatGrid cards={statCards} onPressStat={onPressStat} />
          <SectionTitle>Recent users</SectionTitle>
          {(d.recentUsers || []).slice(0, 5).map((u, idx) => (
            <View key={u.id ?? idx} style={styles.row}>
              <Text style={styles.rowPrimary}>{u.name || u.email || 'User'}</Text>
              <Text style={styles.rowSecondary}>{u.role || ''}</Text>
            </View>
          ))}
          <SectionTitle>Announcements</SectionTitle>
          {(d.recentAnnouncements || []).slice(0, 5).map((a, idx) => (
            <View key={a.id ?? idx} style={styles.row}>
              <Text style={styles.rowPrimary}>{a.heading || 'Announcement'}</Text>
              <Text style={styles.rowSecondary}>{a.startDate ? String(a.startDate).slice(0, 10) : ''}</Text>
            </View>
          ))}
        </View>
      );
    }

    if (role === 'TEACHER') {
      const d = data as DashboardResponse & {
        myBatches?: Array<{ id?: number; displayName?: string; courseName?: string }>;
        recentContent?: Array<{ id?: number; title?: string; batchName?: string }>;
      };
      return (
        <View>
          <StatGrid cards={statCards} onPressStat={onPressStat} />
          <SectionTitle>My batches</SectionTitle>
          {(d.myBatches || []).slice(0, 5).map((b, idx) => (
            <TouchableOpacity
              key={b.id ?? idx}
              style={styles.row}
              onPress={() => typeof b.id === 'number' && goBatchDetail(b.id)}
              disabled={typeof b.id !== 'number'}
            >
              <Text style={styles.rowPrimary}>{b.displayName || 'Batch'}</Text>
              <Text style={styles.rowSecondary}>{b.courseName || ''}</Text>
            </TouchableOpacity>
          ))}
          <SectionTitle>Recent content</SectionTitle>
          {(d.recentContent || []).slice(0, 5).map((c, idx) => (
            <View key={c.id ?? idx} style={styles.row}>
              <Text style={styles.rowPrimary}>{c.title || 'Content'}</Text>
              <Text style={styles.rowSecondary}>{c.batchName || ''}</Text>
            </View>
          ))}
        </View>
      );
    }

    const d = data as DashboardResponse & {
      myBatches?: Array<{ id?: number; displayName?: string; courseName?: string }>;
      recentAnnouncements?: Array<{ id?: number; heading?: string; startDate?: string }>;
    };
    return (
      <View>
        <StatGrid cards={statCards} onPressStat={onPressStat} />
        <SectionTitle>My batches</SectionTitle>
        {(d.myBatches || []).slice(0, 5).map((b, idx) => (
          <TouchableOpacity
            key={b.id ?? idx}
            style={styles.row}
            onPress={() => typeof b.id === 'number' && goBatchDetail(b.id)}
            disabled={typeof b.id !== 'number'}
          >
            <Text style={styles.rowPrimary}>{b.displayName || 'Batch'}</Text>
            <Text style={styles.rowSecondary}>{b.courseName || ''}</Text>
          </TouchableOpacity>
        ))}
        <SectionTitle>Announcements</SectionTitle>
        {(d.recentAnnouncements || []).slice(0, 5).map((a, idx) => (
          <View key={a.id ?? idx} style={styles.row}>
            <Text style={styles.rowPrimary}>{a.heading || 'Announcement'}</Text>
            <Text style={styles.rowSecondary}>{a.startDate ? String(a.startDate).slice(0, 10) : ''}</Text>
          </View>
        ))}
      </View>
    );
  }, [data, goBatchDetail, onPressStat, role, statCards]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={query.isFetching && !query.isLoading} onRefresh={onRefresh} tintColor="#ffffff" />
      }
    >
      <Text style={styles.screenTitle}>{title}</Text>
      <Text style={styles.screenSubtitle}>{subtitle}</Text>

      {query.error ? (
        <ErrorBanner message={mapApiError(query.error).message || 'Failed to load dashboard'} onRetry={onRetry} />
      ) : null}

      {query.isLoading ? (
        <View style={styles.loadingWrap}>
          <SkeletonDashboard />
          <View style={styles.inlineLoading}>
            <ActivityIndicator color="#fff" />
          </View>
        </View>
      ) : (
        body
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1220',
  },
  content: {
    padding: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  screenTitle: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
  },
  screenSubtitle: {
    color: '#b7c3dd',
    marginTop: 4,
    marginBottom: 14,
  },
  errorBanner: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3b1c1c',
    backgroundColor: '#1a0f14',
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    color: '#ffb3b3',
  },
  retryButton: {
    alignSelf: 'flex-start',
    marginTop: 10,
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  retryText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 10,
    marginBottom: 8,
  },
  statCard: {
    width: '48%',
    borderRadius: 16,
    backgroundColor: '#111a2e',
    borderWidth: 1,
    borderColor: '#1f2a44',
    padding: 12,
  },
  statValue: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '800',
  },
  statLabel: {
    marginTop: 6,
    color: '#b7c3dd',
  },
  sectionTitle: {
    marginTop: 14,
    marginBottom: 8,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  row: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2a44',
  },
  rowPrimary: {
    color: '#ffffff',
    fontWeight: '700',
  },
  rowSecondary: {
    marginTop: 2,
    color: '#6b7aa3',
  },
  loadingWrap: {
    marginTop: 4,
  },
  inlineLoading: {
    marginTop: 12,
    alignItems: 'center',
  },
  skeletonHeader: {
    height: 16,
    width: 160,
    borderRadius: 8,
    backgroundColor: '#111a2e',
    borderWidth: 1,
    borderColor: '#1f2a44',
    opacity: 0.7,
    marginTop: 8,
  },
  skeletonCard: {
    width: '48%',
    height: 84,
    borderRadius: 16,
    backgroundColor: '#111a2e',
    borderWidth: 1,
    borderColor: '#1f2a44',
    opacity: 0.6,
  },
  skeletonBlock: {
    height: 52,
    borderRadius: 12,
    backgroundColor: '#111a2e',
    borderWidth: 1,
    borderColor: '#1f2a44',
    opacity: 0.55,
    marginTop: 12,
  },
});
