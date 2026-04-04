import React from 'react';
import { TouchableOpacity, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface JumpToTodayButtonProps {
  onPress: () => void;
  visible: boolean;
}

export function JumpToTodayButton({ onPress, visible }: JumpToTodayButtonProps) {
  const { colors } = useTheme();

  if (!visible) {
    return null;
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        backgroundColor: colors.primary + '10', // 10% opacity
        borderWidth: 1,
        borderColor: colors.primary,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
      }}
      accessibilityRole="button"
      accessibilityLabel="Jump to today's date"
      accessibilityHint="Navigates calendar to current month and highlights today"
    >
      <Ionicons 
        name="today" 
        size={16} 
        color={colors.primary} 
        style={{ marginRight: 6 }}
      />
      <Text style={{
        fontSize: 12,
        fontWeight: '600',
        color: colors.primary,
      }}>
        Today
      </Text>
    </TouchableOpacity>
  );
}