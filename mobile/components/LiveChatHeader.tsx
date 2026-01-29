import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ArrowLeft, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from '@/constants/translations';

interface LiveChatHeaderProps {
  agentName?: string;
  agentStatus?: 'online' | 'offline' | 'busy';
  onClose?: () => void;
}

export default function LiveChatHeader({ agentName, agentStatus, onClose }: LiveChatHeaderProps) {
  const router = useRouter();
  const { t } = useTranslation();

  const getStatusColor = () => {
    switch (agentStatus) {
      case 'online':
        return '#4CAF50';
      case 'busy':
        return '#FF9800';
      case 'offline':
        return '#999';
      default:
        return '#999';
    }
  };

  const getStatusText = () => {
    switch (agentStatus) {
      case 'online':
        return t('online');
      case 'busy':
        return t('busy');
      case 'offline':
        return t('offline');
      default:
        return '';
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => onClose ? onClose() : router.back()}
      >
        <ArrowLeft size={24} color="#000" />
      </TouchableOpacity>

      <View style={styles.info}>
        <Text style={styles.name}>{agentName || t('liveSupport')}</Text>
        {agentStatus && (
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
            <Text style={styles.status}>{getStatusText()}</Text>
          </View>
        )}
      </View>

      {onClose && (
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <X size={24} color="#000" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  status: {
    fontSize: 13,
    color: '#666',
  },
  closeButton: {
    padding: 4,
    marginLeft: 12,
  },
});
