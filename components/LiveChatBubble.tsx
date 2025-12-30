import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LiveChatMessage } from '@/types/support';
import { Check, CheckCheck, Clock } from 'lucide-react-native';

interface LiveChatBubbleProps {
  message: LiveChatMessage;
  isCurrentUser: boolean;
}

const LiveChatBubble = memo(function LiveChatBubble({ message, isCurrentUser }: LiveChatBubbleProps) {
  const getStatusIcon = () => {
    if (!isCurrentUser) return null;

    if (message.isRead) {
      return <CheckCheck size={14} color="#4CAF50" />;
    }
    return <Check size={14} color="rgba(255, 255, 255, 0.7)" />;
  };

  const formatTime = (timestamp: Date) => {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  return (
    <View style={[styles.container, isCurrentUser ? styles.currentUser : styles.otherUser]}>
      <View style={[styles.bubble, isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble]}>
        <Text style={[styles.message, isCurrentUser ? styles.currentUserText : styles.otherUserText]}>
          {message.message}
        </Text>
        <View style={styles.footer}>
          <Text style={[styles.time, isCurrentUser ? styles.currentUserTime : styles.otherUserTime]}>
            {formatTime(message.timestamp)}
          </Text>
          {getStatusIcon()}
        </View>
      </View>
    </View>
  );
});

export default LiveChatBubble;

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    paddingHorizontal: 16,
  },
  currentUser: {
    alignItems: 'flex-end',
  },
  otherUser: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '75%',
    borderRadius: 16,
    padding: 12,
  },
  currentUserBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  otherUserBubble: {
    backgroundColor: '#F0F0F0',
    borderBottomLeftRadius: 4,
  },
  message: {
    fontSize: 15,
    lineHeight: 20,
  },
  currentUserText: {
    color: '#FFFFFF',
  },
  otherUserText: {
    color: '#000000',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 3,
  },
  time: {
    fontSize: 10,
  },
  currentUserTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherUserTime: {
    color: '#999',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#999',
  },
});
