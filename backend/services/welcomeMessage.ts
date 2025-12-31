import { logger } from '../utils/logger';
import { chatDb } from '../db/chat';

/**
 * Welcome message service for new users
 * Sends a beautiful welcome message from the system to newly registered users
 */

const SYSTEM_USER_ID = 'system';

const welcomeMessages = {
  az: {
    title: '🎉 Xoş gəlmisiniz!',
    body: `Salam! Naxtap-a xoş gəldiniz! 👋

Biz sizin burada olduğunuza çox şadıq! Naxtap Azərbaycanın ən böyük elan platformasıdır.

✨ Naxtap-da nələr edə bilərsiniz:

📢 **Elan yerləşdir** - İstənilən məhsul və ya xidməti satın
🔍 **Axtarış et** - Minlərlə elan arasından axtardığınızı tapın
💬 **Mesajlaşın** - Satıcılarla birbaşa əlaqə saxlayın
📞 **Video zəng edin** - Real vaxt rejimində söhbət edin
🏪 **Mağaza açın** - Öz biznesinizi inkişaf etdirin
💰 **Təhlükəsiz ödəniş** - Payriff ilə rahat və etibarlı ödəniş

🎁 **Xüsusi bonus:** İlk elanınız tamamilə pulsuzdur!

Hər hansı sualınız olarsa, canlı dəstək komandamız həmişə sizə kömək etməyə hazırdır. 

Uğurlar və gözəl alış-verişlər! 🌟

— Naxtap Komandası`,
  },
  ru: {
    title: '🎉 Добро пожаловать!',
    body: `Здравствуйте! Добро пожаловать в Naxtap! 👋

Мы очень рады, что вы здесь! Naxtap - крупнейшая платформа объявлений Азербайджана.

✨ Что вы можете делать в Naxtap:

📢 **Размещать объявления** - Продавайте любые товары и услуги
🔍 **Искать** - Найдите то, что ищете среди тысяч объявлений
💬 **Общаться** - Связывайтесь напрямую с продавцами
📞 **Видеозвонки** - Общайтесь в режиме реального времени
🏪 **Открыть магазин** - Развивайте свой бизнес
💰 **Безопасная оплата** - Удобная и надежная оплата через Payriff

🎁 **Специальный бонус:** Ваше первое объявление полностью бесплатно!

Если у вас возникнут вопросы, наша служба поддержки всегда готова помочь.

Удачи и приятных покупок! 🌟

— Команда Naxtap`,
  },
  en: {
    title: '🎉 Welcome!',
    body: `Hello! Welcome to Naxtap! 👋

We're so glad you're here! Naxtap is Azerbaijan's largest classified ads platform.

✨ What you can do on Naxtap:

📢 **Post ads** - Sell any products or services
🔍 **Search** - Find what you're looking for among thousands of ads
💬 **Message** - Connect directly with sellers
📞 **Video call** - Chat in real-time
🏪 **Open a store** - Grow your business
💰 **Secure payment** - Easy and reliable payment via Payriff

🎁 **Special bonus:** Your first ad is completely free!

If you have any questions, our live support team is always ready to help.

Good luck and happy shopping! 🌟

— Naxtap Team`,
  },
};

/**
 * Sends a welcome message to a newly registered user
 * @param userId - The ID of the newly registered user
 * @param userLanguage - User's preferred language (az, ru, en)
 * @param listingId - Optional listing ID for the conversation (defaults to 'welcome')
 */
export async function sendWelcomeMessage(
  userId: string,
  userLanguage: 'az' | 'ru' | 'en' = 'az',
  listingId: string = 'welcome-message',
): Promise<boolean> {
  try {
    // Validate inputs
    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
      logger.error('[WelcomeMessage] Invalid userId provided');
      return false;
    }

    // Get the welcome message in user's language
    const message = welcomeMessages[userLanguage] || welcomeMessages.az;

    // Check if conversation already exists
    let conversation = chatDb.conversations.findBetweenUsers(SYSTEM_USER_ID, userId, listingId);

    // Create conversation if it doesn't exist
    if (!conversation) {
      conversation = chatDb.conversations.create([SYSTEM_USER_ID, userId], listingId);
      logger.info(`[WelcomeMessage] Created welcome conversation for user: ${userId}`);
    }

    // Send the welcome message
    const chatMessage = chatDb.messages.create(conversation.id, {
      senderId: SYSTEM_USER_ID,
      receiverId: userId,
      listingId: listingId,
      text: `${message.title}\n\n${message.body}`,
      type: 'text',
      attachments: [],
    });

    if (!chatMessage) {
      logger.error('[WelcomeMessage] Failed to create welcome message');
      return false;
    }

    logger.info(`[WelcomeMessage] Welcome message sent to user: ${userId} (language: ${userLanguage})`);
    return true;
  } catch (error) {
    logger.error('[WelcomeMessage] Error sending welcome message:', error);
    return false;
  }
}

/**
 * Get system user information
 */
export function getSystemUser() {
  return {
    id: SYSTEM_USER_ID,
    name: 'Naxtap',
    avatar: '/assets/images/naxtap-logo.png',
    role: 'SYSTEM',
  };
}
