export interface USSDSession {
  id: string;
  code: string;
  startedAt: string;
  isActive: boolean;
  history: USSDMessage[];
  currentMenuPath: string[];
  lastActivity: string;
}

export interface USSDMessage {
  id: string;
  type: 'request' | 'response';
  text: string;
  timestamp: string;
  menuId?: string;
}

export interface USSDMenuItem {
  id: string;
  option: string;
  label: {
    az: string;
    ru: string;
    en: string;
  };
  type: 'menu' | 'action' | 'input';
  children?: USSDMenuItem[];
  action?: (input?: string) => Promise<string>;
}

export interface USSDMenu {
  id: string;
  title: {
    az: string;
    ru: string;
    en: string;
  };
  items: USSDMenuItem[];
  parentId?: string;
}

export interface USSDResponse {
  text: string;
  isEnd: boolean;
  menuId?: string;
  requiresInput?: boolean;
}
