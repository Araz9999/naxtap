import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, Alert, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import Colors from '@/constants/colors';
import { useTranslation } from '@/constants/translations';
import { useUserStore } from '@/store/userStore';
import { trpc } from '@/lib/trpc';
import { logger } from '@/utils/logger';

export default function EditProfileScreen() {
  const router = useRouter();
  const { t, language } = useTranslation();
  const { currentUser, isAuthenticated, updateUserProfile } = useUserStore();

  const updateMeMutation = trpc.user.updateMe.useMutation();

  const [name, setName] = React.useState(currentUser?.name || '');
  const [phone, setPhone] = React.useState(currentUser?.phone || '');
  const [avatar, setAvatar] = React.useState(currentUser?.avatar || '');
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    // Keep form in sync if user changes
    setName(currentUser?.name || '');
    setPhone(currentUser?.phone || '');
    setAvatar(currentUser?.avatar || '');
  }, [currentUser?.name, currentUser?.phone, currentUser?.avatar]);

  const applyAvatar = async (uri: string) => {
    setAvatar(uri);
  };

  const pickFromGallery = async () => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(t('permissionRequired'), t('galleryPermissionRequired'));
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        await applyAvatar(result.assets[0].uri);
      }
    } catch (error) {
      logger.error('[EditProfile] pickFromGallery error:', error);
      Alert.alert(t('error'), language === 'az' ? 'Şəkil seçilə bilmədi' : 'Не удалось выбрать изображение');
    }
  };

  const takePhoto = async () => {
    try {
      if (Platform.OS === 'web') {
        Alert.alert(t('error'), language === 'az' ? 'Kamera veb versiyada dəstəklənmir' : 'Камера не поддерживается в веб-версии');
        return;
      }

      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('permissionRequired'), t('cameraPermissionRequired'));
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        await applyAvatar(result.assets[0].uri);
      }
    } catch (error) {
      logger.error('[EditProfile] takePhoto error:', error);
      Alert.alert(t('error'), language === 'az' ? 'Kamera açıla bilmədi' : 'Не удалось открыть камеру');
    }
  };

  const changePhoto = () => {
    Alert.alert(t('profilePhoto'), t('howToAddPhoto'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('camera'), onPress: () => takePhoto() },
      { text: t('gallery'), onPress: () => pickFromGallery() },
    ]);
  };

  const onSave = async () => {
    if (!currentUser) return;

    setIsSaving(true);
    try {
      // Always update locally first (store persists to AsyncStorage)
      updateUserProfile({
        name,
        phone,
        avatar,
      });

      // Best-effort backend sync (requires auth_tokens)
      await updateMeMutation.mutateAsync({
        name,
        phone,
        avatar,
      });

      Alert.alert(
        t('success'),
        language === 'az' ? 'Profil yeniləndi' : 'Профиль обновлён',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      logger.error('[EditProfile] Save failed:', error);
      Alert.alert(
        t('error'),
        error?.message || (language === 'az' ? 'Profil yenilənmədi' : 'Не удалось обновить профиль')
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>{t('loginToAccessProfile')}</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/auth/login')}>
          <Text style={styles.primaryButtonText}>{t('login')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.screenTitle}>{language === 'az' ? 'Profili redaktə et' : 'Редактировать профиль'}</Text>

      <View style={styles.avatarBlock}>
        <TouchableOpacity onPress={changePhoto} activeOpacity={0.8}>
          <Image
            source={{ uri: avatar || 'https://placehold.co/100x100?text=Avatar' }}
            style={styles.avatar}
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={changePhoto} style={styles.linkButton}>
          <Text style={styles.linkText}>{language === 'az' ? 'Profil şəklini dəyiş' : 'Сменить фото'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>{language === 'az' ? 'Ad' : 'Имя'}</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          style={styles.input}
          placeholder={language === 'az' ? 'Adınız' : 'Ваше имя'}
          placeholderTextColor={Colors.textSecondary}
          autoCapitalize="words"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>{t('phone')}</Text>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          style={styles.input}
          placeholder="+994 XX XXX XX XX"
          placeholderTextColor={Colors.textSecondary}
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>{t('email')}</Text>
        <TextInput
          value={currentUser?.email || ''}
          editable={false}
          style={[styles.input, styles.inputDisabled]}
          placeholderTextColor={Colors.textSecondary}
        />
        <Text style={styles.helperText}>
          {language === 'az'
            ? 'Email dəyişdirmə hazırda deaktivdir'
            : 'Изменение email сейчас недоступно'}
        </Text>
      </View>

      <TouchableOpacity style={[styles.primaryButton, isSaving && styles.primaryButtonDisabled]} onPress={onSave} disabled={isSaving}>
        {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>{t('save')}</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={() => router.back()} disabled={isSaving}>
        <Text style={styles.secondaryButtonText}>{t('cancel')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
  },
  avatarBlock: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.border,
  },
  linkButton: {
    marginTop: 10,
  },
  linkText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  field: {
    marginBottom: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.text,
  },
  inputDisabled: {
    opacity: 0.7,
  },
  helperText: {
    marginTop: 6,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  primaryButton: {
    marginTop: 8,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  secondaryButton: {
    marginTop: 10,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  secondaryButtonText: {
    color: Colors.text,
    fontWeight: '600',
    fontSize: 16,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: Colors.background,
  },
  title: {
    color: Colors.text,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
});

