import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Platform,
  Alert,
} from 'react-native';
import { Image } from 'expo-image'; // BUG FIX: Use expo-image for better performance
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useThemeStore } from '@/store/themeStore';
import { useLanguageStore } from '@/store/languageStore';
import { getColors } from '@/constants/colors';
import { logger } from '@/utils/logger';
import {
  FileText,
  X,
  Plus,
} from 'lucide-react-native';


export interface FileAttachment {
  id: string;
  uri: string;
  name: string;
  type: 'image' | 'document';
  size?: number;
  mimeType?: string;
}

type FileAttachmentPickerProps = {
  attachments: FileAttachment[];
  onAttachmentsChange: (attachments: FileAttachment[]) => void;
  maxFiles?: number;
};

export default function FileAttachmentPicker({
  attachments,
  onAttachmentsChange,
  maxFiles = 5,
}: FileAttachmentPickerProps) {
  const { themeMode, colorTheme } = useThemeStore();
  const { language } = useLanguageStore();
  const colors = getColors(themeMode, colorTheme);

  const pickImage = async () => {
    try {
      // BUG FIX: Check file limit
      if (attachments.length >= maxFiles) {
        Alert.alert(
          language === 'az' ? 'Limit aşıldı' : 'Превышен лимит',
          language === 'az'
            ? `Maksimum ${maxFiles} fayl əlavə edə bilərsiniz`
            : `Можно добавить максимум ${maxFiles} файлов`,
        );
        return;
      }

      // BUG FIX: Request permissions with error handling
      if (Platform.OS !== 'web') {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permissionResult.granted) {
          Alert.alert(
            language === 'az' ? 'İcazə tələb olunur' : 'Требуется разрешение',
            language === 'az'
              ? 'Qalereya giriş icazəsi tələb olunur'
              : 'Требуется разрешение на доступ к галерее',
          );
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        allowsEditing: false,
      });

      // BUG FIX: Validate result and check file sizes
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const maxFileSize = 10 * 1024 * 1024; // 10MB limit
        const validAssets = result.assets.filter(asset => {
          if (asset.fileSize && asset.fileSize > maxFileSize) {
            Alert.alert(
              language === 'az' ? 'Xəta' : 'Ошибка',
              language === 'az'
                ? `${asset.fileName || 'Fayl'} çox böyükdür (max 10MB)`
                : `${asset.fileName || 'Файл'} слишком большой (макс 10MB)`,
            );
            return false;
          }
          return true;
        });

        const newAttachments = validAssets.slice(0, maxFiles - attachments.length).map((asset, index) => ({
          id: `${Date.now()}-${index}-${Math.random().toString(36).substring(2, 11)}`,
          uri: asset.uri,
          name: asset.fileName || `image_${Date.now()}.jpg`,
          type: 'image' as const,
          size: asset.fileSize,
          mimeType: asset.mimeType || 'image/jpeg',
        }));

        onAttachmentsChange([...attachments, ...newAttachments]);
      }
    } catch (error) {
      // BUG FIX: Comprehensive error handling
      logger.error('Error picking image:', error);
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Şəkil seçilə bilmədi' : 'Не удалось выбрать изображение',
      );
    }
  };

  const takePhoto = async () => {
    try {
      // BUG FIX: Check platform support for camera
      if (Platform.OS === 'web') {
        Alert.alert(
          language === 'az' ? 'Dəstəklənmir' : 'Не поддерживается',
          language === 'az'
            ? 'Kamera web versiyasında dəstəklənmir'
            : 'Камера не поддерживается в веб-версии',
        );
        return;
      }

      // BUG FIX: Check file limit
      if (attachments.length >= maxFiles) {
        Alert.alert(
          language === 'az' ? 'Limit aşıldı' : 'Превышен лимит',
          language === 'az'
            ? `Maksimum ${maxFiles} fayl əlavə edə bilərsiniz`
            : `Можно добавить максимум ${maxFiles} файлов`,
        );
        return;
      }

      // BUG FIX: Request camera permissions with proper error handling
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          language === 'az' ? 'İcazə tələb olunur' : 'Требуется разрешение',
          language === 'az'
            ? 'Kamera icazəsi tələb olunur'
            : 'Требуется разрешение на использование камеры',
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
        aspect: [4, 3],
      });

      // BUG FIX: Validate result and file size
      if (!result.canceled && result.assets && result.assets.length > 0 && result.assets[0]) {
        const asset = result.assets[0];

        // BUG FIX: Check file size
        const maxFileSize = 10 * 1024 * 1024; // 10MB
        if (asset.fileSize && asset.fileSize > maxFileSize) {
          Alert.alert(
            language === 'az' ? 'Xəta' : 'Ошибка',
            language === 'az'
              ? 'Foto çox böyükdür (max 10MB)'
              : 'Фото слишком большое (макс 10MB)',
          );
          return;
        }

        const newAttachment: FileAttachment = {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
          uri: asset.uri,
          name: asset.fileName || `photo_${Date.now()}.jpg`,
          type: 'image',
          size: asset.fileSize,
          mimeType: asset.mimeType || 'image/jpeg',
        };

        onAttachmentsChange([...attachments, newAttachment]);
      }
    } catch (error) {
      // BUG FIX: Comprehensive error handling
      logger.error('Error taking photo:', error);
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Foto çəkilə bilmədi' : 'Не удалось сделать фото',
      );
    }
  };

  const pickDocument = async () => {
    try {
      // BUG FIX: Check file limit
      if (attachments.length >= maxFiles) {
        Alert.alert(
          language === 'az' ? 'Limit aşıldı' : 'Превышен лимит',
          language === 'az'
            ? `Maksimum ${maxFiles} fayl əlavə edə bilərsiniz`
            : `Можно добавить максимум ${maxFiles} файлов`,
        );
        return;
      }

      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'text/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        multiple: true,
        copyToCacheDirectory: true,
      });

      // BUG FIX: Validate result and check file sizes
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const maxFileSize = 20 * 1024 * 1024; // 20MB limit for documents
        const validAssets = result.assets.filter(asset => {
          if (asset.size && asset.size > maxFileSize) {
            Alert.alert(
              language === 'az' ? 'Xəta' : 'Ошибка',
              language === 'az'
                ? `${asset.name} çox böyükdür (max 20MB)`
                : `${asset.name} слишком большой (макс 20MB)`,
            );
            return false;
          }
          return true;
        });

        if (validAssets.length === 0) {
          return;
        }

        const newAttachments = validAssets.slice(0, maxFiles - attachments.length).map((asset, index) => ({
          id: `${Date.now()}-${index}-${Math.random().toString(36).substring(2, 11)}`,
          uri: asset.uri,
          name: asset.name,
          type: 'document' as const,
          size: asset.size,
          mimeType: asset.mimeType,
        }));

        onAttachmentsChange([...attachments, ...newAttachments]);
      }
    } catch (error) {
      // BUG FIX: Better error handling
      logger.error('Document picker error:', error);
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Sənəd seçilə bilmədi' : 'Не удалось выбрать документ',
      );
    }
  };

  const removeAttachment = (id: string) => {
    onAttachmentsChange(attachments.filter(attachment => attachment.id !== id));
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
  };

  const renderAttachment = ({ item }: { item: FileAttachment }) => (
    <View style={[styles.attachmentItem, { backgroundColor: colors.card }]}>
      <View style={styles.attachmentContent}>
        {item.type === 'image' ? (
          <Image
            source={{ uri: item.uri }}
            style={styles.attachmentImage}
            // BUG FIX: Add caching and performance optimizations
            cachePolicy="memory-disk"
            transition={200}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.documentIcon, { backgroundColor: `${colors.primary}15` }]}>
            <FileText size={24} color={colors.primary} />
          </View>
        )}
        <View style={styles.attachmentInfo}>
          <Text style={[styles.attachmentName, { color: colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          {item.size && (
            <Text style={[styles.attachmentSize, { color: colors.textSecondary }]}>
              {formatFileSize(item.size)}
            </Text>
          )}
        </View>
      </View>
      <TouchableOpacity
        style={[styles.removeButton, { backgroundColor: colors.error }]}
        onPress={() => removeAttachment(item.id)}
      >
        <X size={16} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  const showAttachmentOptions = () => {
    Alert.alert(
      language === 'az' ? 'Fayl əlavə et' : 'Добавить файл',
      language === 'az' ? 'Fayl növünü seçin' : 'Выберите тип файла',
      [
        {
          text: language === 'az' ? 'Foto çək' : 'Сделать фото',
          onPress: takePhoto,
        },
        {
          text: language === 'az' ? 'Qalereya' : 'Галерея',
          onPress: pickImage,
        },
        {
          text: language === 'az' ? 'Sənəd' : 'Документ',
          onPress: pickDocument,
        },
        {
          text: language === 'az' ? 'Ləğv et' : 'Отмена',
          style: 'cancel',
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          {language === 'az' ? 'Fayllar' : 'Файлы'}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {language === 'az'
            ? `${attachments.length}/${maxFiles} fayl`
            : `${attachments.length}/${maxFiles} файлов`
          }
        </Text>
      </View>

      {attachments.length > 0 && (
        <FlatList
          data={attachments}
          renderItem={renderAttachment}
          keyExtractor={(item) => item.id}
          style={styles.attachmentsList}
          showsVerticalScrollIndicator={false}
        />
      )}

      {attachments.length < maxFiles && (
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={showAttachmentOptions}
        >
          <Plus size={20} color={colors.primary} />
          <Text style={[styles.addButtonText, { color: colors.primary }]}>
            {language === 'az' ? 'Fayl əlavə et' : 'Добавить файл'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 14,
  },
  attachmentsList: {
    maxHeight: 200,
    marginBottom: 12,
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  attachmentContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  attachmentImage: {
    width: 40,
    height: 40,
    borderRadius: 6,
    marginRight: 12,
  },
  documentIcon: {
    width: 40,
    height: 40,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  attachmentInfo: {
    flex: 1,
  },
  attachmentName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  attachmentSize: {
    fontSize: 12,
  },
  removeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
});
