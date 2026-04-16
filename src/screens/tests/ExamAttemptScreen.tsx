import React, { useEffect } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuthStore } from '../../store/authStore';
import { submitExamAttempt } from '../../api/examTestsApi';
import type { SubmitAttemptRequest } from '../../types/attempts';
import { AttemptScreenBase } from './AttemptScreenBase';
import { TESTS_STACK } from '../../constants/navigation';
import type { TestsStackParamList } from './TestsStack';
import { Alert } from 'react-native';

type Props = NativeStackScreenProps<TestsStackParamList, 'ExamAttempt'>;

export function ExamAttemptScreen({ route, navigation }: Props) {
  const businessId = useAuthStore((s) => s.business?.id);
  const { attemptId, startedAt, testName, durationMinutes, questions } = route.params;

  useEffect(() => {
    const sub = navigation.addListener('beforeRemove', (e) => {
      if (e.data.action.type === 'REPLACE') return;
      e.preventDefault();
      Alert.alert('Exit attempt?', 'Your answers may not be submitted yet.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Exit', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
      ]);
    });
    return sub;
  }, [navigation]);

  return (
    <AttemptScreenBase
      title={testName}
      startedAt={startedAt}
      durationMinutes={durationMinutes}
      questions={questions}
      onExitRequested={() => navigation.goBack()}
      onSubmit={async (answers) => {
        if (typeof businessId !== 'number') throw new Error('Missing business');
        const body: SubmitAttemptRequest = { answers };
        await submitExamAttempt({ businessId, attemptId, body });
        navigation.replace(TESTS_STACK.TEST_RESULT, { kind: 'exam', attemptId });
      }}
    />
  );
}

