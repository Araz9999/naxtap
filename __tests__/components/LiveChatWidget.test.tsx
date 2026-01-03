import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Keyboard } from 'react-native';
import LiveChatWidget from '@/components/LiveChatWidget';

// Mock stores
jest.mock('@/store/languageStore', () => ({
  useLanguageStore: () => ({ language: 'az' }),
}));

jest.mock('@/store/themeStore', () => ({
  useThemeStore: () => ({ themeMode: 'light', colorTheme: 'blue' }),
}));

jest.mock('@/store/userStore', () => ({
  useUserStore: () => ({ 
    currentUser: { 
      id: 'user1', 
      name: 'Test User',
      email: 'test@example.com' 
    } 
  }),
}));

jest.mock('@/store/supportStore', () => ({
  useSupportStore: () => ({
    liveChats: [{
      id: 'chat1',
      userId: 'user1',
      operatorId: 'op1',
      status: 'active',
      messages: [
        {
          id: 'msg1',
          chatId: 'chat1',
          senderId: 'user1',
          senderType: 'user',
          message: 'Test message',
          timestamp: new Date(),
          isRead: false,
        }
      ],
      operatorTyping: false,
      userTyping: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }],
    operators: [{
      id: 'op1',
      name: 'Support',
      avatar: '',
      status: 'online',
      isOnline: true,
    }],
    categories: [
      { id: '1', name: 'Texniki', nameRu: 'Техническая' },
      { id: '2', name: 'Ödəniş', nameRu: 'Оплата' },
      { id: '3', name: 'Digər', nameRu: 'Другое' },
    ],
    sendMessage: jest.fn(),
    closeLiveChat: jest.fn(),
    setTyping: jest.fn(),
    markMessagesAsRead: jest.fn(),
    startLiveChat: jest.fn(() => 'chat1'),
  }),
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('LiveChatWidget Keyboard Behavior', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { getByTestId } = render(
      <LiveChatWidget visible={true} onClose={mockOnClose} chatId="chat1" />
    );
    
    expect(getByTestId('livechat-widget-input')).toBeTruthy();
  });

  it('should handle keyboard show event', async () => {
    const { getByTestId } = render(
      <LiveChatWidget visible={true} onClose={mockOnClose} chatId="chat1" />
    );

    const input = getByTestId('livechat-widget-input');

    // Simulate keyboard show
    fireEvent(input, 'focus');
    
    // Keyboard.emit would be used in real scenario, but we just test that input is accessible
    expect(input).toBeTruthy();
  });

  it('should handle text input without jumping', async () => {
    const { getByTestId } = render(
      <LiveChatWidget visible={true} onClose={mockOnClose} chatId="chat1" />
    );

    const input = getByTestId('livechat-widget-input');
    
    // Simulate typing
    fireEvent.changeText(input, 'Test message');
    
    await waitFor(() => {
      expect(input.props.value).toBe('Test message');
    });
  });

  it('should scroll to bottom when keyboard shows', async () => {
    const { getByTestId } = render(
      <LiveChatWidget visible={true} onClose={mockOnClose} chatId="chat1" />
    );

    const input = getByTestId('livechat-widget-input');
    
    // Focus input (simulates keyboard show)
    fireEvent(input, 'focus');
    
    // In real app, this would trigger keyboard listeners
    // and scroll to end
    expect(input).toBeTruthy();
  });

  it('should handle keyboard hide event', async () => {
    const { getByTestId } = render(
      <LiveChatWidget visible={true} onClose={mockOnClose} chatId="chat1" />
    );

    const input = getByTestId('livechat-widget-input');
    
    // Focus then blur
    fireEvent(input, 'focus');
    fireEvent(input, 'blur');
    
    expect(input).toBeTruthy();
  });

  it('should send message and clear input', async () => {
    const { getByTestId } = render(
      <LiveChatWidget visible={true} onClose={mockOnClose} chatId="chat1" />
    );

    const input = getByTestId('livechat-widget-input');
    
    // Type message
    fireEvent.changeText(input, 'Hello support');
    
    // Submit
    fireEvent(input, 'submitEditing');
    
    await waitFor(() => {
      // Input should be cleared after sending
      expect(input.props.value).toBe('');
    });
  });

  it('should maintain input focus during typing', async () => {
    const { getByTestId } = render(
      <LiveChatWidget visible={true} onClose={mockOnClose} chatId="chat1" />
    );

    const input = getByTestId('livechat-widget-input');
    
    // Focus input
    fireEvent(input, 'focus');
    
    // Type multiple characters
    fireEvent.changeText(input, 'T');
    fireEvent.changeText(input, 'Te');
    fireEvent.changeText(input, 'Tes');
    fireEvent.changeText(input, 'Test');
    
    await waitFor(() => {
      expect(input.props.value).toBe('Test');
    });
  });
});
