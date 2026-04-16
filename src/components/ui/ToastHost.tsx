import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToastStore } from '../../store/toastStore';

const TOAST_AUTO_HIDE_MS = 3500;

export function ToastHost() {
  const message = useToastStore((s) => s.message);
  const kind = useToastStore((s) => s.kind);
  const hide = useToastStore((s) => s.hide);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => hide(), TOAST_AUTO_HIDE_MS);
    return () => clearTimeout(t);
  }, [message, hide]);

  if (!message) {
    return null;
  }

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]} pointerEvents="none">
      <View style={[styles.bubble, kind === 'error' ? styles.bubbleErr : styles.bubbleOk]}>
        <Text style={styles.text}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    zIndex: 50,
  },
  bubble: {
    maxWidth: '92%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  bubbleOk: {
    backgroundColor: '#14532d',
    borderColor: '#166534',
  },
  bubbleErr: {
    backgroundColor: '#450a0a',
    borderColor: '#7f1d1d',
  },
  text: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
