import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { ArrowLeft, CheckCircle, XCircle, AlertCircle } from 'lucide-react-native';
import { trpcClient } from '@/lib/trpc';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { logger } from '@/utils/logger';
type TestStatus = 'idle' | 'running' | 'success' | 'error';

interface TestResult {
  name: string;
  status: TestStatus;
  message?: string;
  duration?: number;
}

export default function PayriffIntegrationTestScreen() {
  const insets = useSafeAreaInsets();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const updateTestResult = (name: string, status: TestStatus, message?: string, duration?: number) => {
    setTestResults((prev) => {
      const existing = prev.find((r) => r.name === name);
      if (existing) {
        return prev.map((r) =>
          r.name === name ? { ...r, status, message, duration } : r,
        );
      }
      return [...prev, { name, status, message, duration }];
    });
  };

  const runTest = async (
    name: string,
    testFn: () => Promise<void>,
  ): Promise<boolean> => {
    const startTime = Date.now();
    updateTestResult(name, 'running');

    try {
      await testFn();
      const duration = Date.now() - startTime;
      updateTestResult(name, 'success', 'Test passed', duration);
      logger.debug(`✅ ${name} - PASSED (${duration}ms)`);
      return true;
    } catch (error) {
      const duration = Date.now() - startTime;
      const message = error instanceof Error ? error.message : 'Unknown error';
      updateTestResult(name, 'error', message, duration);
      logger.error(`❌ ${name} - FAILED: ${message}`);
      return false;
    }
  };

  const testGetWallet = async () => {
    const result = await trpcClient.payriff.getWallet.query();

    if (!result) {
      throw new Error('No response from getWallet');
    }

    if (!result.payload) {
      throw new Error('No payload in response');
    }

    if (typeof result.payload.totalBalance !== 'number') {
      throw new Error('Invalid totalBalance in response');
    }

    logger.debug('Wallet data:', JSON.stringify(result, null, 2));
  };

  const testCreateOrder = async () => {
    const result = await trpcClient.payriff.createOrder.mutate({
      amount: 0.01,
      language: 'EN',
      currency: 'AZN',
      description: 'Test order - Integration test',
      operation: 'PURCHASE',
      metadata: {
        test: 'true',
        timestamp: Date.now().toString(),
      },
    });

    if (!result) {
      throw new Error('No response from createOrder');
    }

    if (!result.payload?.orderId) {
      throw new Error('No orderId in response');
    }

    if (!result.payload?.paymentUrl) {
      throw new Error('No paymentUrl in response');
    }

    logger.debug('Order created:', JSON.stringify(result, null, 2));
  };

  const testGetOrder = async () => {
    const createResult = await trpcClient.payriff.createOrder.mutate({
      amount: 0.01,
      language: 'EN',
      currency: 'AZN',
      description: 'Test order for getOrder test',
      operation: 'PURCHASE',
    });

    if (!createResult.payload?.orderId) {
      throw new Error('Failed to create order for testing');
    }

    const orderId = createResult.payload.orderId;

    const result = await trpcClient.payriff.getOrder.query({ orderId });

    if (!result) {
      throw new Error('No response from getOrder');
    }

    if (!result.payload) {
      throw new Error('No payload in response');
    }

    if (result.payload.orderId !== orderId) {
      throw new Error('OrderId mismatch');
    }

    logger.debug('Order info:', JSON.stringify(result, null, 2));
  };

  const testCreateInvoice = async () => {
    const result = await trpcClient.payriff.createInvoice.mutate({
      amount: 0.01,
      description: 'Test invoice - Integration test',
      currencyType: 'AZN',
      languageType: 'EN',
      fullName: 'Test User',
      email: 'test@example.com',
      phoneNumber: '994501234567',
    });

    if (!result) {
      throw new Error('No response from createInvoice');
    }

    if (!result.payload?.invoiceUuid) {
      throw new Error('No invoiceUuid in response');
    }

    if (!result.payload?.paymentUrl) {
      throw new Error('No paymentUrl in response');
    }

    logger.debug('Invoice created:', JSON.stringify(result, null, 2));
  };

  const testGetInvoice = async () => {
    const createResult = await trpcClient.payriff.createInvoice.mutate({
      amount: 0.01,
      description: 'Test invoice for getInvoice test',
      currencyType: 'AZN',
      languageType: 'EN',
      fullName: 'Test User',
      email: 'test@example.com',
      phoneNumber: '994501234567',
    });

    if (!createResult.payload?.invoiceUuid) {
      throw new Error('Failed to create invoice for testing');
    }

    const invoiceUuid = createResult.payload.invoiceUuid;

    const result = await trpcClient.payriff.getInvoice.query({ uuid: invoiceUuid });

    if (!result) {
      throw new Error('No response from getInvoice');
    }

    if (!result.payload) {
      throw new Error('No payload in response');
    }

    if (result.payload.invoiceUuid !== invoiceUuid) {
      throw new Error('InvoiceUuid mismatch');
    }

    logger.debug('Invoice info:', JSON.stringify(result, null, 2));
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults([]);

    logger.debug('🚀 Starting Payriff Integration Tests...\n');

    const tests = [
      { name: 'Get Wallet', fn: testGetWallet },
      { name: 'Create Order', fn: testCreateOrder },
      { name: 'Get Order', fn: testGetOrder },
      { name: 'Create Invoice', fn: testCreateInvoice },
      { name: 'Get Invoice', fn: testGetInvoice },
    ];

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
      const success = await runTest(test.name, test.fn);
      if (success) {
        passed++;
      } else {
        failed++;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    setIsRunning(false);

    logger.debug('\n📊 Test Results:');
    logger.debug(`✅ Passed: ${passed}`);
    logger.debug(`❌ Failed: ${failed}`);
    logger.debug(`📈 Total: ${tests.length}`);

    Alert.alert(
      'Test Results',
      `Passed: ${passed}\nFailed: ${failed}\nTotal: ${tests.length}`,
      [{ text: 'OK' }],
    );
  };

  const getStatusIcon = (status: TestStatus) => {
    switch (status) {
      case 'running':
        return <ActivityIndicator size="small" color="#FFC107" />;
      case 'success':
        return <CheckCircle size={20} color="#4CAF50" />;
      case 'error':
        return <XCircle size={20} color="#F44336" />;
      default:
        return <AlertCircle size={20} color="#9E9E9E" />;
    }
  };

  const getStatusColor = (status: TestStatus) => {
    switch (status) {
      case 'running':
        return '#FFC107';
      case 'success':
        return '#4CAF50';
      case 'error':
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <Stack.Screen
        options={{
          title: 'Payriff Integration Test',
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.headerButton}
            >
              <ArrowLeft size={24} color="#000" />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Payriff Integration Test Suite</Text>
          <Text style={styles.infoText}>
            This test suite validates all Payriff API endpoints to ensure proper integration.
          </Text>
          <Text style={styles.infoText}>
            Tests include: Wallet, Orders, Invoices, and more.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.runButton, isRunning && styles.runButtonDisabled]}
          onPress={runAllTests}
          disabled={isRunning}
        >
          {isRunning ? (
            <>
              <ActivityIndicator color="#fff" />
              <Text style={styles.runButtonText}>Running Tests...</Text>
            </>
          ) : (
            <Text style={styles.runButtonText}>Run All Tests</Text>
          )}
        </TouchableOpacity>

        {testResults.length > 0 && (
          <View style={styles.resultsSection}>
            <Text style={styles.resultsTitle}>Test Results</Text>
            {testResults.map((result, index) => (
              <View
                key={index}
                style={[
                  styles.resultItem,
                  { borderLeftColor: getStatusColor(result.status) },
                ]}
              >
                <View style={styles.resultHeader}>
                  <View style={styles.resultTitleRow}>
                    {getStatusIcon(result.status)}
                    <Text style={styles.resultName}>{result.name}</Text>
                  </View>
                  {result.duration && (
                    <Text style={styles.resultDuration}>{result.duration}ms</Text>
                  )}
                </View>
                {result.message && (
                  <Text
                    style={[
                      styles.resultMessage,
                      result.status === 'error' && styles.errorMessage,
                    ]}
                  >
                    {result.message}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>Test Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Tests:</Text>
            <Text style={styles.summaryValue}>{testResults.length}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: '#4CAF50' }]}>
              Passed:
            </Text>
            <Text style={[styles.summaryValue, { color: '#4CAF50' }]}>
              {testResults.filter((r) => r.status === 'success').length}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: '#F44336' }]}>
              Failed:
            </Text>
            <Text style={[styles.summaryValue, { color: '#F44336' }]}>
              {testResults.filter((r) => r.status === 'error').length}
            </Text>
          </View>
        </View>

        <View style={styles.notesSection}>
          <Text style={styles.notesTitle}>Notes</Text>
          <Text style={styles.notesText}>
            • All tests use minimal amounts (0.01 AZN) to avoid unnecessary charges
          </Text>
          <Text style={styles.notesText}>
            • Tests are run sequentially with 500ms delay between each
          </Text>
          <Text style={styles.notesText}>
            • Check console logs for detailed request/response data
          </Text>
          <Text style={styles.notesText}>
            • Make sure your Payriff credentials are configured in .env
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
  headerButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  runButton: {
    backgroundColor: '#0E7490',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  runButtonDisabled: {
    backgroundColor: '#ccc',
  },
  runButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsSection: {
    marginBottom: 24,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  resultItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  resultDuration: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  resultMessage: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  errorMessage: {
    color: '#F44336',
  },
  summarySection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#666',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  notesSection: {
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  notesTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F57C00',
    marginBottom: 12,
  },
  notesText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
    lineHeight: 20,
  },
});
