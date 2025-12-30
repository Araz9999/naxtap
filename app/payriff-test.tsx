import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { trpc } from '@/lib/trpc';
import colors from '@/constants/colors';
import { CheckCircle, XCircle, CreditCard, Wallet, FileText } from 'lucide-react-native';

export default function PayriffTestScreen() {
  const insets = useSafeAreaInsets();
  const [amount, setAmount] = useState('1.00');
  const [description, setDescription] = useState('Test ödənişi');
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState<{
    name: string;
    status: 'success' | 'error' | 'pending';
    message: string;
  }[]>([]);

  const createOrderMutation = trpc.payriff.createOrder.useMutation();
  const createInvoiceMutation = trpc.payriff.createInvoice.useMutation();
  const getWalletQuery = trpc.payriff.getWallet.useQuery();

  const addTestResult = (name: string, status: 'success' | 'error', message: string) => {
    setTestResults(prev => [...prev, { name, status, message }]);
  };

  const testCreateOrder = async () => {
    setLoading(true);
    try {
      const result = await createOrderMutation.mutateAsync({
        amount: parseFloat(amount),
        description,
        language: 'AZ',
        currency: 'AZN',
        operation: 'PURCHASE',
      });

      addTestResult('Create Order', 'success', `Order ID: ${result.payload?.orderId}`);

      if (result.payload?.paymentUrl) {
        Alert.alert(
          'Uğurlu!',
          'Ödəniş səhifəsinə keçmək istəyirsiniz?',
          [
            { text: 'Xeyr', style: 'cancel' },
            {
              text: 'Bəli',
              onPress: () => Linking.openURL(result.payload.paymentUrl),
            },
          ],
        );
      }
    } catch (error: any) {
      addTestResult('Create Order', 'error', error.message);
      Alert.alert('Xəta', error.message);
    } finally {
      setLoading(false);
    }
  };

  const testCreateInvoice = async () => {
    setLoading(true);
    try {
      const result = await createInvoiceMutation.mutateAsync({
        amount: parseFloat(amount),
        description,
        fullName: 'Test İstifadəçi',
        email: 'test@example.com',
        phoneNumber: '+994501234567',
        currencyType: 'AZN',
        languageType: 'AZ',
      });

      addTestResult('Create Invoice', 'success', `Invoice Code: ${result.payload?.invoiceCode}`);

      if (result.payload?.paymentUrl) {
        Alert.alert(
          'Uğurlu!',
          'İnvoice yaradıldı. Ödəniş linkini açmaq istəyirsiniz?',
          [
            { text: 'Xeyr', style: 'cancel' },
            {
              text: 'Bəli',
              onPress: () => Linking.openURL(result.payload.paymentUrl),
            },
          ],
        );
      }
    } catch (error: any) {
      addTestResult('Create Invoice', 'error', error.message);
      Alert.alert('Xəta', error.message);
    } finally {
      setLoading(false);
    }
  };

  const testGetWallet = async () => {
    setLoading(true);
    try {
      await getWalletQuery.refetch();
      if (getWalletQuery.data) {
        addTestResult(
          'Get Wallet',
          'success',
          `Balans: ${getWalletQuery.data.payload?.totalBalance || 0} AZN`,
        );
      }
    } catch (error: any) {
      addTestResult('Get Wallet', 'error', error.message);
      Alert.alert('Xəta', error.message);
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Payriff Test',
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: '#fff',
        }}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Parametrləri</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Məbləğ (AZN)</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="1.00"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Açıqlama</Text>
            <TextInput
              style={styles.input}
              value={description}
              onChangeText={setDescription}
              placeholder="Test ödənişi"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>API Testləri</Text>

          <TouchableOpacity
            style={[styles.testButton, loading && styles.testButtonDisabled]}
            onPress={testCreateOrder}
            disabled={loading}
          >
            <CreditCard size={20} color="#fff" />
            <Text style={styles.testButtonText}>Create Order (V3)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.testButton, loading && styles.testButtonDisabled]}
            onPress={testCreateInvoice}
            disabled={loading}
          >
            <FileText size={20} color="#fff" />
            <Text style={styles.testButtonText}>Create Invoice (V2)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.testButton, loading && styles.testButtonDisabled]}
            onPress={testGetWallet}
            disabled={loading}
          >
            <Wallet size={20} color="#fff" />
            <Text style={styles.testButtonText}>Get Wallet</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.testButton, styles.secondaryButton]}
            onPress={() => router.push('/saved-cards')}
          >
            <CreditCard size={20} color={colors.primary} />
            <Text style={[styles.testButtonText, styles.secondaryButtonText]}>
              Saxlanmış Kartlar
            </Text>
          </TouchableOpacity>
        </View>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Yüklənir...</Text>
          </View>
        )}

        {testResults.length > 0 && (
          <View style={styles.section}>
            <View style={styles.resultsHeader}>
              <Text style={styles.sectionTitle}>Test Nəticələri</Text>
              <TouchableOpacity onPress={clearResults}>
                <Text style={styles.clearButton}>Təmizlə</Text>
              </TouchableOpacity>
            </View>

            {testResults.map((result, index) => (
              <View
                key={index}
                style={[
                  styles.resultItem,
                  result.status === 'success' ? styles.resultSuccess : styles.resultError,
                ]}
              >
                <View style={styles.resultHeader}>
                  {result.status === 'success' ? (
                    <CheckCircle size={20} color={colors.success} />
                  ) : (
                    <XCircle size={20} color={colors.error} />
                  )}
                  <Text style={styles.resultName}>{result.name}</Text>
                </View>
                <Text style={styles.resultMessage}>{result.message}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Konfiqurasiya</Text>
          <View style={styles.configItem}>
            <Text style={styles.configLabel}>Merchant ID:</Text>
            <Text style={styles.configValue}>ES1094797</Text>
          </View>
          <View style={styles.configItem}>
            <Text style={styles.configLabel}>Base URL:</Text>
            <Text style={styles.configValue}>https://api.payriff.com</Text>
          </View>
          <View style={styles.configItem}>
            <Text style={styles.configLabel}>Status:</Text>
            <Text style={[styles.configValue, styles.statusActive]}>Aktiv</Text>
          </View>
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
  scrollContent: {
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
    color: '#000',
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
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  testButtonDisabled: {
    opacity: 0.5,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  secondaryButtonText: {
    color: colors.primary,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  clearButton: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  resultItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  resultSuccess: {
    backgroundColor: '#f0fdf4',
    borderColor: colors.success,
  },
  resultError: {
    backgroundColor: '#fef2f2',
    borderColor: colors.error,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  resultName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#000',
  },
  resultMessage: {
    fontSize: 12,
    color: '#666',
    marginLeft: 28,
  },
  configItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  configLabel: {
    fontSize: 14,
    color: '#666',
  },
  configValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#000',
  },
  statusActive: {
    color: colors.success,
  },
});
