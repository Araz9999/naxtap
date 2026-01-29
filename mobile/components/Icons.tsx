import React from 'react';
import {
  Home, Car, Smartphone, Briefcase, Dog, Music, Store,
  Utensils, BookOpen, Package, ChevronRight, Palette,
  MessageCircle, Send, Circle,
  Copy, Share2, ExternalLink,
} from 'lucide-react-native';

export const SocialIcons = {
  WhatsApp: ({ size = 24, color = '#25D366' }: { size?: number; color?: string }) => (
    <MessageCircle size={size} color={color} />
  ),
  Facebook: ({ size = 24, color = '#1877F2' }: { size?: number; color?: string }) => (
    <Circle size={size} color={color} />
  ),
  Instagram: ({ size = 24, color = '#E4405F' }: { size?: number; color?: string }) => (
    <Circle size={size} color={color} />
  ),
  Telegram: ({ size = 24, color = '#0088CC' }: { size?: number; color?: string }) => (
    <Send size={size} color={color} />
  ),
  Twitter: ({ size = 24, color = '#1DA1F2' }: { size?: number; color?: string }) => (
    <Circle size={size} color={color} />
  ),
  VKontakte: ({ size = 24, color = '#4C75A3' }: { size?: number; color?: string }) => (
    <Circle size={size} color={color} />
  ),
  Odnoklassniki: ({ size = 24, color = '#EE8208' }: { size?: number; color?: string }) => (
    <Circle size={size} color={color} />
  ),
  TikTok: ({ size = 24, color = '#000000' }: { size?: number; color?: string }) => (
    <Music size={size} color={color} />
  ),
  Share: ({ size = 24, color = '#666' }: { size?: number; color?: string }) => (
    <Share2 size={size} color={color} />
  ),
  Copy: ({ size = 24, color = '#666' }: { size?: number; color?: string }) => (
    <Copy size={size} color={color} />
  ),
  External: ({ size = 24, color = '#666' }: { size?: number; color?: string }) => (
    <ExternalLink size={size} color={color} />
  ),
};

export {
  Home, Car, Smartphone, Briefcase, Dog, Music, Store,
  Utensils, BookOpen, Package, ChevronRight, Palette,
  MessageCircle, Send, Circle,
  Copy, Share2, ExternalLink,
};
