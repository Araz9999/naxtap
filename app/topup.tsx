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
import { ArrowLeft, Smartphone } from 'lucide-react-native';
import { trpc } from '@/lib/trpc';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguageStore } from '@/store/languageStore';

export default function TopupScreen() {
  const insets = useSafeAreaInsets();
  const { language } = useLanguageStore();
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  const topupMutation = trpc.payriff.topup.useMutation({
    onSuccess: (data) => {
      Alert.alert(
        'Topup Successful',
        `Status: ${data.payload}\n${data.message}`,
        [
          {
            text: 'OK',
            onPress: () => {
              setPhoneNumber('');
              setAmount('');
              setDescription('');
            },
          },
        ],
      );
    },
    onError: (error) => {
      Alert.alert('Topup Failed', error.message);
    },
  });

  const formatPhoneNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    return cleaned;
  };

  const handlePhoneChange = (text: string) => {
    const formatted = formatPhoneNumber(text);
    setPhoneNumber(formatted);
  };

  const handleTopup = () => {
    if (!phoneNumber.trim()) {
      Alert.alert('Error', 'Please enter phone number');
      return;
    }

    if (phoneNumber.length !== 12 || !phoneNumber.startsWith('994')) {
      Alert.alert('Error', 'Please enter a valid phone number starting with 994 (994XXXXXXXXX)');
      return;
    }

    if (!amount.trim()) {
      Alert.alert('Error', 'Please enter amount');
      return;
    }

    const parsedAmount = parseFloat(amount);

    // BUG FIX: Consolidated duplicate validation checks
    if (isNaN(parsedAmount) || parsedAmount < 1) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Error',
        language === 'az' ? 'Minimum məbləğ 1 AZN olmalıdır' : 'Please enter a valid amount (minimum 1 AZN)',
      );
      return;
    }

    if (parsedAmount > 5000) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Error',
        language === 'az' ? 'Maksimum məbləğ 5,000 AZN-dir' : 'Maximum topup amount is 5,000 AZN',
      );
      return;
    }

    if (!description.trim()) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Error',
        language === 'az' ? 'Təsvir daxil edin' : 'Please enter a description',
      );
      return;
    }

    Alert.alert(
      'Confirm Topup',
      `Topup ${parsedAmount.toFixed(2)} AZN to MPAY wallet ${phoneNumber}?\n\nDescription: ${description.trim()}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            topupMutation.mutate({
              phoneNumber: phoneNumber.trim(),
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
          title: 'Topup MPAY',
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
          <Text style={styles.cardTitle}>MPAY Wallet Topup</Text>
          <Text style={styles.cardDescription}>
            Transfer money from your Payriff wallet to an MPAY wallet
          </Text>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <View style={styles.phoneInputContainer}>
                <Text style={styles.phonePrefix}>+</Text>
                <TextInput
                  style={styles.phoneInput}
                  placeholder="994501234567"
                  value={phoneNumber}
                  onChangeText={handlePhoneChange}
                  keyboardType="phone-pad"
                  maxLength={12}
                  editable={!topupMutation.isPending}
                />
              </View>
              <Text style={styles.hint}>Format: 994XXXXXXXXX</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Amount (AZN)</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                editable={!topupMutation.isPending}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Enter topup reason"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                editable={!topupMutation.isPending}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.topupButton,
                topupMutation.isPending && styles.topupButtonDisabled,
              ]}
              onPress={handleTopup}
              disabled={topupMutation.isPending}
            >
              {topupMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Smartphone size={20} color="#fff" />
                  <Text style={styles.topupButtonText}>Topup MPAY Wallet</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Topup Information</Text>
          <View style={styles.infoItem}>
            <Text style={styles.infoBullet}>•</Text>
            <Text style={styles.infoText}>
              Topups are instant to MPAY wallets
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoBullet}>•</Text>
            <Text style={styles.infoText}>
              Make sure the phone number is correct and registered with MPAY
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoBullet}>•</Text>
            <Text style={styles.infoText}>
              Topups cannot be reversed once completed
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoBullet}>•</Text>
            <Text style={styles.infoText}>
              Phone number must include country code (994 for Azerbaijan)
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
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  phonePrefix: {
    fontSize: 16,
    color: '#333',
    paddingLeft: 12,
    fontWeight: '600',
  },
  phoneInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  hint: {
    fontSize: 12,
    color: '#999',
  },
  textArea: {
    minHeight: 80,
    paddingTop: 12,
  },
  topupButton: {
    backgroundColor: '#34C759',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  topupButtonDisabled: {
    backgroundColor: '#ccc',
  },
  topupButtonText: {
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
    color: '#34C759',
    fontWeight: '700',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
