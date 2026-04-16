import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import { usePermissionStore } from '../store/permissionStore';
import { AuthNavigator } from './AuthNavigator';
import { AppDrawer } from './AppDrawer';

export type RootStackParamList = {
  Auth: undefined;
  App: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const user = useAuthStore((s) => s.user);
  const refreshPermissions = usePermissionStore((s) => s.refresh);
  const clearPermissions = usePermissionStore((s) => s.clear);

  useEffect(() => {
    if (!user) {
      clearPermissions();
      return;
    }
    refreshPermissions();
  }, [clearPermissions, refreshPermissions, user]);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <Stack.Screen name="App" component={AppDrawer} />
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

