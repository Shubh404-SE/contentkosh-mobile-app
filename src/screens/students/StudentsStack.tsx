import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { STUDENTS_STACK } from '../../constants/navigation';
import { StudentsListScreen } from './StudentsListScreen';
import { StudentDetailScreen } from './StudentDetailScreen';
import { BATCH_UI } from '../../constants/batchUi';

export type StudentsStackParamList = {
  [STUDENTS_STACK.LIST]: undefined;
  [STUDENTS_STACK.DETAIL]: { studentId: number };
};

const Stack = createNativeStackNavigator<StudentsStackParamList>();

export function StudentsStack() {
  return (
    <Stack.Navigator
      initialRouteName={STUDENTS_STACK.LIST}
      screenOptions={{
        headerStyle: { backgroundColor: BATCH_UI.BG },
        headerTintColor: BATCH_UI.TEXT,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: BATCH_UI.BG },
      }}
    >
      <Stack.Screen name={STUDENTS_STACK.LIST} component={StudentsListScreen} options={{ title: 'Students' }} />
      <Stack.Screen name={STUDENTS_STACK.DETAIL} component={StudentDetailScreen} options={{ title: 'Student' }} />
    </Stack.Navigator>
  );
}

