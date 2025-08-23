// src/components/ui/Button/styles.js
import { StyleSheet } from "react-native";

export const createButtonStyles = (colors) =>
  StyleSheet.create({
    base: {
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
    },
    fullWidth: { alignSelf: "stretch" },

    sizes: {
      sm: { height: 40, paddingHorizontal: 14 },
      md: { height: 48, paddingHorizontal: 16 },
      lg: { height: 56, paddingHorizontal: 20 },
    },

    variants: {
      primary: {
        backgroundColor: colors.primary,
      },
      secondary: {
        backgroundColor: colors.secondary, // light: #F5F5F5, dark: #1E1E1E
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
      },
      ghost: {
        backgroundColor: "transparent",
      },
    },

    pressed: {
      opacity: 0.9,
      transform: [{ scale: 0.995 }],
    },

    disabled: {
      opacity: 0.6,
    },

    textBase: {
      fontSize: 16,
      fontWeight: "600",
    },

    content: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    iconLeft: { marginRight: 6 },
    iconRight: { marginLeft: 6 },

    spinner: {
      paddingHorizontal: 8,
    },
  });
