import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { View, StyleSheet, Platform } from 'react-native';

interface WebTextInputProps {
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  onSubmitEditing?: () => void;
  style?: any;
  placeholderTextColor?: string;
  maxLength?: number;
  multiline?: boolean;
  autoFocus?: boolean;
}

export interface WebTextInputRef {
  focus: () => void;
  blur: () => void;
  clear: () => void;
  getValue: () => string;
}

const WebTextInput = forwardRef<WebTextInputRef, WebTextInputProps>(({
  placeholder,
  value = '',
  onChangeText,
  onSubmitEditing,
  style,
  placeholderTextColor = '#999',
  maxLength,
  multiline = false,
  autoFocus = false,
}, ref) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const isUserTypingRef = useRef(false);
  const lastValueRef = useRef(value);
  const onChangeTextRef = useRef(onChangeText);
  const onSubmitEditingRef = useRef(onSubmitEditing);

  // Keep refs updated
  useEffect(() => {
    onChangeTextRef.current = onChangeText;
    onSubmitEditingRef.current = onSubmitEditing;
  }, [onChangeText, onSubmitEditing]);

  // Create input element ONCE and keep it stable
  useEffect(() => {
    if (Platform.OS !== 'web' || !containerRef.current) return;

    // Only create if it doesn't exist
    if (inputRef.current) return;

    const input = multiline
      ? document.createElement('textarea')
      : document.createElement('input');

    if (!multiline) {
      (input as HTMLInputElement).type = 'text';
    }

    input.placeholder = placeholder || '';
    input.value = value;
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('spellcheck', 'false');

    if (maxLength) {
      input.maxLength = maxLength;
    }

    // Apply styles
    const inputStyle: Partial<CSSStyleDeclaration> = {
      width: '100%',
      height: multiline ? 'auto' : '44px',
      padding: '10px 16px',
      borderRadius: '20px',
      borderWidth: '1px',
      borderStyle: 'solid',
      fontSize: '16px',
      outline: 'none',
      boxSizing: 'border-box',
      borderColor: style?.borderColor || '#e5e7eb',
      backgroundColor: style?.backgroundColor || '#ffffff',
      color: style?.color || '#111827',
      fontFamily: 'inherit',
      resize: multiline ? 'vertical' : 'none',
      minHeight: multiline ? '80px' : '44px',
    };

    Object.assign(input.style, inputStyle);

    // Handle input events - update React state
    const handleInput = () => {
      const newValue = input.value;
      isUserTypingRef.current = true;
      lastValueRef.current = newValue;
      
      // Reset typing flag after a short delay
      setTimeout(() => {
        isUserTypingRef.current = false;
      }, 100);
      
      if (onChangeTextRef.current) {
        // Use requestAnimationFrame for better performance
        requestAnimationFrame(() => {
          if (onChangeTextRef.current) {
            onChangeTextRef.current(newValue);
          }
        });
      }
    };

    input.addEventListener('input', handleInput);

    // Handle focus/blur to track user interaction
    const handleFocus = () => {
      isUserTypingRef.current = true;
    };

    const handleBlur = () => {
      isUserTypingRef.current = false;
    };

    input.addEventListener('focus', handleFocus);
    input.addEventListener('blur', handleBlur);

    // Handle Enter key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !multiline) {
        e.preventDefault();
        if (onSubmitEditingRef.current) {
          requestAnimationFrame(() => {
            if (onSubmitEditingRef.current) {
              onSubmitEditingRef.current();
            }
          });
        }
      }
    };

    if (!multiline) {
      input.addEventListener('keydown', handleKeyDown as unknown as EventListener);
    }

    // Auto focus
    if (autoFocus) {
      setTimeout(() => {
        input.focus();
      }, 100);
    }

    // Append to container
    containerRef.current.appendChild(input);
    inputRef.current = input;

    // Cleanup on unmount only
    return () => {
      input.removeEventListener('input', handleInput);
      input.removeEventListener('focus', handleFocus);
      input.removeEventListener('blur', handleBlur);
      if (!multiline) {
        input.removeEventListener('keydown', handleKeyDown as unknown as EventListener);
      }
      if (containerRef.current && input.parentNode === containerRef.current) {
        containerRef.current.removeChild(input);
      }
      inputRef.current = null;
    };
  }, []); // Empty deps - create once only

  // Sync value prop to input (only when not user-typing)
  useEffect(() => {
    if (!inputRef.current) return;
    
    // Check if input is focused
    const isFocused = document.activeElement === inputRef.current;
    
    // Only update if value prop changed externally and user is not typing
    if (value !== lastValueRef.current) {
      // If value is empty, always clear (for reset after send)
      if (value === '') {
        inputRef.current.value = '';
        lastValueRef.current = '';
        isUserTypingRef.current = false;
      } else if (!isFocused && !isUserTypingRef.current) {
        // Only update if input is not focused and user is not actively typing
        inputRef.current.value = value;
        lastValueRef.current = value;
      }
    }
  }, [value]);

  // Update placeholder when it changes
  useEffect(() => {
    if (inputRef.current && placeholder !== undefined) {
      inputRef.current.placeholder = placeholder;
    }
  }, [placeholder]);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    focus: () => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    },
    blur: () => {
      if (inputRef.current) {
        inputRef.current.blur();
      }
    },
    clear: () => {
      if (inputRef.current) {
        inputRef.current.value = '';
        lastValueRef.current = '';
        isUserTypingRef.current = false;
        if (onChangeTextRef.current) {
          onChangeTextRef.current('');
        }
      }
    },
    getValue: () => {
      return inputRef.current?.value || '';
    },
  }));

  if (Platform.OS !== 'web') {
    return <View style={style} />;
  }

  return (
    <View
      ref={containerRef as any}
      style={[styles.container, style]}
      collapsable={false}
      pointerEvents="box-none"
    />
  );
});

WebTextInput.displayName = 'WebTextInput';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 44,
  },
});

export default WebTextInput;
