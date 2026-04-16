import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BATCH_UI } from '../../constants/batchUi';

export type TestPublishBannerProps = {
  canManage: boolean;
  isDraft: boolean;
  publishDisabled: boolean;
  disabledHint?: string;
  isPublishing: boolean;
  onPublish: () => void;
};

export function TestPublishBanner({
  canManage,
  isDraft,
  publishDisabled,
  disabledHint,
  isPublishing,
  onPublish,
}: TestPublishBannerProps) {
  if (!canManage) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={[styles.pill, isDraft ? styles.pillDraft : styles.pillPublished]}>
          <Text style={styles.pillText}>{isDraft ? 'Draft' : 'Published'}</Text>
        </View>
        {isDraft ? (
          <Pressable
            onPress={() => {
              if (isPublishing || publishDisabled) return;
              onPublish();
            }}
            disabled={isPublishing || publishDisabled}
            style={({ pressed }) => [
              styles.publishBtn,
              pressed && styles.publishBtnPressed,
              (isPublishing || publishDisabled) && styles.publishBtnDisabled,
            ]}
          >
            <Text style={styles.publishBtnText}>{isPublishing ? 'Publishing…' : 'Publish'}</Text>
          </Pressable>
        ) : null}
      </View>
      {isDraft && disabledHint ? <Text style={styles.hint}>{disabledHint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillDraft: {
    borderColor: BATCH_UI.BORDER_STRONG,
    backgroundColor: BATCH_UI.BG_ELEVATED,
  },
  pillPublished: {
    borderColor: 'rgba(34, 197, 94, 0.35)',
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
  },
  pillText: {
    color: BATCH_UI.TEXT,
    fontWeight: '800',
    fontSize: 13,
  },
  publishBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: BATCH_UI.PRIMARY_BTN,
    borderWidth: 1,
    borderColor: BATCH_UI.PRIMARY_BTN_BORDER,
  },
  publishBtnPressed: {
    opacity: 0.9,
  },
  publishBtnDisabled: {
    opacity: 0.55,
  },
  publishBtnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 14,
  },
  hint: {
    marginTop: 8,
    color: BATCH_UI.TEXT_MUTED,
    fontSize: 13,
    lineHeight: 18,
  },
});
