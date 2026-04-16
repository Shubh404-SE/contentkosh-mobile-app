import React, { useMemo } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { BATCH_UI } from '../../constants/batchUi';
import type { TestsStackParamList } from './TestsStack';
import { useAuthStore } from '../../store/authStore';
import { getPracticeAttemptDetails } from '../../api/practiceTestsApi';
import { getExamAttemptDetails } from '../../api/examTestsApi';
import { mapApiError } from '../../utils/mapApiError';
import { htmlToPlainText } from '../../utils/htmlToPlainText';
import type { StudentAttemptQuestion } from '../../types/attempts';
import type { AttemptDetails } from '../../types/attempts';
import type { PracticeAvailableTest, ExamAvailableTest } from '../../types/tests';

type Props = NativeStackScreenProps<TestsStackParamList, 'TestResult'>;

function optionTextById(q: { options?: Array<{ id?: string; text: string }> }): Record<string, string> {
  const map: Record<string, string> = {};
  for (const o of q.options ?? []) {
    if (!o.id) continue;
    map[o.id] = htmlToPlainText(o.text);
  }
  return map;
}

function questionStemPlain(q: { questionText?: string; text?: string }): string {
  const raw = q.questionText ?? q.text ?? '';
  return htmlToPlainText(raw);
}

export function TestResultScreen({ route, navigation }: Props) {
  const businessId = useAuthStore((s) => s.business?.id);
  const { kind, attemptId } = route.params;

  type Details = AttemptDetails<PracticeAvailableTest> | AttemptDetails<ExamAvailableTest>;

  const detailsQuery = useQuery({
    queryKey: ['tests', 'result', kind, businessId ?? 0, attemptId],
    queryFn: (): Promise<Details> => {
      if (typeof businessId !== 'number') throw new Error('Missing business');
      return kind === 'practice'
        ? getPracticeAttemptDetails({ businessId, attemptId })
        : getExamAttemptDetails({ businessId, attemptId });
    },
    enabled: typeof businessId === 'number',
  });

  const details = detailsQuery.data;
  const attempt = details?.attempt;
  const test = details?.test;

  const scoreLine = useMemo(() => {
    if (!attempt) return '';
    if (attempt.score == null || attempt.totalScore == null) return 'Submitted';
    const pct = attempt.percentage != null ? ` • ${Math.round(attempt.percentage)}%` : '';
    return `${attempt.score} / ${attempt.totalScore}${pct}`;
  }, [attempt]);

  const renderRow = ({ item, index }: { item: StudentAttemptQuestion; index: number }) => {
    const q = item.question;
    const optsMap = optionTextById(q);
    const selected = item.studentAnswer?.selectedOptionIds ?? [];
    const correct = item.correctAnswer?.correctOptionIds ?? [];
    const selectedText = selected.map((id) => optsMap[id] ?? id).join(', ');
    const correctText = correct.map((id) => optsMap[id] ?? id).join(', ');
    const textAnswer = item.studentAnswer?.textAnswer ?? null;
    const correctTextAnswer = item.correctAnswer?.correctTextAnswer ?? null;
    const stemPlain = questionStemPlain(q);
    const yourAnswerPlain = textAnswer != null ? htmlToPlainText(String(textAnswer)) : '';
    const correctAnswerPlain = correctTextAnswer != null ? htmlToPlainText(String(correctTextAnswer)) : '';

    const showCorrect = item.correctAnswer != null;
    const isCorrect = item.studentAnswer?.isCorrect;

    return (
      <View style={styles.qCard}>
        <Text style={styles.qIndex}>Q{index + 1}</Text>
        <Text style={styles.qText}>{stemPlain}</Text>
        {textAnswer ? <Text style={styles.answerLine}>Your answer: {yourAnswerPlain}</Text> : null}
        {selected.length > 0 ? <Text style={styles.answerLine}>Selected: {selectedText}</Text> : null}
        {showCorrect && correctTextAnswer ? <Text style={styles.correctLine}>Correct: {correctAnswerPlain}</Text> : null}
        {showCorrect && correct.length > 0 ? <Text style={styles.correctLine}>Correct: {correctText}</Text> : null}
        {isCorrect != null ? (
          <Text style={[styles.badge, isCorrect ? styles.badgeOn : styles.badgeOff]}>
            {isCorrect ? 'Correct' : 'Wrong'}
          </Text>
        ) : null}
      </View>
    );
  };

  if (detailsQuery.isLoading) {
    return (
      <View style={styles.screen}>
        <View style={styles.center}>
          <ActivityIndicator color={BATCH_UI.ACCENT} />
        </View>
      </View>
    );
  }

  const errorText = detailsQuery.error ? mapApiError(detailsQuery.error).message : null;
  if (errorText) {
    return (
      <View style={styles.screen}>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>Could not load result</Text>
          <Text style={styles.emptySub}>{errorText}</Text>
          <Pressable onPress={() => detailsQuery.refetch()} style={({ pressed }) => [styles.retryBtn, pressed && styles.retryBtnPressed]}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!details || !attempt || !test) {
    return (
      <View style={styles.screen}>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>Result not available</Text>
          <Text style={styles.emptySub}>Try again later.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={details.questions}
        keyExtractor={(x, idx) => `${x.question.id}_${idx}`}
        renderItem={({ item, index }) => renderRow({ item, index })}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>{test.name}</Text>
            <Text style={styles.sub}>{scoreLine}</Text>
            <Pressable onPress={() => navigation.goBack()} style={({ pressed }) => [styles.secondaryBtn, pressed && styles.secondaryBtnPressed]}>
              <Text style={styles.secondaryBtnText}>Back to tests</Text>
            </Pressable>
            <Text style={styles.sectionLabel}>Review</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BATCH_UI.BG,
  },
  center: {
    padding: 24,
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 10,
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
  sectionLabel: {
    color: BATCH_UI.TEXT_DIM,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 18,
    marginBottom: 10,
  },
  qCard: {
    backgroundColor: BATCH_UI.CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER,
    padding: 16,
    marginBottom: 10,
  },
  qIndex: {
    color: BATCH_UI.TEXT_DIM,
    fontWeight: '900',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  qText: {
    marginTop: 8,
    color: BATCH_UI.TEXT,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 22,
  },
  answerLine: {
    marginTop: 10,
    color: BATCH_UI.TEXT_MUTED,
    fontSize: 13,
    lineHeight: 18,
  },
  correctLine: {
    marginTop: 6,
    color: BATCH_UI.EMERALD,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  badge: {
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    fontSize: 12,
    fontWeight: '900',
  },
  badgeOn: {
    borderColor: BATCH_UI.EMERALD,
    backgroundColor: BATCH_UI.EMERALD_DIM,
    color: BATCH_UI.EMERALD,
  },
  badgeOff: {
    borderColor: BATCH_UI.DANGER,
    backgroundColor: BATCH_UI.DANGER_BG,
    color: BATCH_UI.DANGER,
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
  emptyWrap: {
    padding: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    color: BATCH_UI.TEXT,
    fontWeight: '700',
    fontSize: 16,
    textAlign: 'center',
  },
  emptySub: {
    color: BATCH_UI.TEXT_MUTED,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
    fontSize: 14,
  },
  retryBtn: {
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER_STRONG,
    backgroundColor: BATCH_UI.BG_ELEVATED,
  },
  retryBtnPressed: {
    opacity: 0.9,
  },
  retryText: {
    color: BATCH_UI.TEXT,
    fontWeight: '800',
  },
});

