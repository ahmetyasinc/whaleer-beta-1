// src/components/ui/Button/Button.js
import React, { useMemo } from "react";
import { Pressable, Text, ActivityIndicator, View } from "react-native";
import { useContext } from "react";
import { SettingsContext } from "../../../context/SettingsContext";
import { getTheme } from "../../../theme";
import { createButtonStyles } from "./styles";

export default function Button({
  title,
  onPress,
  variant = "primary",       // "primary" | "secondary" | "ghost"
  size = "md",               // "sm" | "md" | "lg"
  loading = false,
  disabled = false,
  fullWidth = true,
  LeftIcon,                  // optional: () => <Svg .../> or <Text>🔑</Text>
  RightIcon,                 // optional
  testID,
  style,
  textStyle,
  androidRipple = { borderless: false },
  ...rest
}) {
  const { theme } = useContext(SettingsContext);
  const colors = getTheme(theme);
  const styles = useMemo(() => createButtonStyles(colors), [colors]);

  const isDisabled = disabled || loading;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      onPress={isDisabled ? undefined : onPress}
      android_ripple={
        variant === "ghost"
          ? null
          : { color: colors.ripple || "#00000020", ...androidRipple }
      }
      style={({ pressed }) => [
        styles.base,
        fullWidth && styles.fullWidth,
        styles.sizes[size],
        styles.variants[variant],
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
      {...rest}
    >
      {({ pressed }) => (
        <>
          {loading ? (
            <ActivityIndicator
              size="small"
              color={
                variant === "secondary"
                  ? colors.textPrimary
                  : colors.buttonTextPrimary
              }
              style={styles.spinner}
            />
          ) : (
            <View style={styles.content}>
              {LeftIcon ? <View style={styles.iconLeft}>{LeftIcon}</View> : null}
              <Text
                style={[
                  styles.textBase,
                  variant === "primary" && { color: colors.buttonTextPrimary },
                  variant === "secondary" && { color: colors.buttonTextSecondary },
                  variant === "ghost" && { color: colors.textPrimary },
                  textStyle,
                ]}
                numberOfLines={1}
              >
                {title}
              </Text>
              {RightIcon ? <View style={styles.iconRight}>{RightIcon}</View> : null}
            </View>
          )}
        </>
      )}
    </Pressable>
  );
}
