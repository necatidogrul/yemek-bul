import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Button, Card, Text } from '../ui';
import { colors, spacing } from '../../theme/design-tokens';
import { RevenueCatService } from '../../services/RevenueCatService';
import { MockRevenueCatService } from '../../services/MockRevenueCatService';
import { usePremium } from '../../contexts/PremiumContext';

const RevenueCatDebug: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<string>('');
  const { isPremium, subscriptionInfo, refreshStatus } = usePremium();

  useEffect(() => {
    updateDebugInfo();
  }, [isPremium, subscriptionInfo]);

  const updateDebugInfo = () => {
    const info = [
      `Mock Mode: ${RevenueCatService.isMockModeEnabled() ? '🧪 ON' : '✅ OFF'}`,
      `Ready: ${RevenueCatService.isReady() ? '✅' : '❌'}`,
      `User ID: ${RevenueCatService.getCurrentUserId() || 'None'}`,
      `Premium: ${isPremium ? '👑 YES' : '🆓 NO'}`,
      `Trial: ${subscriptionInfo?.isSandbox ? '🧪 Sandbox' : '🏪 Production'}`,
      subscriptionInfo?.expirationDate && subscriptionInfo.expirationDate instanceof Date ? `Expires: ${subscriptionInfo.expirationDate.toLocaleDateString()}` : '',
    ].filter(Boolean).join('\n');
    
    setDebugInfo(info);
  };

  const toggleMockPremium = async () => {
    if (!RevenueCatService.isMockModeEnabled()) {
      Alert.alert('Info', 'Mock mode is not enabled');
      return;
    }

    try {
      const newStatus = !isPremium;
      await MockRevenueCatService.setMockPremiumStatus(newStatus);
      await refreshStatus();
      Alert.alert('Success', `Mock premium status set to: ${newStatus ? 'Premium' : 'Free'}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to toggle mock premium status');
    }
  };

  const resetMockData = async () => {
    if (!RevenueCatService.isMockModeEnabled()) {
      Alert.alert('Info', 'Mock mode is not enabled');
      return;
    }

    Alert.alert(
      'Reset Mock Data',
      'This will reset all mock subscription data. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await MockRevenueCatService.resetMockData();
              await refreshStatus();
              Alert.alert('Success', 'Mock data reset successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to reset mock data');
            }
          },
        },
      ]
    );
  };

  const testPurchaseFlow = async () => {
    try {
      const result = await RevenueCatService.purchasePremium();
      Alert.alert(
        'Purchase Test Result',
        `Success: ${result.success}\nError: ${result.error || 'None'}`,
        [{ text: 'OK' }]
      );
      await refreshStatus();
    } catch (error) {
      Alert.alert('Error', 'Purchase test failed');
    }
  };

  const testRestoreFlow = async () => {
    try {
      const result = await RevenueCatService.restorePurchases();
      Alert.alert(
        'Restore Test Result',
        `Success: ${result.success}\nError: ${result.error || 'None'}`,
        [{ text: 'OK' }]
      );
      await refreshStatus();
    } catch (error) {
      Alert.alert('Error', 'Restore test failed');
    }
  };

  // Only show in development mode
  if (!__DEV__) {
    return null;
  }

  return (
    <Card variant="filled" size="lg" style={styles.container}>
      <View style={styles.header}>
        <Text variant="h4" weight="bold">
          🧪 RevenueCat Debug
        </Text>
        <Button
          variant="ghost"
          size="sm"
          onPress={updateDebugInfo}
        >
          🔄 Refresh
        </Button>
      </View>

      <View style={styles.infoContainer}>
        <Text variant="caption" color="secondary" style={styles.debugText}>
          {debugInfo}
        </Text>
      </View>

      <View style={styles.actions}>
        <Button
          variant="outline"
          size="sm"
          onPress={testPurchaseFlow}
          style={styles.actionButton}
        >
          🛒 Test Purchase
        </Button>

        <Button
          variant="outline"
          size="sm"
          onPress={testRestoreFlow}
          style={styles.actionButton}
        >
          🔄 Test Restore
        </Button>

        {RevenueCatService.isMockModeEnabled() && (
          <>
            <Button
              variant="outline"
              size="sm"
              onPress={toggleMockPremium}
              style={styles.actionButton}
            >
              {isPremium ? '🆓 Make Free' : '👑 Make Premium'}
            </Button>

            <Button
              variant="destructive"
              size="sm"
              onPress={resetMockData}
              style={styles.actionButton}
            >
              🗑️ Reset Mock
            </Button>
          </>
        )}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.warning[50],
    borderColor: colors.warning[200],
    borderWidth: 1,
    margin: spacing[4],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  infoContainer: {
    backgroundColor: colors.neutral[900],
    padding: spacing[3],
    borderRadius: 8,
    marginBottom: spacing[3],
  },
  debugText: {
    fontFamily: 'monospace',
    color: colors.neutral[100],
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  actionButton: {
    flex: 1,
    minWidth: 100,
  },
});

export default RevenueCatDebug;