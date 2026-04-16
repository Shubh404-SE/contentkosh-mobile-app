import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CONTENT_STACK } from '../../constants/navigation';
import { ContentLibraryScreen } from './ContentLibraryScreen';
import { ContentUploadScreen } from './ContentUploadScreen';
import { ContentEditScreen } from './ContentEditScreen';

export type ContentStackParamList = {
  [CONTENT_STACK.LIBRARY]: undefined;
  [CONTENT_STACK.UPLOAD]: undefined;
  [CONTENT_STACK.EDIT]: { contentId: number };
};

const Stack = createNativeStackNavigator<ContentStackParamList>();

export function ContentStack() {
  return (
    <Stack.Navigator
      initialRouteName={CONTENT_STACK.LIBRARY}
      screenOptions={{
        headerStyle: { backgroundColor: '#0b1220' },
        headerTintColor: '#f8fafc',
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: '#0b1220' },
      }}
    >
      <Stack.Screen
        name={CONTENT_STACK.LIBRARY}
        component={ContentLibraryScreen}
        options={{ title: 'Contents' }}
      />
      <Stack.Screen
        name={CONTENT_STACK.UPLOAD}
        component={ContentUploadScreen}
        options={{ title: 'Add content' }}
      />
      <Stack.Screen
        name={CONTENT_STACK.EDIT}
        component={ContentEditScreen}
        options={{ title: 'Edit content' }}
      />
    </Stack.Navigator>
  );
}
