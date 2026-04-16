import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { BATCH_UI } from '../../constants/batchUi';
import { MCQ_MAX_OPTIONS, MCQ_MIN_OPTIONS } from '../../constants/questionConstraints';
import { isMcqQuestionType } from '../../lib/tests/questionTypeHelpers';
import type { CreateQuestionDTO, QuestionType, TestOption, TestQuestion } from '../../types/testQuestions';
import { QUESTION_TYPE_LABEL } from '../../types/testQuestions';
import { mapApiError } from '../../utils/mapApiError';
import { showToast } from '../../utils/toast';

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

function defaultMcqOptions(): TestOption[] {
  return [emptyOption(), emptyOption(), emptyOption(), emptyOption()];
}

function toOneBasedIndex(optionId: string, cleaned: TestOption[]): number {
  const idx = cleaned.findIndex((o) => o.id === optionId);
  if (idx < 0) throw new Error('Could not resolve selected option');
  return idx + 1;
}

function normalizeNumericAnswer(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export type QuestionEditorFormProps = {
  testLabel: string;
  mode: 'create' | 'edit';
  /** When edit mode, question row from API (may arrive after mount). */
  initialQuestion: TestQuestion | null;
  isLoadingQuestion?: boolean;
  onSave: (body: CreateQuestionDTO) => Promise<void>;
  onDelete?: () => Promise<void>;
  savePending: boolean;
  deletePending: boolean;
};

export function QuestionEditorForm({
  testLabel,
  mode,
  initialQuestion,
  isLoadingQuestion,
  onSave,
  onDelete,
  savePending,
  deletePending,
}: QuestionEditorFormProps) {
  const [type, setType] = useState<QuestionType>(0);
  const [questionText, setQuestionText] = useState('');
  const [explanation, setExplanation] = useState('');
  const [options, setOptions] = useState<TestOption[]>(defaultMcqOptions);
  const [correctOptionIds, setCorrectOptionIds] = useState<string[]>([]);
  const [correctTextAnswer, setCorrectTextAnswer] = useState('');
  const [hydratedKey, setHydratedKey] = useState<string | null>(null);

  const canPickMultiple = type === 1;

  const hydrateFromQuestion = useCallback((q: TestQuestion) => {
    setType(q.type);
    setQuestionText(q.questionText ?? q.text ?? '');
    setExplanation(q.explanation ?? '');
    if (isMcqQuestionType(q.type)) {
      let opts = q.options?.length ? normalizeOptions(q.options) : defaultMcqOptions();
      if (opts.length < MCQ_MIN_OPTIONS) {
        opts = [...opts];
        while (opts.length < MCQ_MIN_OPTIONS) opts.push(emptyOption());
      }
      if (opts.length > MCQ_MAX_OPTIONS) opts = opts.slice(0, MCQ_MAX_OPTIONS);
      setOptions(opts);
      const raw = q.correctOptionIdsAnswers;
      const ids = Array.isArray(raw) ? raw.map((x) => String(x)) : [];
      setCorrectOptionIds(ids.filter((id) => opts.some((o) => o.id === id)));
    } else {
      setOptions(defaultMcqOptions());
      setCorrectOptionIds([]);
    }
    if (q.type === 2) {
      const cta = q.correctTextAnswer?.trim().toLowerCase();
      setCorrectTextAnswer(cta === 'true' || cta === 'false' ? cta : '');
    } else if (q.type === 3 || q.type === 4) {
      setCorrectTextAnswer(q.correctTextAnswer ?? '');
    } else {
      setCorrectTextAnswer('');
    }
  }, []);

  useEffect(() => {
    if (mode !== 'edit' || !initialQuestion) return;
    const key = initialQuestion.id;
    if (hydratedKey === key) return;
    hydrateFromQuestion(initialQuestion);
    setHydratedKey(key);
  }, [mode, initialQuestion, hydratedKey, hydrateFromQuestion]);

  useEffect(() => {
    if (mode === 'create') {
      setHydratedKey(null);
    }
  }, [mode]);

  const handleTypeChange = (t: QuestionType) => {
    setType(t);
    if (isMcqQuestionType(t)) {
      setOptions(defaultMcqOptions());
      setCorrectOptionIds([]);
      setCorrectTextAnswer('');
    } else if (t === 2) {
      setOptions(defaultMcqOptions());
      setCorrectOptionIds([]);
      setCorrectTextAnswer('');
    } else {
      setOptions(defaultMcqOptions());
      setCorrectOptionIds([]);
      setCorrectTextAnswer('');
    }
  };

  const buildPayload = (): CreateQuestionDTO => {
    const trimmedQuestion = questionText.trim();
    if (!trimmedQuestion) throw new Error('Question text is required');
    const trimmedExplanation = explanation.trim();

    const body: CreateQuestionDTO = {
      type,
      questionText: trimmedQuestion,
      ...(trimmedExplanation ? { explanation: trimmedExplanation } : {}),
    };

    if (isMcqQuestionType(type)) {
      const normalized = normalizeOptions(options).filter((o) => o.text.trim());
      if (normalized.length < MCQ_MIN_OPTIONS) {
        throw new Error(`Add at least ${MCQ_MIN_OPTIONS} answer options`);
      }
      if (normalized.length > MCQ_MAX_OPTIONS) {
        throw new Error(`At most ${MCQ_MAX_OPTIONS} options are allowed`);
      }
      body.options = normalized;
      if (correctOptionIds.length === 0) throw new Error('Select at least one correct option');
      body.correctOptionIdsAnswers = correctOptionIds.map((id) => toOneBasedIndex(id, normalized)).sort((a, b) => a - b);
      return body;
    }

    if (type === 2) {
      const ans = correctTextAnswer.trim().toLowerCase();
      if (ans !== 'true' && ans !== 'false') throw new Error('Select True or False as the correct answer');
      body.correctTextAnswer = ans;
      return body;
    }

    if (type === 3) {
      const ans = correctTextAnswer.trim();
      if (!ans) throw new Error('Correct answer is required');
      if (normalizeNumericAnswer(ans) === null) throw new Error('Enter a valid number for the correct answer');
      body.correctTextAnswer = ans;
      return body;
    }

    if (type === 4) {
      const ans = correctTextAnswer.trim();
      if (!ans) throw new Error('Correct answer is required');
      body.correctTextAnswer = ans;
      return body;
    }

    throw new Error('Unsupported question type');
  };

  const onPressSave = async () => {
    if (savePending) return;
    let body: CreateQuestionDTO;
    try {
      body = buildPayload();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Invalid form', 'error');
      return;
    }
    try {
      await onSave(body);
    } catch (e) {
      showToast(mapApiError(e).message || 'Save failed', 'error');
    }
  };

  const toggleCorrect = (id: string) => {
    setCorrectOptionIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (!canPickMultiple) return [id];
      return [...prev, id];
    });
  };

  const addOption = () =>
    setOptions((prev) => (prev.length >= MCQ_MAX_OPTIONS ? prev : [...prev, emptyOption()]));
  const updateOptionText = (id: string, text: string) =>
    setOptions((prev) => prev.map((o) => (o.id === id ? { ...o, text } : o)));
  const removeOption = (id: string) => {
    setOptions((prev) => {
      if (prev.length <= MCQ_MIN_OPTIONS) return prev;
      return prev.filter((o) => o.id !== id);
    });
    setCorrectOptionIds((prev) => prev.filter((x) => x !== id));
  };

  const typeChips = (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
      {QUESTION_TYPES.map((t) => {
        const on = t === type;
        return (
          <Pressable key={t} onPress={() => handleTypeChange(t)} style={[styles.chip, on && styles.chipOn]}>
            <Text style={[styles.chipText, on && styles.chipTextOn]}>{QUESTION_TYPE_LABEL[t]}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );

  if (mode === 'edit' && isLoadingQuestion && !initialQuestion) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ActivityIndicator color={BATCH_UI.ACCENT} />
        <Text style={styles.loadingText}>Loading question…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>{mode === 'create' ? 'Add question' : 'Edit question'}</Text>
      <Text style={styles.sub}>{testLabel}</Text>

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

      <Text style={styles.label}>Explanation (optional)</Text>
      <TextInput
        value={explanation}
        onChangeText={setExplanation}
        placeholder="Optional explanation (HTML/text)…"
        placeholderTextColor={BATCH_UI.TEXT_DIM}
        style={[styles.input, styles.inputMultiline]}
        multiline
      />

      {isMcqQuestionType(type) ? (
        <>
          <Text style={styles.label}>Options ({MCQ_MIN_OPTIONS}–{MCQ_MAX_OPTIONS})</Text>
          {options.map((o) => (
            <View key={o.id} style={styles.optionRow}>
              <Pressable onPress={() => toggleCorrect(o.id!)} style={[styles.check, correctOptionIds.includes(o.id!) && styles.checkOn]}>
                <Text style={[styles.checkText, correctOptionIds.includes(o.id!) && styles.checkTextOn]}>
                  {correctOptionIds.includes(o.id!) ? '✓' : ''}
                </Text>
              </Pressable>
              <TextInput
                value={o.text}
                onChangeText={(t) => updateOptionText(o.id!, t)}
                placeholder="Option text"
                placeholderTextColor={BATCH_UI.TEXT_DIM}
                style={[styles.input, styles.optionInput]}
              />
              <Pressable
                onPress={() => removeOption(o.id!)}
                disabled={options.length <= MCQ_MIN_OPTIONS}
                style={[styles.removeBtn, options.length <= MCQ_MIN_OPTIONS && styles.removeBtnDisabled]}
              >
                <Text style={styles.removeText}>×</Text>
              </Pressable>
            </View>
          ))}
          <Pressable
            onPress={addOption}
            disabled={options.length >= MCQ_MAX_OPTIONS}
            style={({ pressed }) => [styles.secondaryBtn, pressed && styles.secondaryBtnPressed, options.length >= MCQ_MAX_OPTIONS && styles.secondaryBtnDisabled]}
          >
            <Text style={styles.secondaryBtnText}>＋ Add option</Text>
          </Pressable>
          <Text style={styles.hint}>{type === 1 ? 'Select one or more correct options.' : 'Select exactly one correct option.'}</Text>
        </>
      ) : null}

      {type === 2 ? (
        <View style={styles.tfSection}>
          <Text style={styles.label}>Correct answer</Text>
          <View style={styles.tfRow}>
            <Pressable
              onPress={() => setCorrectTextAnswer('true')}
              style={({ pressed }) => [styles.tfChoice, correctTextAnswer === 'true' && styles.tfChoiceOn, pressed && styles.pressed]}
            >
              <Text style={styles.tfChoiceText}>True</Text>
            </Pressable>
            <Pressable
              onPress={() => setCorrectTextAnswer('false')}
              style={({ pressed }) => [styles.tfChoice, correctTextAnswer === 'false' && styles.tfChoiceOn, pressed && styles.pressed]}
            >
              <Text style={styles.tfChoiceText}>False</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {type === 3 ? (
        <>
          <Text style={styles.label}>Correct answer (number)</Text>
          <TextInput
            value={correctTextAnswer}
            onChangeText={setCorrectTextAnswer}
            placeholder="e.g. 3.14"
            placeholderTextColor={BATCH_UI.TEXT_DIM}
            style={styles.input}
            keyboardType="decimal-pad"
          />
        </>
      ) : null}

      {type === 4 ? (
        <>
          <Text style={styles.label}>Correct answer</Text>
          <TextInput
            value={correctTextAnswer}
            onChangeText={setCorrectTextAnswer}
            placeholder="Expected text (matching is case-insensitive)"
            placeholderTextColor={BATCH_UI.TEXT_DIM}
            style={styles.input}
            autoCapitalize="none"
                autoCorrect={false}
          />
        </>
      ) : null}

      <Pressable
        onPress={() => void onPressSave()}
        style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed, savePending && styles.primaryBtnDisabled]}
      >
        <Text style={styles.primaryBtnText}>{savePending ? 'Saving…' : 'Save'}</Text>
      </Pressable>

      {mode === 'edit' && onDelete ? (
        <Pressable
          onPress={() => {
            if (deletePending) return;
            void onDelete();
          }}
          style={({ pressed }) => [styles.dangerBtn, pressed && styles.dangerBtnPressed, deletePending && styles.primaryBtnDisabled]}
        >
          <Text style={styles.dangerBtnText}>{deletePending ? 'Deleting…' : 'Delete question'}</Text>
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
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    color: BATCH_UI.TEXT_MUTED,
    fontSize: 14,
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
  removeBtnDisabled: {
    opacity: 0.35,
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
  secondaryBtnDisabled: {
    opacity: 0.45,
  },
  secondaryBtnText: {
    color: BATCH_UI.TEXT,
    fontWeight: '900',
  },
  tfSection: {
    marginTop: 4,
  },
  tfRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  tfChoice: {
    flex: 1,
    minWidth: 120,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER,
    backgroundColor: BATCH_UI.CARD,
    alignItems: 'center',
  },
  tfChoiceOn: {
    borderColor: BATCH_UI.ACCENT,
    backgroundColor: BATCH_UI.ACCENT_DIM,
  },
  tfChoiceText: {
    color: BATCH_UI.TEXT,
    fontWeight: '800',
    fontSize: 16,
  },
  pressed: {
    opacity: 0.9,
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
