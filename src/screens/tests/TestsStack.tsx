import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TESTS_STACK } from '../../constants/navigation';
import { BATCH_UI } from '../../constants/batchUi';
import { TestsHubScreen } from './TestsHubScreen';
import { PracticeTestDetailScreen } from './PracticeTestDetailScreen';
import { ExamTestDetailScreen } from './ExamTestDetailScreen';
import { PracticeQuestionEditorScreen } from './PracticeQuestionEditorScreen';
import { ExamQuestionEditorScreen } from './ExamQuestionEditorScreen';
import { PracticeAttemptScreen } from './PracticeAttemptScreen';
import { ExamAttemptScreen } from './ExamAttemptScreen';
import { TestResultScreen } from './TestResultScreen';
import { CreateTestScreen } from './CreateTestScreen';

export type TestsStackParamList = {
  [TESTS_STACK.HUB]: undefined;
  [TESTS_STACK.CREATE_TEST]: undefined;
  [TESTS_STACK.PRACTICE_DETAIL]: { practiceTestId: string };
  [TESTS_STACK.EXAM_DETAIL]: { examTestId: string };
  [TESTS_STACK.PRACTICE_QUESTION_EDITOR]: { practiceTestId: string; mode: 'create' | 'edit'; questionId?: string };
  [TESTS_STACK.EXAM_QUESTION_EDITOR]: { examTestId: string; mode: 'create' | 'edit'; questionId?: string };
  [TESTS_STACK.PRACTICE_ATTEMPT]: {
    attemptId: string;
    startedAt: string;
    testId: string;
    testName: string;
    durationMinutes?: number;
    questions: Array<{ id: string; type: number; questionText: string; options?: Array<{ id?: string; text: string }> }>;
  };
  [TESTS_STACK.EXAM_ATTEMPT]: {
    attemptId: string;
    startedAt: string;
    testId: string;
    testName: string;
    durationMinutes?: number;
    questions: Array<{ id: string; type: number; questionText: string; options?: Array<{ id?: string; text: string }> }>;
  };
  [TESTS_STACK.TEST_RESULT]: { kind: 'practice' | 'exam'; attemptId: string };
};

const Stack = createNativeStackNavigator<TestsStackParamList>();

export function TestsStack() {
  return (
    <Stack.Navigator
      initialRouteName={TESTS_STACK.HUB}
      screenOptions={{
        headerStyle: { backgroundColor: BATCH_UI.BG },
        headerTintColor: BATCH_UI.TEXT,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: BATCH_UI.BG },
      }}
    >
      <Stack.Screen name={TESTS_STACK.HUB} component={TestsHubScreen} options={{ title: 'Tests' }} />
      <Stack.Screen name={TESTS_STACK.CREATE_TEST} component={CreateTestScreen} options={{ title: 'Create test', presentation: 'modal' }} />
      <Stack.Screen
        name={TESTS_STACK.PRACTICE_DETAIL}
        component={PracticeTestDetailScreen}
        options={{ title: 'Practice test' }}
      />
      <Stack.Screen name={TESTS_STACK.EXAM_DETAIL} component={ExamTestDetailScreen} options={{ title: 'Exam test' }} />
      <Stack.Screen
        name={TESTS_STACK.PRACTICE_QUESTION_EDITOR}
        component={PracticeQuestionEditorScreen}
        options={{ title: 'Question' }}
      />
      <Stack.Screen
        name={TESTS_STACK.EXAM_QUESTION_EDITOR}
        component={ExamQuestionEditorScreen}
        options={{ title: 'Question' }}
      />
      <Stack.Screen
        name={TESTS_STACK.PRACTICE_ATTEMPT}
        component={PracticeAttemptScreen}
        options={{ headerShown: false, presentation: 'modal' }}
      />
      <Stack.Screen
        name={TESTS_STACK.EXAM_ATTEMPT}
        component={ExamAttemptScreen}
        options={{ headerShown: false, presentation: 'modal' }}
      />
      <Stack.Screen name={TESTS_STACK.TEST_RESULT} component={TestResultScreen} options={{ title: 'Result' }} />
    </Stack.Navigator>
  );
}

