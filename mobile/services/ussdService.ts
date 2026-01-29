import { USSDMenu, USSDMenuItem, USSDResponse } from '@/types/ussd';
import { Language } from '@/store/languageStore';

import { logger } from '@/utils/logger';
interface SessionState {
  currentMenuPath: string[];
  awaitingInput: boolean;
  inputContext: { menuId: string; itemId: string; step: number } | null;
  lastActivity: number;
  inputHistory: string[];
}

const SESSION_TIMEOUT = 120000;

const ussdMenus: Record<string, USSDMenu> = {
  main: {
    id: 'main',
    title: {
      az: 'Əsas Menyu',
      ru: 'Главное меню',
      en: 'Main Menu',
    },
    items: [
      {
        id: 'balance',
        option: '1',
        label: {
          az: 'Balans yoxla',
          ru: 'Проверить баланс',
          en: 'Check balance',
        },
        type: 'action',
        action: async () => {
          return 'Sizin balansınız: 25.50 AZN';
        },
      },
      {
        id: 'services',
        option: '2',
        label: {
          az: 'Xidmətlər',
          ru: 'Услуги',
          en: 'Services',
        },
        type: 'menu',
        children: [
          {
            id: 'internet',
            option: '1',
            label: {
              az: 'İnternet paketləri',
              ru: 'Интернет пакеты',
              en: 'Internet packages',
            },
            type: 'menu',
            children: [
              {
                id: 'daily',
                option: '1',
                label: {
                  az: 'Günlük paketlər',
                  ru: 'Дневные пакеты',
                  en: 'Daily packages',
                },
                type: 'action',
                action: async () => {
                  return '1GB - 1 AZN\n2GB - 1.50 AZN\n5GB - 3 AZN\n\nAktivləşdirmək üçün paket nömrəsini daxil edin (1-3):';
                },
              },
              {
                id: 'weekly',
                option: '2',
                label: {
                  az: 'Həftəlik paketlər',
                  ru: 'Недельные пакеты',
                  en: 'Weekly packages',
                },
                type: 'action',
                action: async () => {
                  return '5GB - 5 AZN\n10GB - 8 AZN\n20GB - 12 AZN\n\nAktivləşdirmək üçün paket nömrəsini daxil edin (1-3):';
                },
              },
              {
                id: 'monthly',
                option: '3',
                label: {
                  az: 'Aylıq paketlər',
                  ru: 'Месячные пакеты',
                  en: 'Monthly packages',
                },
                type: 'action',
                action: async () => {
                  return '20GB - 15 AZN\n50GB - 25 AZN\n100GB - 40 AZN\nLimitsiz - 60 AZN\n\nAktivləşdirmək üçün paket nömrəsini daxil edin (1-4):';
                },
              },
            ],
          },
          {
            id: 'minutes',
            option: '2',
            label: {
              az: 'Dəqiqə paketləri',
              ru: 'Пакеты минут',
              en: 'Minute packages',
            },
            type: 'action',
            action: async () => {
              return '100 dəqiqə - 3 AZN\n300 dəqiqə - 7 AZN\n1000 dəqiqə - 15 AZN\n\nAktivləşdirmək üçün paket nömrəsini daxil edin (1-3):';
            },
          },
          {
            id: 'sms',
            option: '3',
            label: {
              az: 'SMS paketləri',
              ru: 'SMS пакеты',
              en: 'SMS packages',
            },
            type: 'action',
            action: async () => {
              return '50 SMS - 1 AZN\n100 SMS - 1.50 AZN\n500 SMS - 5 AZN\n\nAktivləşdirmək üçün paket nömrəsini daxil edin (1-3):';
            },
          },
        ],
      },
      {
        id: 'transfer',
        option: '3',
        label: {
          az: 'Balans köçürmə',
          ru: 'Перевод баланса',
          en: 'Balance transfer',
        },
        type: 'input',
        action: async (input?: string) => {
          if (!input) {
            return 'Nömrəni daxil edin (məs: 0501234567):';
          }
          return `${input} nömrəsinə köçürüləcək məbləği daxil edin:`;
        },
      },
      {
        id: 'tariff',
        option: '4',
        label: {
          az: 'Tarif məlumatı',
          ru: 'Информация о тарифе',
          en: 'Tariff information',
        },
        type: 'action',
        action: async () => {
          return 'Cari tarifınız: Premium\nAylıq ödəniş: 20 AZN\nDaxil olan:\n- 10GB internet\n- 500 dəqiqə\n- 100 SMS';
        },
      },
      {
        id: 'support',
        option: '5',
        label: {
          az: 'Dəstək',
          ru: 'Поддержка',
          en: 'Support',
        },
        type: 'menu',
        children: [
          {
            id: 'call',
            option: '1',
            label: {
              az: 'Operatorla əlaqə',
              ru: 'Связаться с оператором',
              en: 'Contact operator',
            },
            type: 'action',
            action: async () => {
              return 'Dəstək xətti: 111\nİş saatları: 09:00-18:00\nHər gün';
            },
          },
          {
            id: 'faq',
            option: '2',
            label: {
              az: 'Tez-tez verilən suallar',
              ru: 'Часто задаваемые вопросы',
              en: 'FAQ',
            },
            type: 'action',
            action: async () => {
              return '1. Balansı necə yoxlayım?\n2. İnternet paketi necə aktivləşdirim?\n3. Nömrəni necə dəyişim?\n\nSual nömrəsini seçin (1-3):';
            },
          },
        ],
      },
    ],
  },
};

export class USSDService {
  private sessions: Map<string, SessionState> = new Map();
  private currentSessionId: string | null = null;

  private getOrCreateSession(sessionId?: string): { id: string; state: SessionState } {
    const id = sessionId || Date.now().toString();

    if (!this.sessions.has(id)) {
      this.sessions.set(id, {
        currentMenuPath: [],
        awaitingInput: false,
        inputContext: null,
        lastActivity: Date.now(),
        inputHistory: [],
      });
    }

    const state = this.sessions.get(id)!;
    state.lastActivity = Date.now();

    return { id, state };
  }

  private cleanupExpiredSessions(): void {
    const now = Date.now();
    const expiredSessions: string[] = [];

    this.sessions.forEach((state, id) => {
      if (now - state.lastActivity > SESSION_TIMEOUT) {
        expiredSessions.push(id);
      }
    });

    expiredSessions.forEach(id => {
      logger.debug('[USSD Service] Cleaning up expired session:', id);
      this.sessions.delete(id);
    });
  }

  async processUSSDCode(code: string, language: Language, sessionId?: string): Promise<USSDResponse & { sessionId: string }> {
    logger.debug('[USSD Service] Processing code:', code, 'SessionId:', sessionId);

    this.cleanupExpiredSessions();

    const { id, state } = this.getOrCreateSession(sessionId);
    this.currentSessionId = id;

    state.currentMenuPath = [];
    state.awaitingInput = false;
    state.inputContext = null;
    state.inputHistory = [code];

    const mainMenu = ussdMenus.main;
    const menuText = this.formatMenu(mainMenu, language);

    logger.debug('[USSD Service] Initial menu generated, SessionId:', id);

    return {
      text: menuText,
      isEnd: false,
      menuId: 'main',
      sessionId: id,
    };
  }

  async processUSSDInput(
    input: string,
    sessionId: string,
    language: Language,
  ): Promise<USSDResponse & { sessionId: string }> {
    logger.debug('[USSD Service] Processing input:', input, 'SessionId:', sessionId);

    this.cleanupExpiredSessions();

    const session = this.sessions.get(sessionId);
    if (!session) {
      logger.error('[USSD Service] Session not found:', sessionId);
      return {
        text: language === 'az'
          ? 'Sessiya bitdi. Yenidən başlayın.'
          : language === 'ru'
            ? 'Сессия истекла. Начните заново.'
            : 'Session expired. Please start again.',
        isEnd: true,
        sessionId,
      };
    }

    session.lastActivity = Date.now();
    session.inputHistory.push(input);

    const currentPath = session.currentMenuPath;
    logger.debug('[USSD Service] Current path:', currentPath, 'Awaiting input:', session.awaitingInput);

    if (session.awaitingInput && session.inputContext) {
      return await this.handleInputAction(input, sessionId, language);
    }

    if (input === '0') {
      if (currentPath.length === 0) {
        logger.debug('[USSD Service] User exited from main menu');
        this.sessions.delete(sessionId);
        return {
          text: language === 'az'
            ? 'Sessiya başa çatdı'
            : language === 'ru'
              ? 'Сессия завершена'
              : 'Session ended',
          isEnd: true,
          sessionId,
        };
      }

      const newPath = currentPath.slice(0, -1);
      session.currentMenuPath = newPath;
      logger.debug('[USSD Service] Navigating back to path:', newPath);
      return await this.navigateToMenu(newPath, sessionId, language);
    }

    const currentMenu = this.getMenuByPath(currentPath);
    if (!currentMenu) {
      logger.error('[USSD Service] Menu not found for path:', currentPath);
      this.sessions.delete(sessionId);
      return {
        text: language === 'az'
          ? 'Xəta baş verdi. Yenidən cəhd edin.'
          : language === 'ru'
            ? 'Произошла ошибка. Попробуйте снова.'
            : 'An error occurred. Please try again.',
        isEnd: true,
        sessionId,
      };
    }

    const selectedItem = currentMenu.items.find((item) => item.option === input);
    if (!selectedItem) {
      logger.warn('[USSD Service] Invalid option selected:', input);
      const errorText = this.formatMenu(currentMenu, language);
      return {
        text: `${language === 'az' ? 'Yanlış seçim! Zəhmət olmasa düzgün rəqəm daxil edin.' : language === 'ru' ? 'Неверный выбор! Пожалуйста, введите правильный номер.' : 'Invalid choice! Please enter a valid number.'}\n\n${errorText}`,
        isEnd: false,
        menuId: currentMenu.id,
        sessionId,
      };
    }

    if (selectedItem.type === 'menu' && selectedItem.children) {
      const newPath = [...currentPath, selectedItem.id];
      session.currentMenuPath = newPath;
      logger.debug('[USSD Service] Navigating to submenu:', selectedItem.id, 'New path:', newPath);

      const submenu: USSDMenu = {
        id: selectedItem.id,
        title: selectedItem.label,
        items: selectedItem.children,
        parentId: currentMenu.id,
      };

      const menuText = this.formatMenu(submenu, language);
      return {
        text: menuText,
        isEnd: false,
        menuId: selectedItem.id,
        sessionId,
      };
    }

    if (selectedItem.type === 'action' && selectedItem.action) {
      logger.debug('[USSD Service] Executing action:', selectedItem.id);
      try {
        const result = await selectedItem.action();
        return {
          text: `${result}\n\n0 - ${language === 'az' ? 'Geri' : language === 'ru' ? 'Назад' : 'Back'}`,
          isEnd: false,
          menuId: currentMenu.id,
          sessionId,
        };
      } catch (error) {
        logger.error('[USSD Service] Action execution failed:', error);
        return {
          text: language === 'az'
            ? 'Əməliyyat zamanı xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.'
            : language === 'ru'
              ? 'Произошла ошибка при выполнении операции. Пожалуйста, попробуйте снова.'
              : 'An error occurred during operation. Please try again.',
          isEnd: false,
          menuId: currentMenu.id,
          sessionId,
        };
      }
    }

    if (selectedItem.type === 'input' && selectedItem.action) {
      logger.debug('[USSD Service] Starting input flow:', selectedItem.id);
      session.awaitingInput = true;
      session.inputContext = { menuId: currentMenu.id, itemId: selectedItem.id, step: 0 };

      try {
        const result = await selectedItem.action();
        return {
          text: result,
          isEnd: false,
          requiresInput: true,
          menuId: currentMenu.id,
          sessionId,
        };
      } catch (error) {
        logger.error('[USSD Service] Input action failed:', error);
        session.awaitingInput = false;
        session.inputContext = null;
        return {
          text: language === 'az'
            ? 'Xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.'
            : language === 'ru'
              ? 'Произошла ошибка. Пожалуйста, попробуйте снова.'
              : 'An error occurred. Please try again.',
          isEnd: false,
          menuId: currentMenu.id,
          sessionId,
        };
      }
    }

    logger.debug('[USSD Service] Operation completed');
    return {
      text: language === 'az'
        ? 'Əməliyyat tamamlandı'
        : language === 'ru'
          ? 'Операция завершена'
          : 'Operation completed',
      isEnd: true,
      sessionId,
    };
  }

  private async handleInputAction(input: string, sessionId: string, language: Language): Promise<USSDResponse & { sessionId: string }> {
    const session = this.sessions.get(sessionId);

    if (!session || !session.inputContext) {
      logger.error('[USSD Service] No input context found');
      return {
        text: language === 'az'
          ? 'Xəta baş verdi'
          : language === 'ru'
            ? 'Произошла ошибка'
            : 'An error occurred',
        isEnd: true,
        sessionId,
      };
    }

    const menu = this.getMenuByPath(session.currentMenuPath);
    if (!menu) {
      logger.error('[USSD Service] Menu not found for input action');
      return {
        text: language === 'az'
          ? 'Xəta baş verdi'
          : language === 'ru'
            ? 'Произошла ошибка'
            : 'An error occurred',
        isEnd: true,
        sessionId,
      };
    }

    const item = menu.items.find((i) => i.id === session.inputContext!.itemId);
    if (item && item.action) {
      logger.debug('[USSD Service] Processing input action with value:', input);

      try {
        const result = await item.action(input);

        session.awaitingInput = false;
        session.inputContext = null;

        return {
          text: `${result}\n\n0 - ${language === 'az' ? 'Əsas menyuya qayıt' : language === 'ru' ? 'Вернуться в главное меню' : 'Back to main menu'}`,
          isEnd: false,
          menuId: menu.id,
          sessionId,
        };
      } catch (error) {
        logger.error('[USSD Service] Input action execution failed:', error);
        session.awaitingInput = false;
        session.inputContext = null;

        return {
          text: language === 'az'
            ? 'Əməliyyat zamanı xəta baş verdi.'
            : language === 'ru'
              ? 'Произошла ошибка при выполнении операции.'
              : 'An error occurred during operation.',
          isEnd: false,
          menuId: menu.id,
          sessionId,
        };
      }
    }

    logger.debug('[USSD Service] Input action completed');
    return {
      text: language === 'az'
        ? 'Əməliyyat tamamlandı'
        : language === 'ru'
          ? 'Операция завершена'
          : 'Operation completed',
      isEnd: true,
      sessionId,
    };
  }

  private async navigateToMenu(path: string[], sessionId: string, language: Language): Promise<USSDResponse & { sessionId: string }> {
    const menu = this.getMenuByPath(path);
    if (!menu) {
      logger.error('[USSD Service] Navigation failed - menu not found for path:', path);
      return {
        text: language === 'az'
          ? 'Xəta baş verdi'
          : language === 'ru'
            ? 'Произошла ошибка'
            : 'An error occurred',
        isEnd: true,
        sessionId,
      };
    }

    logger.debug('[USSD Service] Navigated to menu:', menu.id);
    const menuText = this.formatMenu(menu, language);
    return {
      text: menuText,
      isEnd: false,
      menuId: menu.id,
      sessionId,
    };
  }

  private getMenuByPath(path: string[]): USSDMenu | null {
    if (path.length === 0) {
      return ussdMenus.main;
    }

    let currentMenu: USSDMenu | null = ussdMenus.main;

    for (const itemId of path) {
      if (!currentMenu) return null;

      const foundItem: USSDMenuItem | undefined = currentMenu.items.find((i) => i.id === itemId);
      if (!foundItem || !foundItem.children) return null;

      currentMenu = {
        id: foundItem.id,
        title: foundItem.label,
        items: foundItem.children,
        parentId: currentMenu.id,
      };
    }

    return currentMenu;
  }

  private formatMenu(menu: USSDMenu, language: Language): string {
    const title = menu.title[language];
    const items = menu.items
      .map((item) => `${item.option}. ${item.label[language]}`)
      .join('\n');

    const backOption = menu.parentId
      ? `\n0 - ${language === 'az' ? 'Geri' : language === 'ru' ? 'Назад' : 'Back'}`
      : `\n0 - ${language === 'az' ? 'Çıxış' : language === 'ru' ? 'Выход' : 'Exit'}`;

    return `${title}\n\n${items}${backOption}`;
  }

  reset(sessionId?: string): void {
    if (sessionId) {
      logger.debug('[USSD Service] Resetting session:', sessionId);
      this.sessions.delete(sessionId);
      if (this.currentSessionId === sessionId) {
        this.currentSessionId = null;
      }
    } else {
      logger.debug('[USSD Service] Resetting all sessions');
      this.sessions.clear();
      this.currentSessionId = null;
    }
  }

  getSessionState(sessionId: string): SessionState | undefined {
    return this.sessions.get(sessionId);
  }

  hasActiveSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    const isExpired = Date.now() - session.lastActivity > SESSION_TIMEOUT;
    if (isExpired) {
      this.sessions.delete(sessionId);
      return false;
    }

    return true;
  }
}

export const ussdService = new USSDService();
