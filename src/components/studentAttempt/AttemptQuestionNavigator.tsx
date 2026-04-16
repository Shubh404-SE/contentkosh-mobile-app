import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BATCH_UI } from '../../constants/batchUi';
import type { AnswerDraft } from '../../lib/tests/studentAttemptAnswers';
import { isQuestionAnswered } from '../../lib/tests/studentAttemptAnswers';
import { getNavigatorChipColors, getQuestionUiState } from '../../lib/tests/attemptQuestionState';
import type { AttemptQuestion } from '../../types/studentAttempt';

type Props = {
  rows: AttemptQuestion[];
  activeIndex: number;
  answers: Record<string, AnswerDraft>;
  visited: Set<string>;
  markedForReview: Set<string>;
  onSelectIndex: (index: number) => void;
};

export function AttemptQuestionNavigator({
  rows,
  activeIndex,
  answers,
  visited,
  markedForReview,
  onSelectIndex,
}: Props) {
  const stats = useMemo(() => {
    let answered = 0;
    let reviewNoAnswer = 0;
    let reviewWithAnswer = 0;
    let unanswered = 0;
    for (const row of rows) {
      const q = row;
      const a = answers[q.id];
      const answeredQ = isQuestionAnswered(q.type, a);
      const mr = markedForReview.has(q.id);
      if (answeredQ) {
        answered += 1;
        if (mr) reviewWithAnswer += 1;
      } else {
        unanswered += 1;
        if (mr) reviewNoAnswer += 1;
      }
    }
    return { answered, reviewNoAnswer, reviewWithAnswer, unanswered };
  }, [rows, answers, markedForReview]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionTitle}>Questions</Text>
      <View style={styles.legend}>
        <LegendRow dotStyle={styles.dotAnswered} label="Answered" value={stats.answered} />
        <LegendRow dotStyle={styles.dotReviewNa} label="Review (no answer)" value={stats.reviewNoAnswer} />
        <LegendRow dotStyle={styles.dotReviewAns} label="Review + answered" value={stats.reviewWithAnswer} />
        <LegendRow dotStyle={styles.dotUnanswered} label="Unanswered" value={stats.unanswered} />
      </View>
      <ScrollView style={styles.chipScroll} contentContainerStyle={styles.chipGrid} showsVerticalScrollIndicator={false}>
        {rows.map((row, i) => {
          const state = getQuestionUiState({
            qType: row.type,
            answer: answers[row.id],
            visited: visited.has(row.id),
            markedForReview: markedForReview.has(row.id),
            isActive: i === activeIndex,
          });
          const colors = getNavigatorChipColors(state);
          return (
            <Pressable
              key={row.id}
              onPress={() => onSelectIndex(i)}
              style={({ pressed }) => [
                styles.chip,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                },
                pressed && styles.chipPressed,
              ]}
            >
              <Text style={[styles.chipText, { color: colors.text }]}>{i + 1}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function LegendRow({
  dotStyle,
  label,
  value,
}: {
  dotStyle: object;
  label: string;
  value: number;
}) {
  return (
    <View style={styles.legendRow}>
      <View style={styles.legendLeft}>
        <View style={[styles.dot, dotStyle]} />
        <Text style={styles.legendLabel} numberOfLines={2}>
          {label}
        </Text>
      </View>
      <Text style={styles.legendValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    minHeight: 120,
  },
  sectionTitle: {
    color: BATCH_UI.TEXT_DIM,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  legend: {
    borderBottomWidth: 1,
    borderBottomColor: BATCH_UI.BORDER,
    paddingBottom: 12,
    marginBottom: 12,
    gap: 8,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  legendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  dotAnswered: {
    backgroundColor: BATCH_UI.EMERALD,
  },
  dotReviewNa: {
    borderWidth: 2,
    borderColor: '#a78bfa',
    backgroundColor: 'rgba(139,92,246,0.25)',
  },
  dotReviewAns: {
    borderWidth: 2,
    borderColor: '#06b6d4',
    backgroundColor: 'rgba(6,182,212,0.25)',
  },
  dotUnanswered: {
    backgroundColor: '#64748b',
  },
  legendLabel: {
    color: BATCH_UI.TEXT_MUTED,
    fontSize: 12,
    flex: 1,
  },
  legendValue: {
    color: BATCH_UI.TEXT_MUTED,
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  chipScroll: {
    maxHeight: 360,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 8,
  },
  chip: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipPressed: {
    opacity: 0.88,
  },
  chipText: {
    fontSize: 15,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
});
