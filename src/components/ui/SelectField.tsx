import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { BATCH_UI } from '../../constants/batchUi';

export type SelectOption<T extends string | number> = {
  value: T;
  label: string;
};

type Props<T extends string | number> = {
  label: string;
  value: T | undefined;
  placeholder: string;
  options: Array<SelectOption<T>>;
  onChange: (value: T) => void;
  searchable?: boolean;
  disabled?: boolean;
};

export function SelectField<T extends string | number>(props: Props<T>) {
  const { label, value, placeholder, options, onChange, searchable, disabled } = props;
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const currentLabel = useMemo(() => {
    const hit = options.find((o) => o.value === value);
    return hit?.label ?? '';
  }, [options, value]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return options;
    return options.filter((o) => o.label.toLowerCase().includes(query));
  }, [options, q]);

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        onPress={() => {
          if (disabled) return;
          setQ('');
          setOpen(true);
        }}
        style={({ pressed }) => [
          styles.trigger,
          pressed && styles.triggerPressed,
          disabled && styles.triggerDisabled,
        ]}
      >
        <Text style={[styles.triggerText, !currentLabel && styles.triggerPlaceholder]} numberOfLines={1}>
          {currentLabel || placeholder}
        </Text>
        <Text style={styles.chev}>▾</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{label}</Text>
              <Pressable onPress={() => setOpen(false)} style={styles.closeBtn}>
                <Text style={styles.closeText}>×</Text>
              </Pressable>
            </View>

            {searchable ? (
              <View style={styles.searchWrap}>
                <Text style={styles.searchIcon}>⌕</Text>
                <TextInput
                  value={q}
                  onChangeText={setQ}
                  placeholder="Search…"
                  placeholderTextColor={BATCH_UI.TEXT_DIM}
                  style={styles.searchInput}
                  autoCapitalize="none"
                />
              </View>
            ) : null}

            <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
              {filtered.map((o) => {
                const on = o.value === value;
                return (
                  <Pressable
                    key={String(o.value)}
                    onPress={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                    style={({ pressed }) => [
                      styles.row,
                      on && styles.rowOn,
                      pressed && styles.rowPressed,
                    ]}
                  >
                    <Text style={[styles.rowText, on && styles.rowTextOn]} numberOfLines={2}>
                      {o.label}
                    </Text>
                    {on ? <Text style={styles.check}>✓</Text> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    color: BATCH_UI.TEXT_DIM,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER,
    backgroundColor: BATCH_UI.CARD,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  triggerPressed: {
    backgroundColor: BATCH_UI.CARD_HOVER,
  },
  triggerDisabled: {
    opacity: 0.55,
  },
  triggerText: {
    flex: 1,
    color: BATCH_UI.TEXT,
    fontSize: 15,
    fontWeight: '700',
  },
  triggerPlaceholder: {
    color: BATCH_UI.TEXT_MUTED,
    fontWeight: '600',
  },
  chev: {
    color: BATCH_UI.TEXT_MUTED,
    fontSize: 16,
    fontWeight: '900',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    padding: 16,
    justifyContent: 'center',
  },
  sheet: {
    backgroundColor: BATCH_UI.BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER,
    overflow: 'hidden',
    maxHeight: '80%',
  },
  sheetHeader: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BATCH_UI.BORDER,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetTitle: {
    color: BATCH_UI.TEXT,
    fontWeight: '900',
    fontSize: 15,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BATCH_UI.BG_ELEVATED,
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER,
  },
  closeText: {
    color: BATCH_UI.TEXT_MUTED,
    fontWeight: '900',
    fontSize: 18,
    marginTop: -2,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER,
    backgroundColor: BATCH_UI.CARD,
    borderRadius: 14,
    paddingHorizontal: 12,
    margin: 12,
  },
  searchIcon: {
    color: BATCH_UI.TEXT_DIM,
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    color: BATCH_UI.TEXT,
    fontSize: 15,
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    padding: 12,
    paddingBottom: 16,
    gap: 8,
  },
  row: {
    backgroundColor: BATCH_UI.CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowOn: {
    borderColor: BATCH_UI.ACCENT,
    backgroundColor: BATCH_UI.ACCENT_DIM,
  },
  rowPressed: {
    opacity: 0.92,
  },
  rowText: {
    flex: 1,
    color: BATCH_UI.TEXT,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  rowTextOn: {
    color: BATCH_UI.TEXT,
  },
  check: {
    color: BATCH_UI.ACCENT,
    fontWeight: '900',
  },
});

