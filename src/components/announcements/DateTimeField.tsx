import React, { useState } from 'react';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  label: string;
  value: Date;
  onChange: (next: Date) => void;
  minimumDate?: Date;
};

export function DateTimeField({ label, value, onChange, minimumDate }: Props) {
  const [open, setOpen] = useState(false);

  const labelText = value.toLocaleString();

  const onPick = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setOpen(false);
    }
    if (event.type === 'dismissed') return;
    if (date) onChange(date);
  };

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        style={styles.control}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${labelText}`}
      >
        <Text style={styles.valueText}>{labelText}</Text>
      </Pressable>
      {open ? (
        <DateTimePicker
          value={value}
          mode="datetime"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onPick}
          minimumDate={minimumDate}
        />
      ) : null}
      {Platform.OS === 'ios' && open ? (
        <Pressable onPress={() => setOpen(false)} style={styles.iosDone}>
          <Text style={styles.iosDoneText}>Done</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    marginBottom: 12,
  },
  label: {
    color: '#cbd5e1',
    fontSize: 13,
    marginBottom: 6,
    fontWeight: '600',
  },
  control: {
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#111827',
  },
  valueText: {
    color: '#f8fafc',
    fontSize: 14,
  },
  iosDone: {
    marginTop: 8,
    alignSelf: 'flex-end',
  },
  iosDoneText: {
    color: '#38bdf8',
    fontSize: 16,
    fontWeight: '600',
  },
});
