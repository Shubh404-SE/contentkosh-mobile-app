import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export function ForbiddenScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Forbidden</Text>
      <Text style={styles.subtitle}>You don’t have access to this screen.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#0b1220',
  },
  title: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 8,
    color: '#b7c3dd',
    textAlign: 'center',
  },
});

