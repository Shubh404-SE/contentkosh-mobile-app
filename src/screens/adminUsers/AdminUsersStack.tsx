import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ADMIN_USERS_STACK } from '../../constants/navigation';
import { BATCH_UI } from '../../constants/batchUi';
import { AdminUsersListScreen } from './AdminUsersListScreen';
import { TeacherProfileScreen } from './TeacherProfileScreen';

export type AdminUsersStackParamList = {
  [ADMIN_USERS_STACK.LIST]: undefined;
  [ADMIN_USERS_STACK.TEACHER_DETAIL]: { userId: number; user?: { id: number; email: string; name?: string; mobile?: string } };
};

const Stack = createNativeStackNavigator<AdminUsersStackParamList>();

export function AdminUsersStack() {
  return (
    <Stack.Navigator
      initialRouteName={ADMIN_USERS_STACK.LIST}
      screenOptions={{
        headerStyle: { backgroundColor: BATCH_UI.BG },
        headerTintColor: BATCH_UI.TEXT,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: BATCH_UI.BG },
      }}
    >
      <Stack.Screen name={ADMIN_USERS_STACK.LIST} component={AdminUsersListScreen} options={{ title: 'Users' }} />
      <Stack.Screen
        name={ADMIN_USERS_STACK.TEACHER_DETAIL}
        component={TeacherProfileScreen}
        options={{ title: 'Teacher' }}
      />
    </Stack.Navigator>
  );
}

