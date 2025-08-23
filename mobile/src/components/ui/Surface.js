// src/components/ui/Surface.js
import React, { useContext } from 'react';
import { View, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { SettingsContext } from '../../context/SettingsContext';
import { getTheme } from '../../theme';

export default function Surface({ style, intensity = 25, tint, children }) {
  const { theme } = useContext(SettingsContext);
  const colors = getTheme(theme);

  // Tint verilmediyse tema adına göre belirle
  const computedTint = tint ?? (theme === 'dark' ? 'dark' : 'light');

  return (
    <View style={[styles.wrapper, style]}>
      <BlurView intensity={intensity} tint={computedTint} style={StyleSheet.absoluteFill} />
      {/* Yarı saydam overlay + ince sınır */}
      <View
        pointerEvents="none"
        style={[
          styles.overlay,
          {
            backgroundColor: 'rgba(255,255,255,0.04)',
            borderColor: 'rgba(255,255,255,0.12)',
          },
        ]}
      />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'hidden',
    borderRadius: 16,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
  },
  content: { position: 'relative' },
});
