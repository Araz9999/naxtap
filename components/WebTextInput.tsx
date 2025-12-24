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
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const valueRef = useRef(value);

  // Update ref when value prop changes (for clearing)
  useEffect(() => {
    if (value === '' && valueRef.current !== '') {
      // Clear input
      if (inputRef.current) {
        inputRef.current.value = '';
        valueRef.current = '';
      }
    } else if (value !== valueRef.current && inputRef.current) {
      // Only update if different (for initial value)
      inputRef.current.value = value;
      valueRef.current = value;
    }
  }, [value]);

  // Create input element
  useEffect(() => {
    if (Platform.OS !== 'web' || !containerRef.current) return;

    // Clear container
    if (containerRef.current.firstChild) {
      containerRef.current.removeChild(containerRef.current.firstChild);
    }

    // Create native HTML input
    const input = multiline 
      ? document.createElement('textarea')
      : document.createElement('input');
    
    input.type = multiline ? undefined : 'text';
    input.placeholder = placeholder || '';
    input.value = valueRef.current;
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('spellcheck', 'false');
    
    if (maxLength) {
      input.maxLength = maxLength;
    }

    // Apply styles
    const inputStyle = {
      width: '100%',
      height: multiline ? 'auto' : '44px',
      padding: '10px 16px',
      borderRadius: '20px',
      borderWidth: '1px',
      borderStyle: 'solid',
      fontSize: '16px',
      outline: 'none',
      boxSizing: 'border-box' as const,
      borderColor: '#e5e7eb',
      backgroundColor: '#ffffff',
      color: '#111827',
      fontFamily: 'inherit',
      resize: multiline ? ('vertical' as const) : ('none' as const),
      minHeight: multiline ? '80px' : '44px',
      ...(style?.borderColor && { borderColor: style.borderColor }),
      ...(style?.backgroundColor && { backgroundColor: style.backgroundColor }),
      ...(style?.color && { color: style.color }),
    };

    Object.assign(input.style, inputStyle);

    // Handle input - update ref but defer React state update
    const handleInput = () => {
      const newValue = input.value;
      valueRef.current = newValue;
      
      // Call onChangeText in next tick to avoid React error #185
      if (onChangeText) {
        requestAnimationFrame(() => {
          onChangeText(newValue);
        });
      }
    };

    input.addEventListener('input', handleInput);

    // Handle Enter key
    if (!multiline) {
      input.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (onSubmitEditing) {
            requestAnimationFrame(() => {
              onSubmitEditing();
            });
          }
        }
      });
    }

    // Handle focus
    if (autoFocus) {
      setTimeout(() => {
        input.focus();
      }, 100);
    }

    // Append to container
    containerRef.current.appendChild(input);
    inputRef.current = input;

    // Cleanup
    return () => {
      input.removeEventListener('input', handleInput);
      if (containerRef.current && input.parentNode === containerRef.current) {
        containerRef.current.removeChild(input);
      }
    };
  }, [placeholder, multiline, maxLength, autoFocus, onChangeText, onSubmitEditing, style]);

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
        valueRef.current = '';
      }
    },
    getValue: () => {
      return valueRef.current;
    },
  }));

  if (Platform.OS !== 'web') {
    // Fallback to regular View on native
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

