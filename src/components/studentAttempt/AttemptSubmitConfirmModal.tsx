import React from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { BATCH_UI } from '../../constants/batchUi';

type Props = {
  visible: boolean;
  unansweredCount: number;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function AttemptSubmitConfirmModal({ visible, unansweredCount, loading, onCancel, onConfirm }: Props) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Submit test?</Text>
          <Text style={styles.body}>
            {unansweredCount === 0
              ? 'You have answered all questions.'
              : `${unansweredCount} question${unansweredCount === 1 ? '' : 's'} still unanswered.`}
          </Text>
          <View style={styles.actions}>
            <Pressable
              onPress={onCancel}
              disabled={loading}
              style={({ pressed }) => [styles.btnSecondary, pressed && styles.pressed, loading && styles.disabled]}
            >
              <Text style={styles.btnSecondaryText}>Cancel</Text>
            </Pressable>
            <Pressable
              testID="attempt-submit-confirm"
              onPress={onConfirm}
              disabled={loading}
              style={({ pressed }) => [styles.btnPrimary, pressed && styles.pressed, loading && styles.disabled]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnPrimaryText}>Submit</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.72)',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: BATCH_UI.CARD,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER,
    padding: 20,
  },
  title: {
    color: BATCH_UI.TEXT,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 8,
  },
  body: {
    color: BATCH_UI.TEXT_MUTED,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  btnSecondary: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER_STRONG,
    backgroundColor: BATCH_UI.BG_ELEVATED,
  },
  btnPrimary: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: BATCH_UI.PRIMARY_BTN,
    borderWidth: 1,
    borderColor: BATCH_UI.PRIMARY_BTN_BORDER,
    minWidth: 100,
    alignItems: 'center',
  },
  btnSecondaryText: {
    color: BATCH_UI.TEXT,
    fontWeight: '800',
  },
  btnPrimaryText: {
    color: '#fff',
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.9,
  },
  disabled: {
    opacity: 0.6,
  },
});
