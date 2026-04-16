import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AnnouncementListScreen } from './AnnouncementListScreen';
import { AnnouncementDetailScreen } from './AnnouncementDetailScreen';
import { AnnouncementEditorScreen } from './AnnouncementEditorScreen';

export type AnnouncementsStackParamList = {
  AnnouncementList: undefined;
  AnnouncementDetail: { id: number };
  AnnouncementEditor: { id?: number; editorRole: 'ADMIN' | 'TEACHER' };
};

const Stack = createNativeStackNavigator<AnnouncementsStackParamList>();

export function AnnouncementsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#0b1220' },
        headerTintColor: '#f8fafc',
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: '#0b1220' },
      }}
    >
      <Stack.Screen name="AnnouncementList" component={AnnouncementListScreen} options={{ title: 'Announcements' }} />
      <Stack.Screen name="AnnouncementDetail" component={AnnouncementDetailScreen} options={{ title: 'Announcement' }} />
      <Stack.Screen
        name="AnnouncementEditor"
        component={AnnouncementEditorScreen}
        options={({ route }) => ({
          title: route.params.id ? 'Edit announcement' : 'New announcement',
        })}
      />
    </Stack.Navigator>
  );
}
