/**
 * Analytics Screen
 *
 * Spending analytics and insights
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { MainTabScreenProps } from '@/navigation/types';

type AnalyticsScreenProps = MainTabScreenProps<'Analytics'>;

export const AnalyticsScreen: React.FC<AnalyticsScreenProps> = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>📊</Text>
      <Text style={styles.title}>Analytics</Text>
      <Text style={styles.subtitle}>Coming Soon</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    padding: 32,
  },
  icon: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
  },
});
