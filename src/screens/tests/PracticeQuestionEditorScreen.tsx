import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BATCH_UI } from '../../constants/batchUi';
import type { TestsStackParamList } from './TestsStack';
import { useAuthStore } from '../../store/authStore';
import {
  createPracticeQuestion,
  deletePracticeQuestion,
  listPracticeQuestions,
  updatePracticeQuestion,
} from '../../api/practiceTestsApi';
import type { CreateQuestionDTO, QuestionType, TestOption, TestQuestion } from '../../types/testQuestions';
import { QUESTION_TYPE_LABEL } from '../../types/testQuestions';
import { mapApiError } from '../../utils/mapApiError';
import { showToast } from '../../utils/toast';

type Props = NativeStackScreenProps<TestsStackParamList, 'PracticeQuestionEditor'>;

const QUESTION_TYPES: readonly QuestionType[] = [0, 1, 2, 3, 4] as const;

function newId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeOptions(options: TestOption[] | undefined): TestOption[] {
  const list = options ?? [];
  return list.map((o) => ({ ...o, id: o.id ?? newId('opt') }));
}

function emptyOption(): TestOption {
  return { id: newId('opt'), text: '' };
}

function isChoiceType(t: QuestionType): boolean {
  return t === 0 || t === 1 || t === 2;
}

function toOneBasedIndex(optionId: string, cleaned: TestOption[]): number {
  const idx = cleaned.findIndex((o) => o.id === optionId);
  if (idx < 0) throw new Error('Could not resolve selected option');
  return idx + 1;
}

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

  const [type, setType] = useState<QuestionType>(existingQuestion?.type ?? 0);
  const [questionText, setQuestionText] = useState(existingQuestion?.questionText ?? '');
  const [explanation, setExplanation] = useState((existingQuestion as any)?.explanation ?? '');
  const [options, setOptions] = useState<TestOption[]>(
    existingQuestion?.options ? normalizeOptions(existingQuestion.options) : [emptyOption(), emptyOption()]
  );
  const [correctOptionIds, setCorrectOptionIds] = useState<string[]>(() => {
    const raw = (existingQuestion as any)?.correctOptionIdsAnswers as Array<string | number> | undefined;
    return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : [];
  });
  const [correctTextAnswer, setCorrectTextAnswer] = useState<string>(() => {
    const raw = (existingQuestion as any)?.correctTextAnswer as string | null | undefined;
    return raw ?? '';
  });

  const canPickMultiple = type === 1;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const trimmedQuestion = questionText.trim();
      if (!trimmedQuestion) throw new Error('Question text is required');
      const trimmedExplanation = explanation.trim();

      const body: CreateQuestionDTO = {
        type,
        questionText: trimmedQuestion,
        ...(trimmedExplanation ? { explanation: trimmedExplanation } : {}),
      };

      if (isChoiceType(type)) {
        const normalized = normalizeOptions(options).filter((o) => o.text.trim());
        if (normalized.length < 2) throw new Error('Add at least 2 options');

        body.options = normalized;

        if (type === 2) {
          // True/False: treat correctTextAnswer as "true"/"false"
          const ans = correctTextAnswer.trim().toLowerCase();
          if (ans !== 'true' && ans !== 'false') throw new Error('Correct answer must be "true" or "false"');
          body.correctTextAnswer = ans;
        } else {
          if (correctOptionIds.length === 0) throw new Error('Select at least one correct option');
          // API expects one-based indices for create/update; convert from option ids.
          body.correctOptionIdsAnswers = correctOptionIds.map((id) => toOneBasedIndex(id, normalized)).sort((a, b) => a - b);
        }
      } else {
        const ans = correctTextAnswer.trim();
        if (!ans) throw new Error('Correct answer is required');
        body.correctTextAnswer = ans;
      }

      if (mode === 'create') {
        return await createPracticeQuestion({ businessId: businessId!, practiceTestId, body });
      }
      if (!questionId) throw new Error('Missing question id');
      return await updatePracticeQuestion({ businessId: businessId!, questionId, body });
    },
    onSuccess: async () => {
      showToast(mode === 'create' ? 'Question added' : 'Question updated', 'success');
      await queryClient.invalidateQueries({ queryKey: ['tests', 'practice', 'questions', businessId ?? 0, practiceTestId] });
      navigation.goBack();
    },
    onError: (e) => showToast(mapApiError(e).message || 'Save failed', 'error'),
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
    onError: (e) => showToast(mapApiError(e).message || 'Delete failed', 'error'),
  });

  const toggleCorrect = (id: string) => {
    setCorrectOptionIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (!canPickMultiple) return [id];
      return [...prev, id];
    });
  };

  const addOption = () => setOptions((prev) => [...prev, emptyOption()]);
  const updateOptionText = (id: string, text: string) =>
    setOptions((prev) => prev.map((o) => (o.id === id ? { ...o, text } : o)));
  const removeOption = (id: string) => {
    setOptions((prev) => prev.filter((o) => o.id !== id));
    setCorrectOptionIds((prev) => prev.filter((x) => x !== id));
  };

  const typeChips = (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
      {QUESTION_TYPES.map((t) => {
        const on = t === type;
        return (
          <Pressable key={t} onPress={() => setType(t)} style={[styles.chip, on && styles.chipOn]}>
            <Text style={[styles.chipText, on && styles.chipTextOn]}>{QUESTION_TYPE_LABEL[t]}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>{mode === 'create' ? 'Add question' : 'Edit question'}</Text>
      <Text style={styles.sub}>Practice test • {practiceTestId}</Text>

      <Text style={styles.label}>Type</Text>
      {typeChips}

      <Text style={styles.label}>Question</Text>
      <TextInput
        value={questionText}
        onChangeText={setQuestionText}
        placeholder="Enter question text…"
        placeholderTextColor={BATCH_UI.TEXT_DIM}
        style={[styles.input, styles.inputMultiline]}
        multiline
      />

      {isChoiceType(type) ? (
        <>
          <Text style={styles.label}>Explanation (optional)</Text>
          <TextInput
            value={explanation}
            onChangeText={setExplanation}
            placeholder="Optional explanation (HTML/text)…"
            placeholderTextColor={BATCH_UI.TEXT_DIM}
            style={[styles.input, styles.inputMultiline]}
            multiline
          />

          <Text style={styles.label}>Options</Text>
          {options.map((o) => (
            <View key={o.id} style={styles.optionRow}>
              {type !== 2 ? (
                <Pressable onPress={() => toggleCorrect(o.id!)} style={[styles.check, correctOptionIds.includes(o.id!) && styles.checkOn]}>
                  <Text style={[styles.checkText, correctOptionIds.includes(o.id!) && styles.checkTextOn]}>
                    {correctOptionIds.includes(o.id!) ? '✓' : ''}
                  </Text>
                </Pressable>
              ) : null}
              <TextInput
                value={o.text}
                onChangeText={(t) => updateOptionText(o.id!, t)}
                placeholder="Option text"
                placeholderTextColor={BATCH_UI.TEXT_DIM}
                style={[styles.input, styles.optionInput]}
              />
              <Pressable onPress={() => removeOption(o.id!)} style={styles.removeBtn}>
                <Text style={styles.removeText}>×</Text>
              </Pressable>
            </View>
          ))}
          <Pressable onPress={addOption} style={({ pressed }) => [styles.secondaryBtn, pressed && styles.secondaryBtnPressed]}>
            <Text style={styles.secondaryBtnText}>＋ Add option</Text>
          </Pressable>

          {type === 2 ? (
            <>
              <Text style={styles.label}>Correct answer</Text>
              <TextInput
                value={correctTextAnswer}
                onChangeText={setCorrectTextAnswer}
                placeholder='Type "true" or "false"'
                placeholderTextColor={BATCH_UI.TEXT_DIM}
                style={styles.input}
                autoCapitalize="none"
              />
            </>
          ) : (
            <Text style={styles.hint}>{type === 1 ? 'Select one or more correct options.' : 'Select the correct option.'}</Text>
          )}
        </>
      ) : (
        <>
          <Text style={styles.label}>Explanation (optional)</Text>
          <TextInput
            value={explanation}
            onChangeText={setExplanation}
            placeholder="Optional explanation (HTML/text)…"
            placeholderTextColor={BATCH_UI.TEXT_DIM}
            style={[styles.input, styles.inputMultiline]}
            multiline
          />

          <Text style={styles.label}>Correct answer</Text>
          <TextInput
            value={correctTextAnswer}
            onChangeText={setCorrectTextAnswer}
            placeholder="Answer…"
            placeholderTextColor={BATCH_UI.TEXT_DIM}
            style={styles.input}
          />
        </>
      )}

      <Pressable
        onPress={() => {
          if (saveMutation.isPending) return;
          saveMutation.mutate();
        }}
        style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed, saveMutation.isPending && styles.primaryBtnDisabled]}
      >
        <Text style={styles.primaryBtnText}>{saveMutation.isPending ? 'Saving…' : 'Save'}</Text>
      </Pressable>

      {mode === 'edit' ? (
        <Pressable
          onPress={() => {
            if (deleteMutation.isPending) return;
            deleteMutation.mutate();
          }}
          style={({ pressed }) => [styles.dangerBtn, pressed && styles.dangerBtnPressed, deleteMutation.isPending && styles.primaryBtnDisabled]}
        >
          <Text style={styles.dangerBtnText}>{deleteMutation.isPending ? 'Deleting…' : 'Delete question'}</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BATCH_UI.BG,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  title: {
    color: BATCH_UI.TEXT,
    fontSize: 18,
    fontWeight: '900',
  },
  sub: {
    marginTop: 6,
    color: BATCH_UI.TEXT_MUTED,
  },
  label: {
    color: BATCH_UI.TEXT_DIM,
    marginTop: 16,
    marginBottom: 8,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  chipScroll: {
    maxHeight: 44,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER,
    backgroundColor: BATCH_UI.CARD,
    marginRight: 8,
  },
  chipOn: {
    borderColor: BATCH_UI.ACCENT,
    backgroundColor: BATCH_UI.ACCENT_DIM,
  },
  chipText: {
    color: BATCH_UI.TEXT_MUTED,
    fontWeight: '700',
    fontSize: 13,
  },
  chipTextOn: {
    color: BATCH_UI.TEXT,
  },
  input: {
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER,
    backgroundColor: BATCH_UI.CARD,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: BATCH_UI.TEXT,
    fontSize: 15,
  },
  inputMultiline: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  optionInput: {
    flex: 1,
    paddingVertical: 10,
  },
  check: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER_STRONG,
    backgroundColor: BATCH_UI.BG_ELEVATED,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: {
    borderColor: BATCH_UI.EMERALD,
    backgroundColor: BATCH_UI.EMERALD_DIM,
  },
  checkText: {
    color: BATCH_UI.TEXT_MUTED,
    fontWeight: '900',
  },
  checkTextOn: {
    color: BATCH_UI.EMERALD,
  },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER_STRONG,
    backgroundColor: BATCH_UI.BG_ELEVATED,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: {
    color: BATCH_UI.TEXT_MUTED,
    fontWeight: '900',
    fontSize: 16,
    marginTop: -2,
  },
  hint: {
    marginTop: 6,
    color: BATCH_UI.TEXT_MUTED,
  },
  secondaryBtn: {
    marginTop: 6,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER_STRONG,
    backgroundColor: BATCH_UI.BG_ELEVATED,
  },
  secondaryBtnPressed: {
    opacity: 0.9,
  },
  secondaryBtnText: {
    color: BATCH_UI.TEXT,
    fontWeight: '900',
  },
  primaryBtn: {
    marginTop: 20,
    backgroundColor: BATCH_UI.PRIMARY_BTN,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BATCH_UI.PRIMARY_BTN_BORDER,
  },
  primaryBtnPressed: {
    opacity: 0.9,
  },
  primaryBtnDisabled: {
    opacity: 0.7,
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 16,
  },
  dangerBtn: {
    marginTop: 12,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BATCH_UI.DANGER,
    backgroundColor: BATCH_UI.DANGER_BG,
  },
  dangerBtnPressed: {
    opacity: 0.9,
  },
  dangerBtnText: {
    color: BATCH_UI.DANGER,
    fontWeight: '900',
    fontSize: 15,
  },
});

