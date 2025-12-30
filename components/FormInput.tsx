import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  TextInputProps,
} from 'react-native';
import { LucideIcon, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react-native';
import Colors from '@/constants/colors';

interface FormInputProps extends TextInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  success?: boolean;
  helperText?: string;
  icon?: LucideIcon;
  required?: boolean;
  type?: 'text' | 'email' | 'password' | 'number' | 'phone';
}

/**
 * Form Input Component with validation feedback
 * Includes proper accessibility and visual feedback
 */
export const FormInput: React.FC<FormInputProps> = ({
  label,
  value,
  onChangeText,
  error,
  success,
  helperText,
  icon: Icon,
  required = false,
  type = 'text',
  ...textInputProps
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const hasError = !!error;
  const isPassword = type === 'password';

  const getKeyboardType = () => {
    switch (type) {
      case 'email':
        return 'email-address';
      case 'number':
        return 'numeric';
      case 'phone':
        return 'phone-pad';
      default:
        return 'default';
    }
  };

  const containerStyle = [
    styles.container,
    isFocused && styles.containerFocused,
    hasError && styles.containerError,
    success && styles.containerSuccess,
  ];

  return (
    <View style={styles.wrapper}>
      {/* Label */}
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>

      {/* Input Container */}
      <View style={containerStyle}>
        {/* Left Icon */}
        {Icon && (
          <Icon
            size={20}
            color={hasError ? Colors.error : isFocused ? Colors.primary : Colors.textSecondary}
            style={styles.leftIcon}
          />
        )}

        {/* Text Input */}
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholderTextColor={Colors.placeholder}
          secureTextEntry={isPassword && !showPassword}
          keyboardType={getKeyboardType()}
          autoCapitalize={type === 'email' ? 'none' : 'sentences'}
          accessible={true}
          accessibilityLabel={label}
          accessibilityHint={helperText}
          accessibilityState={{ disabled: textInputProps.editable === false }}
          {...textInputProps}
        />

        {/* Right Icon - Password Toggle or Status */}
        {isPassword && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.rightIcon}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Şifrəni gizlət' : 'Şifrəni göstər'}
          >
            {showPassword ? (
              <EyeOff size={20} color={Colors.textSecondary} />
            ) : (
              <Eye size={20} color={Colors.textSecondary} />
            )}
          </TouchableOpacity>
        )}

        {!isPassword && hasError && (
          <AlertCircle size={20} color={Colors.error} style={styles.rightIcon} />
        )}

        {!isPassword && success && (
          <CheckCircle size={20} color={Colors.success} style={styles.rightIcon} />
        )}
      </View>

      {/* Error Message */}
      {hasError && (
        <View style={styles.feedbackContainer}>
          <AlertCircle size={14} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Helper Text */}
      {!hasError && helperText && (
        <Text style={styles.helperText}>{helperText}</Text>
      )}

      {/* Success Message */}
      {success && !hasError && (
        <View style={styles.feedbackContainer}>
          <CheckCircle size={14} color={Colors.success} />
          <Text style={styles.successText}>Düzgündür</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  required: {
    color: Colors.error,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    minHeight: 52, // Good touch target
  },
  containerFocused: {
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  containerError: {
    borderColor: Colors.error,
  },
  containerSuccess: {
    borderColor: Colors.success,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    paddingVertical: 12,
  },
  leftIcon: {
    marginRight: 12,
  },
  rightIcon: {
    marginLeft: 12,
  },
  feedbackContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  errorText: {
    fontSize: 13,
    color: Colors.error,
    flex: 1,
  },
  successText: {
    fontSize: 13,
    color: Colors.success,
  },
  helperText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 6,
  },
});

export default FormInput;
