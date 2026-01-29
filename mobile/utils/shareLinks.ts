import * as ExpoLinking from 'expo-linking';
import { API_CONFIG } from '@/constants/config';

function stripTrailingSlashes(url: string): string {
  return url.replace(/\/+$/, '');
}

export function getWebBaseUrl(): string {
  const base = (API_CONFIG.FRONTEND_URL || 'https://naxtap.az').trim();
  return stripTrailingSlashes(base);
}

export function getWebUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getWebBaseUrl()}${normalizedPath}`;
}

export function getListingWebUrl(listingId: string): string {
  return getWebUrl(`/listing/${encodeURIComponent(listingId)}`);
}

export function getProfileWebUrl(userId: string): string {
  return getWebUrl(`/profile/${encodeURIComponent(userId)}`);
}

export function getDeepLinkUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return ExpoLinking.createURL(normalizedPath);
}

export function getProfileDeepLink(userId: string): string {
  return getDeepLinkUrl(`/profile/${encodeURIComponent(userId)}`);
}

