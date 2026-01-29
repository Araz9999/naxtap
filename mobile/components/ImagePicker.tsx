import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Platform, Alert } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import Colors from '@/constants/colors';
import { useMessageStore } from '@/store/messageStore';
import { useUserStore } from '@/store/userStore';
import { useLanguageStore } from '@/store/languageStore';
import { MessageAttachment } from '@/types/message';
import { logger } from '@/utils/logger';

type ImagePickerProps = {
  conversationId: string;
  onClose: () => void;
};

export default function ImagePickerComponent({ conversationId, onClose }: ImagePickerProps) {
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { addMessage } = useMessageStore();
  const { currentUser } = useUserStore();
  const { language } = useLanguageStore();

  const pickImages = async () => {
    try {
      setIsLoading(true);

      // ✅ Request permissions with proper error handling
      if (Platform.OS !== 'web') {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permissionResult.granted) {
          Alert.alert(
            language === 'az' ? 'İcazə lazımdır' : 'Требуется разрешение',
            language === 'az' ? 'Qalereya daxil olmaq üçün icazə lazımdır' : 'Для доступа к галерее требуется разрешение',
          );
          return;
        }
      }

      // ✅ Reduced quality for better performance
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        allowsEditing: false,
      });

      // ✅ Validate assets and file sizes
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const maxImages = 10;
        const maxFileSize = 10 * 1024 * 1024; // 10MB per image
        const currentCount = selectedImages.length;

        if (currentCount >= maxImages) {
          Alert.alert(
            language === 'az' ? 'Limit aşıldı' : 'Лимит превышен',
            language === 'az'
              ? `Maksimum ${maxImages} şəkil əlavə edə bilərsiniz`
              : `Можно добавить максимум ${maxImages} изображений`,
          );
          return;
        }

        // ✅ Validate each image size
        const validAssets = [];
        for (const asset of result.assets) {
          if (asset.fileSize && asset.fileSize > maxFileSize) {
            Alert.alert(
              language === 'az' ? 'Şəkil çox böyükdür' : 'Изображение слишком большое',
              language === 'az'
                ? `${asset.fileName || 'Şəkil'} çox böyükdür (max 10MB)`
                : `${asset.fileName || 'Изображение'} слишком большое (макс 10MB)`,
            );
            continue;
          }
          validAssets.push(asset);
        }

        if (validAssets.length === 0) {
          return;
        }

        const availableSlots = maxImages - currentCount;
        const imageUris = validAssets.slice(0, availableSlots).map(asset => asset.uri);
        setSelectedImages(prev => [...prev, ...imageUris]);

        logger.info(`Added ${imageUris.length} images`);
      }
    } catch (error) {
      logger.error('Error picking images:', error);
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Şəkil seçilə bilmədi' : 'Не удалось выбрать изображение',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const sendImages = () => {
    // ✅ Validation
    if (selectedImages.length === 0) {
      Alert.alert(
        language === 'az' ? 'Xəbərdarlıq' : 'Предупреждение',
        language === 'az' ? 'Ən azı bir şəkil seçin' : 'Выберите хотя бы одно изображение',
      );
      return;
    }

    // ✅ Validate current user
    if (!currentUser) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'İstifadəçi məlumatı tapılmadı' : 'Информация о пользователе не найдена',
      );
      return;
    }

    try {
      selectedImages.forEach((uri, index) => {
        // ✅ Unique ID generation
        const uniqueId = `${Date.now()}_${index}_${Math.random().toString(36).substring(2, 11)}`;

        const attachment: MessageAttachment = {
          id: uniqueId,
          type: 'image',
          uri: uri,
          name: `image_${Date.now()}_${index + 1}.jpg`,
          size: 0, // File size not available from URI only
          mimeType: 'image/jpeg',
        };

        const message = {
          id: uniqueId,
          senderId: currentUser.id,
          receiverId: 'unknown', // Will be set by conversation context
          listingId: '1',
          text: '',
          type: 'image' as const,
          attachments: [attachment],
          createdAt: new Date().toISOString(),
          isRead: false,
          isDelivered: true,
        };

        addMessage(conversationId, message);
      });

      logger.info(`Sent ${selectedImages.length} images`);
      setSelectedImages([]);
      onClose();
    } catch (error) {
      logger.error('Error sending images:', error);
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Şəkillər göndərilə bilmədi' : 'Не удалось отправить изображения',
      );
    }
  };

  const renderItem = ({ item, index }: { item: string; index: number }) => (
    <View style={styles.imageContainer}>
      <Image
        source={{ uri: item }}
        style={styles.selectedImage}
        cachePolicy="memory-disk"
        transition={200}
        contentFit="cover"
      />
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => setSelectedImages(prev => prev.filter(uri => uri !== item))}
      >
        <Text style={styles.removeButtonText}>×</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {language === 'az' ? 'Şəkil seçin' : 'Выберите изображения'}
      </Text>
      <TouchableOpacity
        style={[styles.pickButton, isLoading && styles.disabledButton]}
        onPress={pickImages}
        disabled={isLoading}
      >
        <Text style={styles.pickButtonText}>
          {isLoading
            ? (language === 'az' ? 'Yüklənir...' : 'Загрузка...')
            : (language === 'az' ? 'Qalereyadan şəkil seç' : 'Выбрать из галереи')
          }
        </Text>
      </TouchableOpacity>
      {selectedImages.length > 0 && (
        <>
          <FlatList
            data={selectedImages}
            renderItem={renderItem}
            keyExtractor={(item, index) => `${item}_${index}`}
            horizontal
            style={styles.imageList}
          />
          <TouchableOpacity style={styles.sendButton} onPress={sendImages}>
            <Text style={styles.sendButtonText}>
              {language === 'az'
                ? `Şəkilləri göndər (${selectedImages.length})`
                : `Отправить изображения (${selectedImages.length})`
              }
            </Text>
          </TouchableOpacity>
        </>
      )}
      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Text style={styles.closeButtonText}>
          {language === 'az' ? 'Bağla' : 'Закрыть'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    maxHeight: '50%',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  pickButton: {
    backgroundColor: Colors.primary,
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 15,
  },
  pickButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  imageList: {
    marginBottom: 15,
    maxHeight: 100,
  },
  imageContainer: {
    position: 'relative',
    marginRight: 10,
  },
  selectedImage: {
    width: 100,
    height: 100,
    borderRadius: 5,
  },
  removeButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: 'red',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  sendButton: {
    backgroundColor: Colors.success,
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10,
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.textSecondary,
  },
  closeButtonText: {
    color: Colors.textSecondary,
  },
  disabledButton: {
    backgroundColor: Colors.textSecondary,
    opacity: 0.6,
  },
});
