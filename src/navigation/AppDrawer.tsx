import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { createDrawerNavigator, DrawerContentScrollView } from '@react-navigation/drawer';
import type { NavigatorScreenParams } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { DRAWER_ITEMS, ROUTES } from '../constants/navigation';
import type { DrawerItemConfig } from '../constants/navigation';
import { useAuthStore } from '../store/authStore';
import { usePermissionStore } from '../store/permissionStore';
import { PermissionGate } from './PermissionGate';
import { AppTabs } from './AppTabs';
import { AdminUsersScreen } from '../screens/placeholders';
import { CoursesStack, type CoursesStackParamList } from '../screens/courses/CoursesStack';
import { ExamsStack, type ExamsStackParamList } from '../screens/exams/ExamsStack';
import { SettingsScreen } from '../screens/SettingsScreen';
import { AnnouncementsStack } from '../screens/announcements/AnnouncementsStack';
import { AnnouncementSocketBridge } from '../components/announcements/AnnouncementSocketBridge';
import { AppDrawerHeaderBell, AppDrawerHeaderBrand } from '../components/layout/AppDrawerHeader';
import { Ionicons } from '@expo/vector-icons';
import { drawerIconForRoute } from './navigationIcons';
import { StudentsStack } from '../screens/students/StudentsStack';
import { logout as logoutRequest } from '../api/authApi';

export type AppDrawerParamList = {
  [ROUTES.APP.DRAWER_TABS]: undefined;
  [ROUTES.APP.DRAWER_ANNOUNCEMENTS]: undefined;
  [ROUTES.APP.DRAWER_EXAMS]: NavigatorScreenParams<ExamsStackParamList> | undefined;
  [ROUTES.APP.DRAWER_COURSES]: NavigatorScreenParams<CoursesStackParamList> | undefined;
  [ROUTES.APP.DRAWER_STUDENTS]: undefined;
  [ROUTES.APP.DRAWER_ADMIN_USERS]: undefined;
  [ROUTES.APP.DRAWER_SETTINGS]: undefined;
};

const Drawer = createDrawerNavigator<AppDrawerParamList>();

function canSeeItem(args: {
  item: DrawerItemConfig;
  role: string | null;
  hasAll: (required: readonly string[]) => boolean;
}): boolean {
  const { item, role, hasAll } = args;
  if (!role) return false;
  if (item.roles && item.roles.length > 0 && !item.roles.includes(role as any)) return false;
  if (item.permissions && item.permissions.length > 0 && !hasAll(item.permissions)) return false;
  return true;
}

function AppDrawerContent(props: { state: { routeNames: string[]; index: number } }) {
  const navigation = useNavigation();
  const role = useAuthStore((s) => s.user?.role ?? null);
  const hasAll = usePermissionStore((s) => s.hasAll);
  const userName = useAuthStore((s) => s.user?.name ?? '');
  const userEmail = useAuthStore((s) => s.user?.email ?? '');
  const clearSession = useAuthStore((s) => s.clearSession);
  const clearPermissions = usePermissionStore((s) => s.clear);

  const visibleItems = useMemo(
    () => DRAWER_ITEMS.filter((item) => canSeeItem({ item, role, hasAll })),
    [hasAll, role]
  );

  const activeRoute = props.state.routeNames[props.state.index];

  const Row = (args: { label: string; routeName: string; iconName: React.ComponentProps<typeof Ionicons>['name'] }) => {
    const focused = activeRoute === args.routeName;
    return (
      <Pressable
        onPress={() => {
          // @ts-expect-error nested navigator typing
          navigation.navigate(args.routeName);
          // @ts-expect-error nested navigator typing
          navigation.closeDrawer?.();
        }}
        style={({ pressed }) => [
          styles.navRow,
          focused && styles.navRowOn,
          pressed && styles.navRowPressed,
        ]}
      >
        <View style={[styles.navIconWrap, focused && styles.navIconWrapOn]}>
          <Ionicons name={args.iconName} size={18} color={focused ? '#ffffff' : '#cbd5e1'} />
        </View>
        <Text style={[styles.navLabel, focused && styles.navLabelOn]}>{args.label}</Text>
      </Pressable>
    );
  };

  return (
    <DrawerContentScrollView
      contentContainerStyle={{ paddingTop: 12, backgroundColor: '#0b1220', flex: 1, paddingBottom: 12 }}
    >
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(userName || userEmail || 'U').slice(0, 1).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.profileName} numberOfLines={1}>
            {userName || 'User'}
          </Text>
          <Text style={styles.profileEmail} numberOfLines={1}>
            {userEmail}
          </Text>
          <Text style={styles.profileRole}>{role ?? ''}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Navigation</Text>
        <Row label="Home" routeName={ROUTES.APP.DRAWER_TABS} iconName="home-outline" />
        {visibleItems.map((item) => (
          <Row
            key={item.routeName}
            label={item.label}
            routeName={item.routeName}
            iconName={drawerIconForRoute(item.routeName)}
          />
        ))}
      </View>

      <View style={[styles.section, { marginTop: 10 }]}>
        <Text style={styles.sectionLabel}>Account</Text>
        <Pressable
          onPress={async () => {
            try {
              await logoutRequest();
            } finally {
              clearPermissions();
              clearSession();
            }
          }}
          style={({ pressed }) => [styles.logoutRow, pressed && styles.navRowPressed]}
        >
          <View style={styles.logoutIconWrap}>
            <Ionicons name="log-out-outline" size={18} color="#fecaca" />
          </View>
          <Text style={styles.logoutLabel}>Logout</Text>
        </Pressable>
      </View>
    </DrawerContentScrollView>
  );
}

function ExamsDrawerScreen() {
  return (
    <PermissionGate roles={['ADMIN', 'SUPERADMIN']}>
      <ExamsStack />
    </PermissionGate>
  );
}

function CoursesDrawerScreen() {
  return (
    <PermissionGate roles={['ADMIN', 'SUPERADMIN']}>
      <CoursesStack />
    </PermissionGate>
  );
}

export function AppDrawer() {
  return (
    <>
      <AnnouncementSocketBridge />
      <Drawer.Navigator
      initialRouteName={ROUTES.APP.DRAWER_TABS}
      drawerContent={(p) => <AppDrawerContent state={p.state} />}
      screenOptions={{
        headerShown: true,
        drawerStyle: { backgroundColor: '#0b1220' },
        headerStyle: {
          backgroundColor: '#0b1220',
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: '#1e293b',
        },
        headerTintColor: '#ffffff',
        headerLeft: () => null,
        swipeEnabled: false,
      }}
    >
      <Drawer.Screen
        name={ROUTES.APP.DRAWER_TABS}
        component={AppTabs}
        options={{
          headerTitle: () => <AppDrawerHeaderBrand />,
          headerTitleAlign: 'left',
          headerRight: () => <AppDrawerHeaderBell />,
          /** Let logo + business name use remaining width (default title box is too narrow). */
          headerTitleContainerStyle: {
            flex: 1,
            marginLeft: 12,
            marginRight: 4,
            maxWidth: undefined,
          },
          headerRightContainerStyle: {
            paddingRight: 10,
          },
        }}
      />

      <Drawer.Screen name={ROUTES.APP.DRAWER_ANNOUNCEMENTS} options={{ headerShown: false }}>
        {() => (
          <PermissionGate roles={['ADMIN', 'TEACHER', 'STUDENT']} permissions={['ANNOUNCEMENT_VIEW']}>
            <AnnouncementsStack />
          </PermissionGate>
        )}
      </Drawer.Screen>

      <Drawer.Screen
        name={ROUTES.APP.DRAWER_EXAMS}
        component={ExamsDrawerScreen}
        options={{ title: 'Exams' }}
      />

      <Drawer.Screen
        name={ROUTES.APP.DRAWER_COURSES}
        component={CoursesDrawerScreen}
        options={{ title: 'Courses / Subjects' }}
      />

      <Drawer.Screen name={ROUTES.APP.DRAWER_STUDENTS} options={{ title: 'Students' }}>
        {() => (
          <PermissionGate roles={['ADMIN', 'TEACHER']}>
            <StudentsStack />
          </PermissionGate>
        )}
      </Drawer.Screen>

      <Drawer.Screen name={ROUTES.APP.DRAWER_ADMIN_USERS} options={{ title: 'Admin Users' }}>
        {() => (
          <PermissionGate roles={['ADMIN', 'SUPERADMIN']}>
            <AdminUsersScreen />
          </PermissionGate>
        )}
      </Drawer.Screen>

      <Drawer.Screen name={ROUTES.APP.DRAWER_SETTINGS} component={SettingsScreen} options={{ title: 'Settings' }} />
    </Drawer.Navigator>
    </>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    marginHorizontal: 12,
    marginBottom: 14,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    backgroundColor: '#111a2e',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(34, 211, 238, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#22d3ee',
    fontWeight: '900',
    fontSize: 18,
  },
  profileName: {
    color: '#f8fafc',
    fontWeight: '900',
    fontSize: 15,
    letterSpacing: -0.2,
  },
  profileEmail: {
    marginTop: 2,
    color: '#94a3b8',
    fontSize: 12,
  },
  profileRole: {
    marginTop: 6,
    color: '#64748b',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  section: {
    paddingHorizontal: 12,
  },
  sectionLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: 8,
  },
  navRowOn: {
    borderColor: '#1e293b',
    backgroundColor: 'rgba(34, 211, 238, 0.10)',
  },
  navRowPressed: {
    opacity: 0.9,
  },
  navIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIconWrapOn: {
    backgroundColor: '#0891b2',
    borderColor: '#06b6d4',
  },
  navLabel: {
    flex: 1,
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '800',
  },
  navLabelOn: {
    color: '#ffffff',
  },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.35)',
    backgroundColor: 'rgba(248, 113, 113, 0.10)',
    marginBottom: 8,
  },
  logoutIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutLabel: {
    flex: 1,
    color: '#fecaca',
    fontSize: 14,
    fontWeight: '900',
  },
});

