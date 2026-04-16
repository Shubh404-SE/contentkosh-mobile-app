import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { BATCH_UI } from '../../constants/batchUi';
import type { TestAnswerSubmission } from '../../types/attempts';
import { QUESTION_TYPE_LABEL } from '../../types/testQuestions';

export type AttemptQuestion = {
  id: string;
  type: number;
  questionText: string;
  options?: Array<{ id?: string; text: string }>;
};

type Props = {
  title: string;
  startedAt: string;
  durationMinutes?: number;
  questions: AttemptQuestion[];
  onSubmit: (answers: TestAnswerSubmission[]) => Promise<void>;
  onExitRequested: () => void;
};

function msSinceIso(iso: string): number {
  const start = Date.parse(iso);
  if (Number.isNaN(start)) return 0;
  return Math.max(0, Date.now() - start);
}

function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function AttemptScreenBase(props: Props) {
  const { title, startedAt, durationMinutes, questions, onSubmit, onExitRequested } = props;

  const [index, setIndex] = useState(0);
  const [answerMap, setAnswerMap] = useState<Record<string, TestAnswerSubmission>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nowTick, setNowTick] = useState(0);

  const current = questions[index];

  useEffect(() => {
    if (!durationMinutes) return;
    const t = setInterval(() => setNowTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [durationMinutes]);

  const timeLeftMs = useMemo(() => {
    if (!durationMinutes) return null;
    const elapsed = msSinceIso(startedAt);
    const total = durationMinutes * 60 * 1000;
    return Math.max(0, total - elapsed);
  }, [durationMinutes, nowTick, startedAt]);

  useEffect(() => {
    if (timeLeftMs == null) return;
    if (timeLeftMs > 0) return;
    if (isSubmitting) return;
    Alert.alert('Time up', 'Submitting your attempt now.', [
      {
        text: 'OK',
        onPress: async () => {
          await submit();
        },
      },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeftMs]);

  const currentAnswer = current ? answerMap[current.id] : undefined;

  const setTextAnswer = (text: string) => {
    if (!current) return;
    setAnswerMap((prev) => ({
      ...prev,
      [current.id]: { questionId: current.id, textAnswer: text },
    }));
  };

  const toggleOption = (optionId: string, single: boolean) => {
    if (!current) return;
    setAnswerMap((prev) => {
      const existing = prev[current.id];
      const currentIds = existing?.selectedOptionIds ?? [];
      let nextIds: string[];
      if (currentIds.includes(optionId)) {
        nextIds = currentIds.filter((x) => x !== optionId);
      } else {
        nextIds = single ? [optionId] : [...currentIds, optionId];
      }
      return {
        ...prev,
        [current.id]: { questionId: current.id, selectedOptionIds: nextIds },
      };
    });
  };

  const submit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const answers = Object.values(answerMap);
      await onSubmit(answers);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmExit = () => {
    Alert.alert('Exit attempt?', 'Your answers may not be submitted yet.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Exit', style: 'destructive', onPress: onExitRequested },
    ]);
  };

  if (!current) {
    return (
      <View style={styles.screen}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.sub}>No questions.</Text>
        <Pressable onPress={onExitRequested} style={({ pressed }) => [styles.secondaryBtn, pressed && styles.secondaryBtnPressed]}>
          <Text style={styles.secondaryBtnText}>Close</Text>
        </Pressable>
      </View>
    );
  }

  const type = current.type as number;
  const isSingle = type === 0 || type === 2;
  const isMulti = type === 1;
  const isText = type === 3 || type === 4;

  const options =
    current.options && current.options.length > 0
      ? current.options.map((o) => ({ id: o.id ?? o.text, text: o.text }))
      : type === 2
        ? [
            { id: 'true', text: 'True' },
            { id: 'false', text: 'False' },
          ]
        : [];

  const selectedOptionIds = currentAnswer?.selectedOptionIds ?? [];

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={confirmExit} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>Close</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.headerSub}>
            Q {index + 1} / {questions.length} •{' '}
            {type === 0 || type === 1 || type === 2 || type === 3 || type === 4 ? QUESTION_TYPE_LABEL[type] : `Type ${type}`}
            {timeLeftMs != null ? ` • ${formatClock(timeLeftMs)}` : ''}
          </Text>
        </View>
        <View style={{ width: 54 }} />
      </View>

      <View style={styles.card}>
        <Text style={styles.qText}>{current.questionText}</Text>
      </View>

      {isText ? (
        <View style={styles.card}>
          <TextInput
            value={currentAnswer?.textAnswer ?? ''}
            onChangeText={setTextAnswer}
            placeholder="Type your answer…"
            placeholderTextColor={BATCH_UI.TEXT_DIM}
            style={styles.input}
          />
        </View>
      ) : null}

      {isSingle || isMulti ? (
        <View style={styles.card}>
          {options.map((o) => {
            const on = selectedOptionIds.includes(o.id);
            return (
              <Pressable
                key={o.id}
                onPress={() => toggleOption(o.id, isSingle)}
                style={({ pressed }) => [styles.optionRow, on && styles.optionRowOn, pressed && styles.optionRowPressed]}
              >
                <View style={[styles.bullet, on && styles.bulletOn]}>
                  <Text style={[styles.bulletText, on && styles.bulletTextOn]}>{on ? '✓' : ''}</Text>
                </View>
                <Text style={styles.optionText}>{o.text}</Text>
              </Pressable>
            );
          })}
          {options.length === 0 ? <Text style={styles.sub}>No options for this question.</Text> : null}
        </View>
      ) : null}

      <View style={styles.footer}>
        <Pressable
          onPress={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
          style={({ pressed }) => [styles.footerBtn, pressed && styles.footerBtnPressed, index === 0 && styles.footerBtnDisabled]}
        >
          <Text style={styles.footerBtnText}>Back</Text>
        </Pressable>

        {index < questions.length - 1 ? (
          <Pressable
            onPress={() => setIndex((i) => Math.min(questions.length - 1, i + 1))}
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
          >
            <Text style={styles.primaryBtnText}>Next</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={submit}
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed, isSubmitting && styles.primaryBtnDisabled]}
          >
            <Text style={styles.primaryBtnText}>{isSubmitting ? 'Submitting…' : 'Submit'}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BATCH_UI.BG,
    padding: 16,
    paddingTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerBtn: {
    width: 54,
    paddingVertical: 8,
  },
  headerBtnText: {
    color: BATCH_UI.ACCENT,
    fontWeight: '900',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerTitle: {
    color: BATCH_UI.TEXT,
    fontWeight: '900',
    fontSize: 16,
  },
  headerSub: {
    marginTop: 4,
    color: BATCH_UI.TEXT_MUTED,
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    color: BATCH_UI.TEXT,
    fontSize: 18,
    fontWeight: '900',
  },
  sub: {
    marginTop: 8,
    color: BATCH_UI.TEXT_MUTED,
    lineHeight: 20,
  },
  card: {
    backgroundColor: BATCH_UI.CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER,
    padding: 16,
    marginBottom: 10,
  },
  qText: {
    color: BATCH_UI.TEXT,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
  },
  input: {
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER,
    backgroundColor: BATCH_UI.BG_ELEVATED,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: BATCH_UI.TEXT,
    fontSize: 15,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER,
    backgroundColor: BATCH_UI.BG_ELEVATED,
    marginBottom: 10,
  },
  optionRowOn: {
    borderColor: BATCH_UI.ACCENT,
    backgroundColor: BATCH_UI.ACCENT_DIM,
  },
  optionRowPressed: {
    opacity: 0.92,
  },
  bullet: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER_STRONG,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BATCH_UI.BG_ELEVATED,
  },
  bulletOn: {
    borderColor: BATCH_UI.ACCENT,
    backgroundColor: BATCH_UI.ACCENT_DIM,
  },
  bulletText: {
    color: BATCH_UI.TEXT_MUTED,
    fontWeight: '900',
  },
  bulletTextOn: {
    color: BATCH_UI.ACCENT,
  },
  optionText: {
    flex: 1,
    color: BATCH_UI.TEXT,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 'auto',
    paddingTop: 6,
  },
  footerBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER_STRONG,
    backgroundColor: BATCH_UI.BG_ELEVATED,
  },
  footerBtnPressed: {
    opacity: 0.92,
  },
  footerBtnDisabled: {
    opacity: 0.4,
  },
  footerBtnText: {
    color: BATCH_UI.TEXT,
    fontWeight: '900',
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: BATCH_UI.PRIMARY_BTN,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BATCH_UI.PRIMARY_BTN_BORDER,
  },
  primaryBtnPressed: {
    opacity: 0.92,
  },
  primaryBtnDisabled: {
    opacity: 0.7,
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '900',
  },
  secondaryBtn: {
    marginTop: 14,
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
});

