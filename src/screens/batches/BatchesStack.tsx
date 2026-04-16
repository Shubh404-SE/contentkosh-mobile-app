import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BatchesHubScreen } from './BatchesHubScreen';
import { BatchDetailScreen } from './BatchDetailScreen';
import { BatchFormScreen } from './BatchFormScreen';
import { BATCHES_STACK } from '../../constants/navigation';

export type BatchesStackParamList = {
  [BATCHES_STACK.HUB]: undefined;
  [BATCHES_STACK.DETAIL]: { batchId: number };
  [BATCHES_STACK.FORM]: { mode: 'create' | 'edit'; batchId?: number; courseId?: number };
};

const Stack = createNativeStackNavigator<BatchesStackParamList>();

export function BatchesStack() {
  return (
    <Stack.Navigator
      initialRouteName={BATCHES_STACK.HUB}
      screenOptions={{
        headerStyle: { backgroundColor: '#0b1220' },
        headerTintColor: '#f8fafc',
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: '#0b1220' },
      }}
    >
      <Stack.Screen name={BATCHES_STACK.HUB} component={BatchesHubScreen} options={{ title: 'Batches' }} />
      <Stack.Screen
        name={BATCHES_STACK.DETAIL}
        component={BatchDetailScreen}
        options={{ title: 'Batch' }}
      />
      <Stack.Screen
        name={BATCHES_STACK.FORM}
        component={BatchFormScreen}
        options={({ route }) => ({
          title: route.params.mode === 'create' ? 'New batch' : 'Edit batch',
        })}
      />
    </Stack.Navigator>
  );
}
