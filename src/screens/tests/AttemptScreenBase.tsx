import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BATCH_UI } from '../../constants/batchUi';
import { STUDENT_ATTEMPT_NAVIGATOR_WIDTH, STUDENT_ATTEMPT_SIDE_NAV_BREAKPOINT } from '../../constants/studentAttemptLayout';
import type { TestAnswerSubmission } from '../../types/attempts';
import type { AttemptQuestion } from '../../types/studentAttempt';
import { QUESTION_TYPE_LABEL } from '../../types/testQuestions';
import {
  buildSubmitPayloadFromAttemptQuestions,
  countUnanswered,
  isQuestionAnswered,
  type AnswerDraft,
  QUESTION_TYPE,
} from '../../lib/tests/studentAttemptAnswers';
import { htmlToPlainText } from '../../utils/htmlToPlainText';
import { AttemptQuestionNavigator } from '../../components/studentAttempt/AttemptQuestionNavigator';
import { AttemptSubmitConfirmModal } from '../../components/studentAttempt/AttemptSubmitConfirmModal';

export type { AttemptQuestion } from '../../types/studentAttempt';

type Props = {
  title: string;
  startedAt: string;
  durationMinutes?: number;
  questions: AttemptQuestion[];
  /** Shown in header badge (matches web AttemptHeader). */
  attemptKind: 'practice' | 'exam';
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

function buildPrimaryNextLabel(hasAnswer: boolean, markedForReview: boolean): string {
  if (hasAnswer && markedForReview) return 'Save & Review & Next';
  if (hasAnswer) return 'Save & Next';
  if (markedForReview) return 'Review & Next';
  return 'Next';
}

function getPrimaryNextColors(hasAnswer: boolean, markedForReview: boolean): { bg: string; border: string } {
  if (hasAnswer && markedForReview) return { bg: '#0891b2', border: '#06b6d4' };
  if (hasAnswer) return { bg: '#059669', border: '#10b981' };
  if (markedForReview) return { bg: '#4f46e5', border: '#6366f1' };
  return { bg: '#2563eb', border: '#3b82f6' };
}

export function AttemptScreenBase(props: Props) {
  const { title, startedAt, durationMinutes, questions, attemptKind, onSubmit, onExitRequested } = props;
  const { width: windowWidth } = useWindowDimensions();
  const isWideLayout = windowWidth >= STUDENT_ATTEMPT_SIDE_NAV_BREAKPOINT;

  const [activeIndex, setActiveIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerDraft>>({});
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(() => new Set());
  const [visited, setVisited] = useState<Set<string>>(() => new Set());
  const [navigatorOpen, setNavigatorOpen] = useState(isWideLayout);
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nowTick, setNowTick] = useState(0);
  const timeUpAlertFiredRef = useRef(false);

  const current = questions[activeIndex];
  const kindLabel = attemptKind === 'exam' ? 'Exam' : 'Practice';

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

  const unanswered = useMemo(() => countUnanswered(questions, answers), [questions, answers]);
  const answeredCount = questions.length - unanswered;

  const activeQuestionId = current?.id;
  const activeAnswer = activeQuestionId ? answers[activeQuestionId] : undefined;
  const activeHasAnswer = current ? isQuestionAnswered(current.type, activeAnswer) : false;
  const activeMarked = !!(activeQuestionId && markedForReview.has(activeQuestionId));

  useEffect(() => {
    if (!current) return;
    const qid = current.id;
    setVisited((prev) => {
      const next = new Set(prev);
      next.add(qid);
      return next;
    });
  }, [activeIndex, current]);

  useEffect(() => {
    if (timeLeftMs == null || timeLeftMs > 0 || isSubmitting || timeUpAlertFiredRef.current) return;
    timeUpAlertFiredRef.current = true;
    Alert.alert('Time up', 'Submitting your attempt now.', [
      {
        text: 'OK',
        onPress: async () => {
          await runSubmit();
        },
      },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeftMs]);

  const setAnswerForActive = useCallback(
    (next: AnswerDraft) => {
      if (!activeQuestionId) return;
      setAnswers((prev) => ({ ...prev, [activeQuestionId]: next }));
    },
    [activeQuestionId],
  );

  const clearActiveAnswer = useCallback(() => {
    if (!activeQuestionId) return;
    setAnswers((prev) => ({ ...prev, [activeQuestionId]: {} }));
  }, [activeQuestionId]);

  const toggleActiveMarkForReview = useCallback(() => {
    if (!activeQuestionId) return;
    setMarkedForReview((prev) => {
      const next = new Set(prev);
      if (next.has(activeQuestionId)) next.delete(activeQuestionId);
      else next.add(activeQuestionId);
      return next;
    });
  }, [activeQuestionId]);

  const goPrev = useCallback(() => setActiveIndex((i) => Math.max(0, i - 1)), []);
  const goNext = useCallback(() => setActiveIndex((i) => Math.min(questions.length - 1, i + 1)), [questions.length]);

  const onSelectIndex = useCallback((i: number) => {
    setActiveIndex(i);
    if (!isWideLayout) setNavigatorOpen(false);
  }, [isWideLayout]);

  const runSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const payload = buildSubmitPayloadFromAttemptQuestions(questions, answers);
      await onSubmit(payload);
    } finally {
      setIsSubmitting(false);
      setSubmitModalOpen(false);
    }
  };

  const confirmExit = () => {
    Alert.alert('Exit attempt?', 'Your answers may not be submitted yet.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Exit', style: 'destructive', onPress: onExitRequested },
    ]);
  };

  const toggleNavigator = () => setNavigatorOpen((v) => !v);
  const closeNavigator = () => setNavigatorOpen(false);

  if (!current) {
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <Text style={styles.fallbackTitle}>{title}</Text>
        <Text style={styles.sub}>No questions.</Text>
        <Pressable onPress={onExitRequested} style={({ pressed }) => [styles.secondaryBtn, pressed && styles.secondaryBtnPressed]}>
          <Text style={styles.secondaryBtnText}>Close</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const type = current.type;
  const isSingle = type === QUESTION_TYPE.SINGLE;
  const isMulti = type === QUESTION_TYPE.MULTI;
  const isText = type === QUESTION_TYPE.NUMERICAL || type === QUESTION_TYPE.FILL_BLANK;
  const isTrueFalse = type === QUESTION_TYPE.TRUE_FALSE;

  const options =
    current.options && current.options.length > 0 && !isTrueFalse
      ? current.options.map((o) => ({ id: o.id ?? o.text, text: o.text }))
      : type === QUESTION_TYPE.TRUE_FALSE
        ? [
            { id: 'true', text: 'True' },
            { id: 'false', text: 'False' },
          ]
        : [];

  const selectedOptionIds = activeAnswer?.selectedOptionIds ?? [];

  const getTrueFalseTextAnswer = (): 'true' | 'false' | undefined => {
    const curText = activeAnswer?.textAnswer;
    if (typeof curText === 'string') {
      const norm = curText.trim().toLowerCase();
      if (norm === 'true' || norm === 'false') return norm;
    }
    if (isTrueFalse && current.options?.length) {
      const opt = current.options.find((o) => o.id && selectedOptionIds.includes(o.id));
      const t = opt?.text?.trim().toLowerCase();
      if (t?.includes('true')) return 'true';
      if (t?.includes('false')) return 'false';
    }
    return undefined;
  };

  const trueFalseValue = getTrueFalseTextAnswer();

  const handleOptionSelect = (optionId: string, isMultiSelect: boolean) => {
    if (isTrueFalse) {
      const tf = optionId === 'true' || optionId === 'false' ? optionId : undefined;
      if (tf) setAnswerForActive({ textAnswer: tf });
      return;
    }
    if (isMultiSelect) {
      const cur = new Set(activeAnswer?.selectedOptionIds ?? []);
      if (cur.has(optionId)) cur.delete(optionId);
      else cur.add(optionId);
      setAnswerForActive({ selectedOptionIds: [...cur] });
    } else {
      setAnswerForActive({ selectedOptionIds: [optionId] });
    }
  };

  const canGoPrev = activeIndex > 0;
  const canGoNext = activeIndex < questions.length - 1;
  const nextLabel = buildPrimaryNextLabel(activeHasAnswer, activeMarked);
  const nextColors = getPrimaryNextColors(activeHasAnswer, activeMarked);
  const questionPlain = htmlToPlainText(current.questionText);
  const typeLabel =
    type === 0 || type === 1 || type === 2 || type === 3 || type === 4 ? QUESTION_TYPE_LABEL[type as 0 | 1 | 2 | 3 | 4] : `Type ${type}`;

  const navigatorPanel = (
    <View style={[styles.navigatorCard, !isWideLayout && styles.navigatorCardMobile]}>
      <AttemptQuestionNavigator
        rows={questions}
        activeIndex={activeIndex}
        answers={answers}
        visited={visited}
        markedForReview={markedForReview}
        onSelectIndex={onSelectIndex}
      />
    </View>
  );

  const mainColumn = (
    <View style={styles.mainColumn}>
      {!isWideLayout && !navigatorOpen ? (
        <View style={styles.showNavRow}>
          <Pressable
            onPress={toggleNavigator}
            style={({ pressed }) => [styles.iconCircleBtn, pressed && styles.pressed]}
            accessibilityLabel="Show question list"
          >
            <Ionicons name="list" size={18} color={BATCH_UI.TEXT} />
          </Pressable>
        </View>
      ) : null}

      <ScrollView
        style={styles.questionScroll}
        contentContainerStyle={styles.questionScrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.questionCard}>
          <View style={styles.questionCardHeader}>
            <Text style={styles.questionCardHeading}>
              Question {activeIndex + 1} of {questions.length}
            </Text>
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>{typeLabel}</Text>
            </View>
          </View>
          <Text style={styles.qText}>{questionPlain}</Text>

          {isTrueFalse ? (
            <View style={styles.tfBlock}>
              <Text style={styles.yourAnswerLabel}>Your answer</Text>
              {(['true', 'false'] as const).map((tf) => {
                const checked = trueFalseValue === tf;
                const label = tf === 'true' ? 'True' : 'False';
                return (
                  <Pressable
                    key={tf}
                    onPress={() => setAnswerForActive({ textAnswer: tf })}
                    style={({ pressed }) => [styles.tfRow, checked && styles.tfRowOn, pressed && styles.pressed]}
                  >
                    <View style={[styles.radioOuter, checked && styles.radioOuterOn]}>
                      {checked ? <View style={styles.radioInner} /> : null}
                    </View>
                    <Text style={styles.tfLabel}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {isText ? (
            <View style={styles.inputBlock}>
              <Text style={styles.yourAnswerLabel}>{type === QUESTION_TYPE.NUMERICAL ? 'Your answer' : 'Your answer'}</Text>
              <TextInput
                value={activeAnswer?.textAnswer ?? ''}
                onChangeText={(t) => setAnswerForActive({ textAnswer: t })}
                placeholder={type === QUESTION_TYPE.NUMERICAL ? 'Enter a number…' : 'Type your answer…'}
                placeholderTextColor={BATCH_UI.TEXT_DIM}
                keyboardType={type === QUESTION_TYPE.NUMERICAL ? 'decimal-pad' : 'default'}
                autoCapitalize={type === QUESTION_TYPE.FILL_BLANK ? 'none' : 'sentences'}
                autoCorrect={type !== QUESTION_TYPE.FILL_BLANK}
                style={styles.input}
              />
            </View>
          ) : null}

          {(isSingle || isMulti) && !isTrueFalse ? (
            <View style={styles.optionsBlock}>
              {options.map((o) => {
                const on = selectedOptionIds.includes(o.id);
                return (
                  <Pressable
                    key={o.id}
                    onPress={() => handleOptionSelect(o.id, isMulti)}
                    style={({ pressed }) => [styles.optionRow, on && styles.optionRowOn, pressed && styles.pressed]}
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
        </View>
      </ScrollView>

      <View style={styles.actionBar}>
        <View style={styles.actionBarRow}>
          <Pressable
            onPress={goPrev}
            disabled={!canGoPrev}
            style={({ pressed }) => [styles.outlineBtn, !canGoPrev && styles.btnDisabled, pressed && styles.pressed]}
          >
            <Ionicons name="chevron-back" size={18} color={canGoPrev ? BATCH_UI.TEXT : BATCH_UI.TEXT_DIM} />
            <Text style={[styles.outlineBtnText, !canGoPrev && styles.textDisabled]}>Previous</Text>
          </Pressable>
          <Pressable
            onPress={clearActiveAnswer}
            disabled={!activeHasAnswer}
            style={({ pressed }) => [styles.outlineBtn, !activeHasAnswer && styles.btnDisabled, pressed && styles.pressed]}
          >
            <Text style={[styles.outlineBtnText, !activeHasAnswer && styles.textDisabled]}>Clear answer</Text>
          </Pressable>
          <Pressable
            onPress={toggleActiveMarkForReview}
            style={({ pressed }) => [
              styles.reviewBtn,
              activeMarked && styles.reviewBtnOn,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.reviewBtnText, activeMarked && styles.reviewBtnTextOn]}>
              {activeMarked ? 'Review: On' : 'Mark for review'}
            </Text>
          </Pressable>
        </View>
        <Pressable
          onPress={goNext}
          disabled={!canGoNext}
          style={({ pressed }) => [
            styles.primaryNextBtn,
            {
              backgroundColor: nextColors.bg,
              borderColor: nextColors.border,
            },
            !canGoNext && styles.btnDisabled,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.primaryNextBtnText}>{nextLabel}</Text>
          <Ionicons name="chevron-forward" size={20} color="#fff" />
        </Pressable>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.headerCard}>
        <Pressable onPress={confirmExit} style={({ pressed }) => [styles.backLink, pressed && styles.pressed]}>
          <Ionicons name="chevron-back" size={18} color={BATCH_UI.TEXT_MUTED} />
          <Text style={styles.backLinkText}>My tests</Text>
        </Pressable>

        <View style={styles.headerTitleRow}>
          <View style={styles.titleBlock}>
            <Text style={styles.headerTitle} numberOfLines={2}>
              {title}
            </Text>
            <View style={styles.kindBadge}>
              <Text style={styles.kindBadgeText}>{kindLabel}</Text>
            </View>
          </View>
          {isWideLayout ? (
            <Pressable
              onPress={toggleNavigator}
              style={({ pressed }) => [styles.iconCircleBtn, pressed && styles.pressed]}
              accessibilityLabel={navigatorOpen ? 'Hide question list' : 'Show question list'}
            >
              <Ionicons name={navigatorOpen ? 'close' : 'list'} size={18} color={BATCH_UI.TEXT} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.headerMetaRow}>
          {timeLeftMs != null ? (
            <View style={[styles.timerPill, timeLeftMs < 5 * 60 * 1000 && styles.timerPillWarn]}>
              <Text style={[styles.timerText, timeLeftMs < 5 * 60 * 1000 && styles.timerTextWarn]}>
                {formatClock(timeLeftMs)} left
              </Text>
            </View>
          ) : null}
          <View style={styles.answeredPill}>
            <Text style={styles.answeredPillText}>
              {answeredCount}/{questions.length}
            </Text>
            <Text style={styles.answeredPillMuted}> answered</Text>
          </View>
          <Pressable
            testID="attempt-submit-header"
            onPress={() => setSubmitModalOpen(true)}
            disabled={isSubmitting}
            style={({ pressed }) => [styles.submitHeaderBtn, isSubmitting && styles.btnDisabled, pressed && styles.pressed]}
          >
            <Ionicons name="send" size={16} color="#fff" />
            <Text style={styles.submitHeaderBtnText}>Submit</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.bodyRow}>
        {mainColumn}
        {isWideLayout && navigatorOpen ? (
          <View style={{ width: STUDENT_ATTEMPT_NAVIGATOR_WIDTH, borderLeftWidth: 1, borderLeftColor: BATCH_UI.BORDER }}>
            {navigatorPanel}
          </View>
        ) : null}
      </View>

      {!isWideLayout ? (
        <Modal transparent visible={navigatorOpen} animationType="slide" onRequestClose={closeNavigator}>
          <View style={styles.drawerRoot}>
            <Pressable style={styles.drawerBackdrop} onPress={closeNavigator} accessibilityLabel="Close question list" />
            <View style={styles.drawerPanel}>
              <View style={styles.drawerHeader}>
                <Text style={styles.drawerTitle}>Questions</Text>
                <Pressable onPress={closeNavigator} style={({ pressed }) => [styles.drawerClose, pressed && styles.pressed]}>
                  <Ionicons name="close" size={22} color={BATCH_UI.TEXT} />
                </Pressable>
              </View>
              <ScrollView contentContainerStyle={styles.drawerScroll}>{navigatorPanel}</ScrollView>
            </View>
          </View>
        </Modal>
      ) : null}

      <AttemptSubmitConfirmModal
        visible={submitModalOpen}
        unansweredCount={unanswered}
        loading={isSubmitting}
        onCancel={() => setSubmitModalOpen(false)}
        onConfirm={() => void runSubmit()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BATCH_UI.BG,
  },
  headerCard: {
    marginHorizontal: 12,
    marginTop: 4,
    marginBottom: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER,
    backgroundColor: BATCH_UI.CARD,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  backLinkText: {
    color: BATCH_UI.TEXT_MUTED,
    fontSize: 14,
    fontWeight: '600',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 12,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
    gap: 8,
  },
  headerTitle: {
    color: BATCH_UI.TEXT,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  kindBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER_STRONG,
    backgroundColor: BATCH_UI.BG_ELEVATED,
  },
  kindBadgeText: {
    color: BATCH_UI.TEXT_MUTED,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  headerMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER,
    backgroundColor: BATCH_UI.BG_ELEVATED,
  },
  timerPillWarn: {
    borderColor: 'rgba(248,113,113,0.5)',
    backgroundColor: BATCH_UI.DANGER_BG,
  },
  timerText: {
    fontFamily: 'monospace',
    fontSize: 14,
    fontWeight: '700',
    color: BATCH_UI.TEXT,
    fontVariant: ['tabular-nums'],
  },
  timerTextWarn: {
    color: BATCH_UI.DANGER,
  },
  answeredPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER,
    backgroundColor: BATCH_UI.BG_ELEVATED,
  },
  answeredPillText: {
    color: BATCH_UI.TEXT,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  answeredPillMuted: {
    color: BATCH_UI.TEXT_MUTED,
    fontSize: 13,
  },
  submitHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 'auto',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: BATCH_UI.PRIMARY_BTN,
    borderWidth: 1,
    borderColor: BATCH_UI.PRIMARY_BTN_BORDER,
  },
  submitHeaderBtnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 15,
  },
  bodyRow: {
    flex: 1,
    flexDirection: 'row',
    minHeight: 0,
  },
  mainColumn: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  showNavRow: {
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  iconCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER,
    backgroundColor: BATCH_UI.BG_ELEVATED,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionScroll: {
    flex: 1,
  },
  questionScrollContent: {
    paddingBottom: 16,
    flexGrow: 1,
  },
  questionCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER,
    backgroundColor: BATCH_UI.CARD,
    overflow: 'hidden',
  },
  questionCardHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BATCH_UI.BORDER,
    backgroundColor: BATCH_UI.BG_ELEVATED,
  },
  questionCardHeading: {
    color: BATCH_UI.TEXT_MUTED,
    fontSize: 13,
    fontWeight: '700',
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER,
    backgroundColor: BATCH_UI.CARD,
  },
  typeBadgeText: {
    color: BATCH_UI.TEXT_MUTED,
    fontSize: 12,
    fontWeight: '700',
  },
  qText: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    color: BATCH_UI.TEXT,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
  },
  yourAnswerLabel: {
    color: BATCH_UI.TEXT,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
  },
  tfBlock: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  tfRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER,
    backgroundColor: BATCH_UI.BG_ELEVATED,
    marginBottom: 10,
  },
  tfRowOn: {
    borderColor: BATCH_UI.ACCENT,
    backgroundColor: BATCH_UI.ACCENT_DIM,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: BATCH_UI.BORDER_STRONG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterOn: {
    borderColor: BATCH_UI.ACCENT,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: BATCH_UI.ACCENT,
  },
  tfLabel: {
    color: BATCH_UI.TEXT,
    fontSize: 15,
    fontWeight: '700',
  },
  inputBlock: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER,
    backgroundColor: BATCH_UI.BG_ELEVATED,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: BATCH_UI.TEXT,
    fontSize: 15,
  },
  optionsBlock: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
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
    fontSize: 12,
  },
  bulletTextOn: {
    color: BATCH_UI.ACCENT,
  },
  optionText: {
    flex: 1,
    color: BATCH_UI.TEXT,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  sub: {
    marginTop: 8,
    color: BATCH_UI.TEXT_MUTED,
    lineHeight: 20,
  },
  actionBar: {
    marginTop: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER,
    backgroundColor: BATCH_UI.BG_ELEVATED,
    padding: 12,
    gap: 12,
  },
  actionBarRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER_STRONG,
    backgroundColor: BATCH_UI.CARD,
  },
  outlineBtnText: {
    color: BATCH_UI.TEXT,
    fontWeight: '800',
    fontSize: 13,
  },
  reviewBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.45)',
    backgroundColor: 'rgba(139,92,246,0.12)',
  },
  reviewBtnOn: {
    borderColor: '#a78bfa',
    backgroundColor: 'rgba(139,92,246,0.22)',
  },
  reviewBtnText: {
    color: '#ddd6fe',
    fontWeight: '800',
    fontSize: 13,
  },
  reviewBtnTextOn: {
    color: '#f5f3ff',
  },
  primaryNextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  primaryNextBtnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 16,
  },
  navigatorCard: {
    flex: 1,
    padding: 12,
    minHeight: 0,
  },
  navigatorCardMobile: {
    paddingBottom: 24,
  },
  drawerRoot: {
    flex: 1,
    flexDirection: 'row',
  },
  drawerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.5)',
  },
  drawerPanel: {
    width: '85%',
    maxWidth: 360,
    backgroundColor: BATCH_UI.BG,
    borderLeftWidth: 1,
    borderLeftColor: BATCH_UI.BORDER,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BATCH_UI.BORDER,
    backgroundColor: BATCH_UI.CARD,
  },
  drawerTitle: {
    color: BATCH_UI.TEXT,
    fontSize: 16,
    fontWeight: '800',
  },
  drawerClose: {
    padding: 8,
  },
  drawerScroll: {
    padding: 12,
    paddingBottom: 32,
  },
  fallbackTitle: {
    color: BATCH_UI.TEXT,
    fontSize: 18,
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
  pressed: {
    opacity: 0.88,
  },
  btnDisabled: {
    opacity: 0.45,
  },
  textDisabled: {
    color: BATCH_UI.TEXT_DIM,
  },
});
