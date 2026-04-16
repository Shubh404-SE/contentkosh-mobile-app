import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { EXAMS_STACK } from '../../constants/navigation';
import { ExamListScreen } from './ExamListScreen';
import { ExamFormScreen } from './ExamFormScreen';
import type { ExamRecord } from '../../api/examsApi';

export type ExamsStackParamList = {
  [EXAMS_STACK.LIST]: undefined;
  [EXAMS_STACK.FORM]: { mode: 'create' | 'edit'; exam?: ExamRecord };
};

const Stack = createNativeStackNavigator<ExamsStackParamList>();

export function ExamsStack() {
  return (
    <Stack.Navigator
      initialRouteName={EXAMS_STACK.LIST}
      screenOptions={{
        headerStyle: { backgroundColor: '#0b1220' },
        headerTintColor: '#f8fafc',
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: '#0b1220' },
      }}
    >
      <Stack.Screen name={EXAMS_STACK.LIST} component={ExamListScreen} options={{ title: 'Exams' }} />
      <Stack.Screen
        name={EXAMS_STACK.FORM}
        component={ExamFormScreen}
        options={({ route }) => ({
          title: route.params.mode === 'create' ? 'New exam' : 'Edit exam',
        })}
      />
    </Stack.Navigator>
  );
}
