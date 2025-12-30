import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import { trpc } from '@/lib/trpc';
import colors from '@/constants/colors';

import { logger } from '@/utils/logger';
export default function CreateOrderScreen() {
  const [amount, setAmount] = useState<string>('0.01');
  const [description, setDescription] = useState<string>('Test purchase');
  const [currency, setCurrency] = useState<'AZN' | 'USD' | 'EUR'>('AZN');
  const [language, setLanguage] = useState<'EN' | 'AZ' | 'RU'>('EN');
  const [operation, setOperation] = useState<'PURCHASE' | 'PRE_AUTH'>('PURCHASE');
  const [cardSave, setCardSave] = useState<boolean>(false);

  const createOrderMutation = trpc.payriff.createOrder.useMutation({
    onSuccess: (data) => {
      logger.debug('Order created successfully:', data);

      if (data.payload?.paymentUrl) {
        Alert.alert(
          'Order Created',
          `Order ID: ${data.payload.orderId}\nTransaction ID: ${data.payload.transactionId}\n\nOpen payment page?`,
          [
            {
              text: 'Cancel',
              style: 'cancel',
            },
            {
              text: 'Open',
              onPress: () => {
                if (Platform.OS === 'web') {
                  window.open(data.payload.paymentUrl, '_blank');
                } else {
                  Linking.openURL(data.payload.paymentUrl);
                }
              },
            },
          ],
        );
      } else {
        Alert.alert('Success', 'Order created successfully!');
      }
    },
    onError: (error) => {
      logger.error('Create order error:', error);
      Alert.alert('Error', error.message || 'Failed to create order');
    },
  });

  const handleCreateOrder = () => {
    // Amount validation
    if (!amount.trim()) {
      Alert.alert('Error', 'Please enter amount');
      return;
    }

    const amountNum = parseFloat(amount);

    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Error', 'Please enter a valid amount greater than 0');
      return;
    }

    if (amountNum < 0.01) {
      Alert.alert('Error', 'Minimum order amount is 0.01 AZN');
      return;
    }

    if (amountNum > 50000) {
      Alert.alert('Error', 'Maximum order amount is 50,000 AZN');
      return;
    }

    // Description validation
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }

    if (description.trim().length < 5) {
      Alert.alert('Error', 'Description must be at least 5 characters');
      return;
    }

    if (description.trim().length > 250) {
      Alert.alert('Error', 'Description must not exceed 250 characters');
      return;
    }

    createOrderMutation.mutate({
      amount: amountNum,
      description: description.trim(),
      currency,
      language,
      operation,
      cardSave,
      metadata: {
        source: 'mobile_app',
        timestamp: new Date().toISOString(),
      },
    });
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Create Order (v3)',
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: '#fff',
        }}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Details</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Amount *</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.01"
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description *</Text>
            <TextInput
              style={styles.input}
              value={description}
              onChangeText={setDescription}
              placeholder="Enter description"
              multiline
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Currency</Text>
            <View style={styles.buttonGroup}>
              {(['AZN', 'USD', 'EUR'] as const).map((curr) => (
                <TouchableOpacity
                  key={curr}
                  style={[
                    styles.optionButton,
                    currency === curr && styles.optionButtonActive,
                  ]}
                  onPress={() => setCurrency(curr)}
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      currency === curr && styles.optionButtonTextActive,
                    ]}
                  >
                    {curr}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Language</Text>
            <View style={styles.buttonGroup}>
              {(['EN', 'AZ', 'RU'] as const).map((lang) => (
                <TouchableOpacity
                  key={lang}
                  style={[
                    styles.optionButton,
                    language === lang && styles.optionButtonActive,
                  ]}
                  onPress={() => setLanguage(lang)}
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      language === lang && styles.optionButtonTextActive,
                    ]}
                  >
                    {lang}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Operation Type</Text>
            <View style={styles.buttonGroup}>
              {(['PURCHASE', 'PRE_AUTH'] as const).map((op) => (
                <TouchableOpacity
                  key={op}
                  style={[
                    styles.optionButton,
                    operation === op && styles.optionButtonActive,
                  ]}
                  onPress={() => setOperation(op)}
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      operation === op && styles.optionButtonTextActive,
                    ]}
                  >
                    {op}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setCardSave(!cardSave)}
            >
              <View style={[styles.checkbox, cardSave && styles.checkboxChecked]}>
                {cardSave && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>Save card for future payments</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.createButton, createOrderMutation.isPending && styles.createButtonDisabled]}
          onPress={handleCreateOrder}
          disabled={createOrderMutation.isPending}
        >
          {createOrderMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.createButtonText}>Create Order</Text>
          )}
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>ℹ️ API Information</Text>
          <Text style={styles.infoText}>
            This uses Payriff API v3 Create Order endpoint.
          </Text>
          <Text style={styles.infoText}>
            • PURCHASE: Direct payment{'\n'}
            • PRE_AUTH: Blocks amount for 30 days
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#333',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  optionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  optionButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#666',
  },
  optionButtonTextActive: {
    color: '#fff',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ddd',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#333',
  },
  createButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  infoBox: {
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#1976d2',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#1565c0',
    lineHeight: 20,
    marginBottom: 4,
  },
});
