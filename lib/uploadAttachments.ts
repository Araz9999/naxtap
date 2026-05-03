import { Platform } from 'react-native';
import { getBaseUrl } from '@/lib/trpc';

export type UploadableAttachment = {
  uri: string;
  name: string;
  mimeType?: string;
};

export async function uploadAttachments(
  attachments: UploadableAttachment[],
  accessToken?: string,
  timeoutMs: number = 120_000,
): Promise<string[]> {
  if (!attachments.length) return [];

  const formData = new FormData();

  if (Platform.OS === 'web') {
    for (const att of attachments) {
      const response = await fetch(att.uri);
      const blob = await response.blob();
      formData.append('files', blob, att.name);
    }
  } else {
    attachments.forEach((att) => {
      // @ts-ignore react-native file form payload
      formData.append('files', {
        uri: att.uri,
        name: att.name,
        type: att.mimeType || 'application/octet-stream',
      });
    });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const uploadResponse = await fetch(`${getBaseUrl()}/api/upload`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
      headers: {
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
    });

    if (!uploadResponse.ok) {
      throw new Error(`Attachment upload failed: ${uploadResponse.status}`);
    }

    const uploaded = await uploadResponse.json();
    return Array.isArray(uploaded?.urls) ? uploaded.urls : [];
  } finally {
    clearTimeout(timeoutId);
  }
}

