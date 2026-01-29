import React, { useEffect, useState } from 'react'
import { useRoute } from '@react-navigation/native';;
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { trpc } from '../../../lib/trpc';
import { CheckCircle, XCircle, Mail } from 'lucide-react-native';

export default function VerifyEmailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { token  } = (route.params || {}) as any;
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('');

  const verifyMutation = trpc.auth.verifyEmail.useMutation();

  useEffect(() => {
    if (token) {
      verifyEmail();
    }
  }, [token]);

  const verifyEmail = async () => {
    try {
      const result = await verifyMutation.mutateAsync({ token: token as string });
      setStatus('success');
      setMessage(result.message);
    } catch (error: any) {
      setStatus('error');
      setMessage(error.message || 'Email təsdiqi uğursuz oldu');
    }
  };

  const handleContinue = () => {
    navigation.replace('/');
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Email Təsdiqi', headerShown: true }} />
      <View style={styles.container}>
        <View style={styles.content}>
          {status === 'loading' && (
            <>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.title}>Email təsdiq edilir...</Text>
              <Text style={styles.description}>Zəhmət olmasa gözləyin</Text>
            </>
          )}

          {status === 'success' && (
            <>
              <View style={styles.iconContainer}>
                <CheckCircle size={80} color="#34C759" />
              </View>
              <Text style={styles.title}>Uğurlu!</Text>
              <Text style={styles.description}>{message}</Text>
              <TouchableOpacity style={styles.button} onPress={handleContinue}>
                <Text style={styles.buttonText}>Davam et</Text>
              </TouchableOpacity>
            </>
          )}

          {status === 'error' && (
            <>
              <View style={styles.iconContainer}>
                <XCircle size={80} color="#FF3B30" />
              </View>
              <Text style={styles.title}>Xəta</Text>
              <Text style={styles.description}>{message}</Text>
              <TouchableOpacity style={styles.button} onPress={() => navigation.replace('/auth/login')}>
                <Text style={styles.buttonText}>Girişə qayıt</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.footer}>
          <Mail size={20} color="#8E8E93" />
          <Text style={styles.footerText}>naxtapaz@gmail.com</Text>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    minWidth: 200,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 8,
  },
  footerText: {
    fontSize: 14,
    color: '#8E8E93',
  },
});
