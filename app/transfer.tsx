import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { ArrowLeft, Send } from 'lucide-react-native';
import { trpc } from '@/lib/trpc';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TransferScreen() {
  const insets = useSafeAreaInsets();
  const [toMerchant, setToMerchant] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  const transferMutation = trpc.payriff.transfer.useMutation({
    onSuccess: (data) => {
      Alert.alert(
        'Transfer Successful',
        `Status: ${data.payload}\n${data.message}`,
        [
          {
            text: 'OK',
            onPress: () => {
              setToMerchant('');
              setAmount('');
              setDescription('');
            },
          },
        ],
      );
    },
    onError: (error) => {
      Alert.alert('Transfer Failed', error.message);
    },
  });

  const handleTransfer = () => {
    if (!toMerchant.trim()) {
      Alert.alert('Error', 'Please enter recipient merchant ID');
      return;
    }

    if (!amount.trim()) {
      Alert.alert('Error', 'Please enter amount');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount greater than 0');
      return;
    }

    if (parsedAmount > 10000) {
      Alert.alert('Error', 'Maximum transfer amount is 10,000 AZN');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }

    Alert.alert(
      'Confirm Transfer',
      `Transfer ${parsedAmount.toFixed(2)} AZN to merchant ${toMerchant}?\n\nDescription: ${description.trim()}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            transferMutation.mutate({
              toMerchant: toMerchant.trim(),
              amount: parsedAmount,
              description: description.trim(),
            });
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <Stack.Screen
        options={{
          title: 'Transfer Money',
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
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Wallet to Wallet Transfer</Text>
          <Text style={styles.cardDescription}>
            Transfer money from your Payriff wallet to another merchant&apos;s wallet
          </Text>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Recipient Merchant ID</Text>
              <TextInput
                style={styles.input}
                placeholder="ES1234567"
                value={toMerchant}
                onChangeText={setToMerchant}
                autoCapitalize="characters"
                editable={!transferMutation.isPending}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Amount (AZN)</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                editable={!transferMutation.isPending}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Enter transfer reason"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                editable={!transferMutation.isPending}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.transferButton,
                transferMutation.isPending && styles.transferButtonDisabled,
              ]}
              onPress={handleTransfer}
              disabled={transferMutation.isPending}
            >
              {transferMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Send size={20} color="#fff" />
                  <Text style={styles.transferButtonText}>Transfer Money</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Transfer Information</Text>
          <View style={styles.infoItem}>
            <Text style={styles.infoBullet}>•</Text>
            <Text style={styles.infoText}>
              Transfers are instant between Payriff wallets
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoBullet}>•</Text>
            <Text style={styles.infoText}>
              Make sure the recipient merchant ID is correct
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoBullet}>•</Text>
            <Text style={styles.infoText}>
              Transfers cannot be reversed once completed
            </Text>
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
  headerButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  card: {
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
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 80,
    paddingTop: 12,
  },
  transferButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  transferButtonDisabled: {
    backgroundColor: '#ccc',
  },
  transferButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 8,
  },
  infoBullet: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '700',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
