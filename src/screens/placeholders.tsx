import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { DashboardScreen } from './DashboardScreen';

function Placeholder({ title }: { title: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>Placeholder screen</Text>
    </View>
  );
}

export function HomeScreen() {
  return <DashboardScreen />;
}

export function BatchesScreen() {
  return <Placeholder title="Batches" />;
}

export function TestsScreen() {
  return <Placeholder title="Tests" />;
}

export function StudentsScreen() {
  return <Placeholder title="Students" />;
}

export function AdminUsersScreen() {
  return <Placeholder title="Admin Users" />;
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
  },
});

