import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { NavigatorScreenParams } from '@react-navigation/native';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { ROUTES } from '../constants/navigation';
import { tabBarIconFor } from './navigationIcons';
import { HomeScreen } from '../screens/placeholders';
import { AnnouncementsStack } from '../screens/announcements/AnnouncementsStack';
import { BatchesStack, type BatchesStackParamList } from '../screens/batches/BatchesStack';
import { ContentStack, type ContentStackParamList } from '../screens/content/ContentStack';
import { TestsStack } from '../screens/tests/TestsStack';
import { ExamsStack } from '../screens/exams/ExamsStack';
import { CoursesStack } from '../screens/courses/CoursesStack';
import { AdminUsersStack } from '../screens/adminUsers/AdminUsersStack';
import { SettingsScreen } from '../screens/SettingsScreen';
import { PermissionGate } from './PermissionGate';

export type AppTabsParamList = {
  [ROUTES.TABS.HOME]: undefined;
  [ROUTES.TABS.BATCHES]: NavigatorScreenParams<BatchesStackParamList> | undefined;
  [ROUTES.TABS.TESTS]: undefined;
  [ROUTES.TABS.CONTENT]: NavigatorScreenParams<ContentStackParamList> | undefined;
  [ROUTES.TABS.ANNOUNCEMENTS]: undefined;
  [ROUTES.TABS.EXAMS]: undefined;
  [ROUTES.TABS.COURSES]: undefined;
  [ROUTES.TABS.ADMIN_USERS]: undefined;
  [ROUTES.TABS.SETTINGS]: undefined;
  [ROUTES.TABS.MORE]: undefined;
};

const Tab = createBottomTabNavigator<AppTabsParamList>();

function MoreOpener() {
  return null;
}

export function AppTabs() {
  const navigation = useNavigation();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#0b1220', borderTopColor: '#1f2a44' },
        tabBarActiveTintColor: '#ffffff',
        tabBarInactiveTintColor: '#6b7aa3',
      }}
    >
      <Tab.Screen
        name={ROUTES.TABS.HOME}
        component={HomeScreen}
        options={{ tabBarLabel: 'Home', tabBarIcon: tabBarIconFor(ROUTES.TABS.HOME) }}
      />
      <Tab.Screen
        name={ROUTES.TABS.BATCHES}
        component={BatchesStack}
        options={{
          tabBarLabel: 'Batches',
          headerShown: false,
          tabBarIcon: tabBarIconFor(ROUTES.TABS.BATCHES),
        }}
      />
      <Tab.Screen
        name={ROUTES.TABS.TESTS}
        component={TestsStack}
        options={{ tabBarLabel: 'Tests', tabBarIcon: tabBarIconFor(ROUTES.TABS.TESTS) }}
      />
      <Tab.Screen
        name={ROUTES.TABS.CONTENT}
        component={ContentStack}
        options={{
          tabBarLabel: 'Content',
          headerShown: false,
          tabBarIcon: tabBarIconFor(ROUTES.TABS.CONTENT),
        }}
      />
      <Tab.Screen
        name={ROUTES.TABS.ANNOUNCEMENTS}
        component={AnnouncementsStack}
        options={{
          tabBarLabel: 'Announcements',
          headerShown: false,
          tabBarIcon: tabBarIconFor(ROUTES.TABS.ANNOUNCEMENTS),
        }}
      />

      {/* Hidden tab routes: reachable from drawer, but bottom bar stays visible */}
      <Tab.Screen
        name={ROUTES.TABS.EXAMS}
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' },
        }}
      >
        {() => (
          <PermissionGate roles={['ADMIN', 'SUPERADMIN']}>
            <ExamsStack />
          </PermissionGate>
        )}
      </Tab.Screen>

      <Tab.Screen
        name={ROUTES.TABS.COURSES}
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' },
        }}
      >
        {() => (
          <PermissionGate roles={['ADMIN', 'SUPERADMIN']}>
            <CoursesStack />
          </PermissionGate>
        )}
      </Tab.Screen>

      <Tab.Screen
        name={ROUTES.TABS.ADMIN_USERS}
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' },
        }}
      >
        {() => (
          <PermissionGate roles={['ADMIN', 'SUPERADMIN']}>
            <AdminUsersStack />
          </PermissionGate>
        )}
      </Tab.Screen>

      <Tab.Screen
        name={ROUTES.TABS.SETTINGS}
        component={SettingsScreen}
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' },
        }}
      />

      <Tab.Screen
        name={ROUTES.TABS.MORE}
        component={MoreOpener}
        options={{ tabBarLabel: 'More', tabBarIcon: tabBarIconFor(ROUTES.TABS.MORE) }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            navigation.dispatch(DrawerActions.openDrawer());
          },
        }}
      />
    </Tab.Navigator>
  );
}

