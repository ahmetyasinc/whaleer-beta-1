// src/screens/Welcome/WelcomeScreen.js
import React, { useContext, useEffect, useMemo } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";
import AppLayout from "../../components/Layout/AppLayout";
import { Button } from "../../components/ui/Button";
import { Logo } from "../../components/ui/Logo";
import { SettingsContext } from "../../context/SettingsContext";
import { getTheme } from "../../theme";
import { useEntranceAnim } from "../../hooks/useEntranceAnim";

// ⬇️ Oturum bilgisini buradan okuyacağız
import useAuthStore from "../../store/auth/authStore";   // path: src/store/auth/authStore.js

export default function WelcomeScreen({ navigation }) {
  const { theme } = useContext(SettingsContext);
  const colors = useMemo(() => getTheme(theme), [theme]);

  // auth state
  const isAuthed = useAuthStore((s) => s.isAuthed);
  const hydrated = useAuthStore((s) => s.hydrated);        // boot tamamlandı mı (flicker önlemek için)
  const signOut = useAuthStore((s) => s.signOut);

  // Giriş animasyonları
  const { titleOpacity, titleTranslate, buttonsOpacity, buttonsTranslate } = useEntranceAnim();

  useEffect(() => {
    console.log("WelcomeScreen mounted. Auth hydrated:", hydrated, "isAuthed:", isAuthed);
    Animated.sequence([
      Animated.parallel([
        Animated.timing(titleOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.timing(titleTranslate, { toValue: 0, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.delay(80),
      Animated.parallel([
        Animated.timing(buttonsOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(buttonsTranslate, { toValue: 0, friction: 7, tension: 70, useNativeDriver: true }),
      ]),
    ]).start();
  }, [titleOpacity, titleTranslate, buttonsOpacity, buttonsTranslate]);

  const handleLogout = async () => {
    try {
      await signOut();
      // Auth stack’e dön (stack yapına göre “SignIn” veya root’a resetleyebilirsin)
      navigation?.reset?.({ index: 0, routes: [{ name: "SignIn" }] });
    } catch {}
  };

  return (
    <AppLayout>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Logo */}
        <View style={styles.logoBox}>
          <Logo size={250} theme={theme} />
        </View>

        {/* Metinler */}
        <Animated.View style={[styles.top, { opacity: titleOpacity, transform: [{ translateY: titleTranslate }] }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Welcome to Whaleer</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Build, share and explore trading bots.
          </Text>
        </Animated.View>

        {/* Butonlar */}
        <Animated.View style={[styles.bottom, { opacity: buttonsOpacity, transform: [{ translateY: buttonsTranslate }] }]}>
          {/* hydrated false iken (boot sırasında) butonları göstermeyerek flicker'ı önlüyoruz */}
          {hydrated && (
            <>
              {!isAuthed ? (
                <>
                  <Button
                    title="Sign In"
                    variant="primary"
                    size="lg"
                    onPress={() => navigation?.navigate?.("SignIn")}
                  />
                  <View style={{ height: 16 }} />
                  <Button
                    title="Create Account"
                    variant="secondary"
                    size="lg"
                    onPress={() => navigation?.navigate?.("SignUp")}
                  />
                </>
              ) : (
                <>
                  <Button
                    title="My Profile"
                    variant="primary"
                    size="lg"
                    onPress={() => navigation?.navigate?.("Profile")}
                  />
                  <View style={{ height: 16 }} />
                  <Button
                    title="Log Out"
                    variant="secondary"
                    size="lg"
                    onPress={handleLogout}
                  />
                </>
              )}
            </>
          )}
        </Animated.View>
      </View>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: "space-between" },
  logoBox: { alignItems: "center", marginTop: 24 },
  top: { alignItems: "center", marginTop: 12, paddingHorizontal: 12 },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 8, textAlign: "center" },
  subtitle: { fontSize: 16, textAlign: "center", lineHeight: 22 },
  bottom: { marginBottom: 40 },
});
