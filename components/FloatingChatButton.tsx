import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated
} from 'react-native';
import { usePathname } from 'expo-router';
import { useLanguageStore } from '@/store/languageStore';
import { useThemeStore } from '@/store/themeStore';
import { useUserStore } from '@/store/userStore';
import { useSupportStore } from '@/store/supportStore';
import { getColors } from '@/constants/colors';
import { MessageCircle } from 'lucide-react-native';
import LiveChatWidget from './LiveChatWidget';
import { trpc } from '@/lib/trpc';



import { logger } from '@/utils/logger';
export default function FloatingChatButton() {
  const pathname = usePathname();
  const { language } = useLanguageStore();
  const { themeMode, colorTheme } = useThemeStore();
  const { currentUser } = useUserStore();
  const { liveChats, getAvailableOperators } = useSupportStore();
  const colors = getColors(themeMode, colorTheme);

  const [showChat, setShowChat] = useState<boolean>(false);
  const [pulseAnim] = useState(new Animated.Value(1));

  // Get user's active chats
  const userChats = currentUser ? liveChats.filter(chat => 
    chat.userId === currentUser.id && chat.status !== 'closed'
  ) : [];

  const hasActiveChat = userChats.length > 0;
  const availableOperators = getAvailableOperators();
  const { data: agentStats } = trpc.liveChat.getAgentStats.useQuery(undefined, {
    refetchInterval: 10000,
  });
  const onlineOperatorsCount = agentStats?.availableCount ?? availableOperators.length;

  // Pulse animation for new messages
  React.useEffect(() => {
    if (hasActiveChat) {
      const pulse = () => {
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setTimeout(pulse, 2000);
        });
      };
      pulse();
    }
  }, [hasActiveChat, pulseAnim]);

  const handlePress = () => {
    if (!currentUser) {
      logger.debug('[FloatingChatButton] User not logged in');
      return;
    }
    logger.debug('[FloatingChatButton] Opening chat');
    setShowChat(true);
  };

  // Don't show on certain pages
  if (pathname === '/live-chat' || pathname === '/support') {
    return null;
  }

  return (
    <>
      <Animated.View
        style={[
          styles.container,
          {
            transform: [{ scale: pulseAnim }]
          }
        ]}
      >
        <TouchableOpacity
          testID="floating-chat-button"
          style={[
            styles.button,
            {
              backgroundColor: colors.primary,
              shadowColor: colors.primary
            }
          ]}
          onPress={handlePress}
          activeOpacity={0.8}
        >
          <MessageCircle size={24} color="#fff" />
          
          {/* Notification Badge */}
          {hasActiveChat && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{userChats.length}</Text>
            </View>
          )}
          
          {/* Online Indicator */}
          {onlineOperatorsCount > 0 && (
            <View style={styles.onlineIndicator}>
              <View style={styles.onlineDot} />
            </View>
          )}
        </TouchableOpacity>
        
        {/* Tooltip */}
        <View style={[styles.tooltip, { backgroundColor: colors.card }]}>
          <Text style={[styles.tooltipText, { color: colors.text }]}>
            {language === 'az' 
              ? hasActiveChat 
                ? 'Aktiv söhbət'
                : 'Canlı dəstək'
              : hasActiveChat
                ? 'Активный чат'
                : 'Живая поддержка'
            }
          </Text>
          {onlineOperatorsCount > 0 && (
            <Text style={[styles.tooltipSubtext, { color: colors.textSecondary }]}>
              {onlineOperatorsCount} {language === 'az' ? 'operator onlayn' : 'операторов онлайн'}
            </Text>
          )}
        </View>
      </Animated.View>

      <LiveChatWidget
        visible={showChat}
        onClose={() => setShowChat(false)}
        chatId={hasActiveChat ? userChats[0].id : undefined}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    zIndex: 9999,
    elevation: 9999,
    pointerEvents: 'box-none',
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 10000,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: '#fff',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
  },
  tooltip: {
    position: 'absolute',
    right: 70,
    top: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 120,
    elevation: 4,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    pointerEvents: 'none',
    opacity: 0,
  },
  tooltipText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  tooltipSubtext: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
  },
});