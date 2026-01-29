import config from '@/constants/config';
import { Platform } from 'react-native';

import { logger } from '@/utils/logger';
export interface UploadResult {
  url: string;
  key: string;
  size: number;
  type: string;
}

export interface UploadOptions {
  folder?: string;
  maxSize?: number; // in bytes
  allowedTypes?: string[];
  generateThumbnail?: boolean;
}

class StorageService {
  private awsAccessKey: string;
  private awsSecretKey: string;
  private awsRegion: string;
  private bucketName: string;

  constructor() {
    this.awsAccessKey = config.AWS_ACCESS_KEY_ID as string;
    this.awsSecretKey = config.AWS_SECRET_ACCESS_KEY as string;
    this.awsRegion = config.AWS_REGION as string;
    this.bucketName = config.AWS_BUCKET_NAME as string;
  }

  async uploadFile(
    file: File | { uri: string; name: string; type: string },
    options: UploadOptions = {},
  ): Promise<UploadResult> {
    const {
      folder = 'uploads',
      maxSize = 10 * 1024 * 1024, // 10MB default
      allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4'],
    } = options;

    // Validate file size. On native, attempt to use provided size when available
    const fileSize = Platform.OS === 'web'
      ? (file as File).size
      : (typeof (file as { uri: string; name: string; type: string; size?: number }).size === 'number' ? (file as { uri: string; name: string; type: string; size?: number }).size : 0);
    if (fileSize && fileSize > maxSize) {
      throw new Error(`File size exceeds maximum allowed size of ${maxSize} bytes`);
    }

    // Validate file type
    const fileType = Platform.OS === 'web'
      ? (file as File).type
      : ((file as { uri: string; name: string; type: string }).type || 'application/octet-stream');
    if (!allowedTypes.includes(fileType)) {
      throw new Error(`File type ${fileType} is not allowed`);
    }

    try {
      const formData = new FormData();
      const fileName = this.generateFileName(
        Platform.OS === 'web' ? (file as File).name : (file as { uri: string; name: string; type: string }).name,
      );
      const key = `${folder}/${fileName}`;

      if (Platform.OS === 'web') {
        formData.append('file', file as File);
      } else {
        // Ensure name and type are passed for React Native uploads
        const nativeFile = file as { uri: string; name: string; type: string };
        formData.append('file', {
          uri: nativeFile.uri,
          name: nativeFile.name || this.generateFileName('upload.bin'),
          type: nativeFile.type || 'application/octet-stream',
        } as any);
      }

      formData.append('key', key);
      formData.append('bucket', this.bucketName);

      const response = await fetch(`${config.BASE_URL}/storage/upload`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `AWS4-HMAC-SHA256 Credential=${this.awsAccessKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();

      return {
        url: result.url,
        key: result.key,
        size: fileSize || 0,
        type: fileType,
      };
    } catch (error) {
      logger.error('File upload failed:', error);
      throw error;
    }
  }

  async uploadMultipleFiles(
    files: (File | { uri: string; name: string; type: string })[],
    options: UploadOptions = {},
  ): Promise<UploadResult[]> {
    const uploadPromises = files.map(file => this.uploadFile(file, options));
    return Promise.all(uploadPromises);
  }

  async deleteFile(key: string): Promise<boolean> {
    try {
      const response = await fetch(`${config.BASE_URL}/storage/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `AWS4-HMAC-SHA256 Credential=${this.awsAccessKey}`,
        },
        body: JSON.stringify({
          key,
          bucket: this.bucketName,
        }),
      });

      return response.ok;
    } catch (error) {
      logger.error('File deletion failed:', error);
      return false;
    }
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string | null> {
    try {
      const response = await fetch(`${config.BASE_URL}/storage/signed-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `AWS4-HMAC-SHA256 Credential=${this.awsAccessKey}`,
        },
        body: JSON.stringify({
          key,
          bucket: this.bucketName,
          expiresIn,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get signed URL');
      }

      const result = await response.json();
      return result.url;
    } catch (error) {
      logger.error('Failed to get signed URL:', error);
      return null;
    }
  }

  async listFiles(folder: string = '', limit: number = 100): Promise<string[]> {
    try {
      const response = await fetch(`${config.BASE_URL}/storage/list`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `AWS4-HMAC-SHA256 Credential=${this.awsAccessKey}`,
        },
        body: JSON.stringify({
          folder,
          bucket: this.bucketName,
          limit,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to list files');
      }

      const result = await response.json();
      return result.files || [];
    } catch (error) {
      logger.error('Failed to list files:', error);
      return [];
    }
  }

  private generateFileName(originalName: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    const extension = originalName.split('.').pop();
    return `${timestamp}_${random}.${extension}`;
  }

  getPublicUrl(key: string): string {
    return `https://${this.bucketName}.s3.${this.awsRegion}.amazonaws.com/${key}`;
  }

  isConfigured(): boolean {
    return (
      !this.awsAccessKey.includes('your-') &&
      !this.awsSecretKey.includes('your-') &&
      !this.awsRegion.includes('your-') &&
      !this.bucketName.includes('your-')
    );
  }
}

export const storageService = new StorageService();
