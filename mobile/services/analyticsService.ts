import config from '@/constants/config';
import { Platform } from 'react-native';

import { logger } from '@/utils/logger';
export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, string | number | boolean | null>;
  userId?: string;
}

export interface UserProperties {
  userId: string;
  email?: string;
  name?: string;
  plan?: string;
  signupDate?: Date;
  [key: string]: string | number | boolean | Date | undefined;
}

class AnalyticsService {
  private googleAnalyticsId: string;
  private mixpanelToken: string;
  private isEnabled: boolean;

  constructor() {
    this.googleAnalyticsId = config.GOOGLE_ANALYTICS_ID as string;
    this.mixpanelToken = config.MIXPANEL_TOKEN as string;
    this.isEnabled = config.ENABLE_ANALYTICS as boolean;
  }

  async initialize(): Promise<void> {
    if (!this.isEnabled || !this.isConfigured()) {
      logger.info('[AnalyticsService] Analytics not configured or disabled');
      return;
    }

    logger.info('[AnalyticsService] Initializing analytics:', { platform: Platform.OS });

    if (Platform.OS === 'web') {
      await this.initializeGoogleAnalytics();
    }

    await this.initializeMixpanel();

    logger.info('[AnalyticsService] Analytics initialized successfully');
  }

  private async initializeGoogleAnalytics(): Promise<void> {
    if (Platform.OS !== 'web' || !this.googleAnalyticsId) return;

    try {
      // SECURITY: Validate Google Analytics ID format before injection
      const gaIdPattern = /^(G|UA|AW|DC)-[A-Z0-9-]+$/;
      if (!gaIdPattern.test(this.googleAnalyticsId)) {
        logger.error('[Analytics] Invalid Google Analytics ID format');
        return;
      }

      const script1 = document.createElement('script');
      script1.async = true;
      script1.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(this.googleAnalyticsId)}`;
      document.head.appendChild(script1);

      // SECURITY: Use textContent instead of innerHTML for script content
      const script2 = document.createElement('script');
      script2.textContent = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${this.googleAnalyticsId.replace(/'/g, "\\'")}');
      `;
      document.head.appendChild(script2);

      interface WindowWithGtag extends Window {
        gtag?: (...args: unknown[]) => void;
        dataLayer?: unknown[];
      }

      const windowWithGtag = window as unknown as WindowWithGtag;
      windowWithGtag.gtag = windowWithGtag.gtag || function(...args: unknown[]) {
        (windowWithGtag.dataLayer = windowWithGtag.dataLayer || []).push(args);
      };

      logger.info('[AnalyticsService] Google Analytics initialized successfully');
    } catch (error) {
      logger.error('[AnalyticsService] Failed to initialize Google Analytics:', error);
    }
  }

  private async initializeMixpanel(): Promise<void> {
    if (!this.mixpanelToken) return;
    if (this.mixpanelToken.length < 10) return; // avoid initializing with placeholders

    try {
      if (Platform.OS === 'web') {
        const script = document.createElement('script');
        script.src = 'https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js';
        script.async = true;
        document.head.appendChild(script);

        script.onload = () => {
          (window as any).mixpanel.init(this.mixpanelToken);
          logger.info('[AnalyticsService] Mixpanel initialized successfully');
        };
      } else {
        logger.info('[AnalyticsService] Mixpanel mobile SDK would need to be installed separately');
      }
    } catch (error) {
      logger.error('[AnalyticsService] Failed to initialize Mixpanel:', error);
    }
  }

  track(event: AnalyticsEvent): void {
    if (!this.isEnabled) return;

    // ===== VALIDATION START =====

    // 1. Validate event object
    if (!event || typeof event !== 'object') {
      logger.error('[Analytics] Invalid event object');
      return;
    }

    // 2. Validate event name
    if (!event.name || typeof event.name !== 'string' || event.name.trim().length === 0) {
      logger.error('[Analytics] Invalid event name');
      return;
    }

    if (event.name.trim().length > 100) {
      logger.error('[Analytics] Event name too long (max 100 chars)');
      return;
    }

    // 3. Validate properties (if provided)
    if (event.properties !== undefined && typeof event.properties !== 'object') {
      logger.error('[Analytics] Invalid properties object');
      return;
    }

    // 4. Validate userId (if provided)
    if (event.userId !== undefined && typeof event.userId !== 'string') {
      logger.error('[Analytics] Invalid userId');
      return;
    }

    // ===== VALIDATION END =====

    logger.info('[AnalyticsService] Tracking event:', { name: event.name, userId: event.userId });

    if (Platform.OS === 'web') {
      this.trackGoogleAnalytics(event);
    }

    this.trackMixpanel(event);
  }

  private trackGoogleAnalytics(event: AnalyticsEvent): void {
    if (Platform.OS !== 'web') return;

    try {
      interface WindowWithGtag extends Window {
        gtag?: (command: string, eventName: string, params?: Record<string, unknown>) => void;
      }
      const windowWithGtag = window as unknown as WindowWithGtag;

      if (windowWithGtag.gtag) {
        windowWithGtag.gtag('event', event.name, {
          ...event.properties,
          user_id: event.userId,
        });
        logger.info('[AnalyticsService] Google Analytics event tracked:', event.name);
      }
    } catch (error) {
      logger.error('[AnalyticsService] Google Analytics tracking error:', error);
    }
  }

  private trackMixpanel(event: AnalyticsEvent): void {
    try {
      interface WindowWithMixpanel extends Window {
        mixpanel?: {
          track: (name: string, properties?: Record<string, unknown>) => void;
          identify: (userId: string) => void;
          people: {
            set: (properties: Record<string, unknown>) => void;
          };
        };
      }
      const windowWithMixpanel = window as unknown as WindowWithMixpanel;

      if (Platform.OS === 'web' && windowWithMixpanel.mixpanel) {
        windowWithMixpanel.mixpanel.track(event.name, event.properties);
        if (event.userId) {
          windowWithMixpanel.mixpanel.identify(event.userId);
        }
        logger.info('[AnalyticsService] Mixpanel event tracked:', event.name);
      } else {
        logger.info('[AnalyticsService] Mixpanel mobile tracking would be implemented here');
      }
    } catch (error) {
      logger.error('[AnalyticsService] Mixpanel tracking error:', error);
    }
  }

  identify(userProperties: UserProperties): void {
    if (!this.isEnabled) return;

    // ===== VALIDATION START =====

    if (!userProperties || typeof userProperties !== 'object') {
      logger.error('[Analytics] Invalid userProperties object');
      return;
    }

    if (!userProperties.userId || typeof userProperties.userId !== 'string' || userProperties.userId.trim().length === 0) {
      logger.error('[Analytics] Invalid userId in userProperties');
      return;
    }

    // ===== VALIDATION END =====

    logger.info('[AnalyticsService] Identifying user:', { userId: userProperties.userId });

    try {
      if (Platform.OS === 'web') {
        interface WindowWithAnalytics extends Window {
          gtag?: (...args: unknown[]) => void;
          mixpanel?: {
            identify: (userId: string) => void;
            people: {
              set: (properties: Record<string, unknown>) => void;
            };
          };
        }
        const windowWithAnalytics = window as unknown as WindowWithAnalytics;

        if (windowWithAnalytics.gtag) {
          windowWithAnalytics.gtag('config', this.googleAnalyticsId, {
            user_id: userProperties.userId,
          });
        }

        if (windowWithAnalytics.mixpanel) {
          windowWithAnalytics.mixpanel.identify(userProperties.userId);
          windowWithAnalytics.mixpanel.people.set(userProperties);
        }
      }
    } catch (error) {
      logger.error('[Analytics] Error in identify:', error);
    }
  }

  setUserProperties(properties: Partial<UserProperties>): void {
    if (!this.isEnabled) return;

    // ✅ Input validation
    if (!properties || Object.keys(properties).length === 0) {
      logger.error('[AnalyticsService] Empty properties object');
      return;
    }

    logger.info('[AnalyticsService] Setting user properties:', Object.keys(properties));

    if (Platform.OS === 'web' && (window as any).mixpanel) {
      (window as any).mixpanel.people.set(properties);
    }
  }

  trackPageView(pageName: string, properties?: Record<string, unknown>): void {
    // \u2705 Validate pageName
    if (!pageName || typeof pageName !== 'string' || pageName.trim().length === 0) {
      logger.error('[Analytics] Invalid pageName');
      return;
    }

    this.track({
      name: 'page_view',
      properties: {
        page_name: pageName.trim(),
        ...properties,
      },
    });
  }

  trackUserAction(action: string, properties?: Record<string, unknown>): void {
    // \u2705 Validate action
    if (!action || typeof action !== 'string' || action.trim().length === 0) {
      logger.error('[Analytics] Invalid action');
      return;
    }

    this.track({
      name: 'user_action',
      properties: {
        action: action.trim(),
        ...properties,
      },
    });
  }

  trackPurchase(amount: number, currency: string, itemId?: string): void {
    // ===== VALIDATION START =====

    // 1. Validate amount
    if (typeof amount !== 'number' || isNaN(amount) || !isFinite(amount)) {
      logger.error('[Analytics] Invalid purchase amount');
      return;
    }

    if (amount < 0) {
      logger.error('[Analytics] Purchase amount cannot be negative');
      return;
    }

    if (amount > 1000000) {
      logger.error('[Analytics] Purchase amount exceeds maximum (1,000,000)');
      return;
    }

    // 2. Validate currency
    if (!currency || typeof currency !== 'string' || currency.trim().length === 0) {
      logger.error('[Analytics] Invalid currency');
      return;
    }

    const validCurrencies = ['AZN', 'USD', 'EUR', 'GBP', 'RUB', 'TRY'];
    if (!validCurrencies.includes(currency.toUpperCase())) {
      logger.error(`[Analytics] Invalid currency: ${currency}`);
      return;
    }

    // 3. Validate itemId (if provided)
    if (itemId !== undefined && typeof itemId !== 'string') {
      logger.error('[Analytics] Invalid itemId');
      return;
    }

    // ===== VALIDATION END =====

    this.track({
      name: 'purchase',
      properties: {
        amount: parseFloat(amount.toFixed(2)),
        currency: currency.toUpperCase(),
        item_id: itemId || '',
      },
    });
  }

  isConfigured(): boolean {
    const hasGA = Boolean(this.googleAnalyticsId) && !this.googleAnalyticsId.includes('your-');
    const hasMixpanel = Boolean(this.mixpanelToken) && !this.mixpanelToken.includes('your-');
    // Enabled only if at least one provider is fully configured
    return hasGA || hasMixpanel;
  }
}

export const analyticsService = new AnalyticsService();
