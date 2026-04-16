import React, { useMemo } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QuestionEditorForm } from '../../components/tests/QuestionEditorForm';
import type { TestsStackParamList } from './TestsStack';
import { useAuthStore } from '../../store/authStore';
import {
  createExamQuestion,
  deleteExamQuestion,
  listExamQuestions,
  updateExamQuestion,
} from '../../api/examTestsApi';
import type { CreateQuestionDTO } from '../../types/testQuestions';
import type { TestQuestion } from '../../types/testQuestions';
import { showToast } from '../../utils/toast';

type Props = NativeStackScreenProps<TestsStackParamList, 'ExamQuestionEditor'>;

export function ExamQuestionEditorScreen({ route, navigation }: Props) {
  const businessId = useAuthStore((s) => s.business?.id);
  const queryClient = useQueryClient();

  const { examTestId, mode, questionId } = route.params;

  const questionsQuery = useQuery({
    queryKey: ['tests', 'exam', 'questions', businessId ?? 0, examTestId],
    queryFn: () => listExamQuestions({ businessId: businessId!, examTestId }),
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
        return createExamQuestion({ businessId, examTestId, body });
      }
      if (!questionId) throw new Error('Missing question id');
      return updateExamQuestion({ businessId, questionId, body });
    },
    onSuccess: async () => {
      showToast(mode === 'create' ? 'Question added' : 'Question updated', 'success');
      await queryClient.invalidateQueries({ queryKey: ['tests', 'exam', 'questions', businessId ?? 0, examTestId] });
      navigation.goBack();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!questionId) throw new Error('Missing question id');
      await deleteExamQuestion({ businessId: businessId!, questionId });
    },
    onSuccess: async () => {
      showToast('Question deleted', 'success');
      await queryClient.invalidateQueries({ queryKey: ['tests', 'exam', 'questions', businessId ?? 0, examTestId] });
      navigation.goBack();
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : 'Delete failed';
      showToast(msg, 'error');
    },
  });

  return (
    <QuestionEditorForm
      testLabel={`Exam test • ${examTestId}`}
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
