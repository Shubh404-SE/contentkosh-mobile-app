import React, { useMemo } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QuestionEditorForm } from '../../components/tests/QuestionEditorForm';
import type { TestsStackParamList } from './TestsStack';
import { useAuthStore } from '../../store/authStore';
import {
  createPracticeQuestion,
  deletePracticeQuestion,
  listPracticeQuestions,
  updatePracticeQuestion,
} from '../../api/practiceTestsApi';
import type { CreateQuestionDTO } from '../../types/testQuestions';
import type { TestQuestion } from '../../types/testQuestions';
import { showToast } from '../../utils/toast';

type Props = NativeStackScreenProps<TestsStackParamList, 'PracticeQuestionEditor'>;

export function PracticeQuestionEditorScreen({ route, navigation }: Props) {
  const businessId = useAuthStore((s) => s.business?.id);
  const queryClient = useQueryClient();

  const { practiceTestId, mode, questionId } = route.params;

  const questionsQuery = useQuery({
    queryKey: ['tests', 'practice', 'questions', businessId ?? 0, practiceTestId],
    queryFn: () => listPracticeQuestions({ businessId: businessId!, practiceTestId }),
    enabled: typeof businessId === 'number' && mode === 'edit',
  });

  const existingQuestion: TestQuestion | null = useMemo(() => {
    if (mode !== 'edit' || !questionId) return null;
    return (questionsQuery.data ?? []).find((q) => q.id === questionId) ?? null;
  }, [mode, questionId, questionsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (body: CreateQuestionDTO) => {
      if (typeof businessId !== 'number') throw new Error('Missing business');
      if (mode === 'create') {
        return createPracticeQuestion({ businessId, practiceTestId, body });
      }
      if (!questionId) throw new Error('Missing question id');
      return updatePracticeQuestion({ businessId, questionId, body });
    },
    onSuccess: async () => {
      showToast(mode === 'create' ? 'Question added' : 'Question updated', 'success');
      await queryClient.invalidateQueries({ queryKey: ['tests', 'practice', 'questions', businessId ?? 0, practiceTestId] });
      navigation.goBack();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!questionId) throw new Error('Missing question id');
      await deletePracticeQuestion({ businessId: businessId!, questionId });
    },
    onSuccess: async () => {
      showToast('Question deleted', 'success');
      await queryClient.invalidateQueries({ queryKey: ['tests', 'practice', 'questions', businessId ?? 0, practiceTestId] });
      navigation.goBack();
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : 'Delete failed';
      showToast(msg, 'error');
    },
  });

  return (
    <QuestionEditorForm
      testLabel={`Practice test • ${practiceTestId}`}
      mode={mode}
      initialQuestion={existingQuestion}
      isLoadingQuestion={mode === 'edit' && questionsQuery.isLoading}
      onSave={async (body): Promise<void> => {
        await saveMutation.mutateAsync(body);
      }}
      savePending={saveMutation.isPending}
      onDelete={mode === 'edit' ? () => deleteMutation.mutateAsync() : undefined}
      deletePending={deleteMutation.isPending}
    />
  );
}
