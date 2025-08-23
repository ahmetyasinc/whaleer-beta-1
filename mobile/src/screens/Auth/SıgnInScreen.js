// src/screens/Welcome/SignInScreen.js (sadece hata bildirimi eklendi)
import React, { useContext, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from "react-native";
import AppLayout from "../../components/Layout/AppLayout";
import { Button } from "../../components/ui/Button";
import { SettingsContext } from "../../context/SettingsContext";
import { getTheme } from "../../theme";
import { useAuth } from "../../hooks/useAuth";

export default function SignInScreen({ navigation }) {
  const { theme } = useContext(SettingsContext);
  const colors = useMemo(() => getTheme(theme), [theme]);
  const { signIn } = useAuth();

  const [username, setUsername] = useState(__DEV__ ? (typeof DEV_USERNAME !== "undefined" ? DEV_USERNAME : "") : "");
  const [password, setPassword] = useState(__DEV__ ? (typeof DEV_PASSWORD !== "undefined" ? DEV_PASSWORD : "") : "");
  const [loading, setLoading] = useState(false);

  // ⬇️ HATA MESAJI
  const [errorMsg, setErrorMsg] = useState(null);

  const onSubmit = async () => {
    // basit alan doğrulaması
    if (!username || !password) {
      setErrorMsg("Username ve password gerekli.");
      return;
    }
    setLoading(true);
    setErrorMsg(null); // önceki hatayı temizle
    try {
      await signIn(username, password);
      navigation.replace("Profile");
    } catch (e) {
      // useAuth içinden gelecek farklı hata şekillerini karşıla
      const apiMsg = "Login failed. Please check your information.";
      setErrorMsg(apiMsg);
    } finally {
      setLoading(false);
    }
  };

  const goSignUp = () => navigation.navigate("SignUp");

  return (
    <AppLayout>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          {/* Başlık */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Sign In</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>to continue to Whaleer</Text>
          </View>

          {/* Kart */}
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border || "#00000020" },
            ]}
          >
            {/* Google ile giriş (pasif) */}
            <TouchableOpacity
              activeOpacity={0.7}
              style={[
                styles.googleBtn,
                { borderColor: colors.border || "#00000020", backgroundColor: colors.background },
              ]}
              disabled
            >
              <Text style={[styles.googleText, { color: colors.textPrimary }]}>
                Continue with Google (soon)
              </Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={[styles.divider, { backgroundColor: colors.border || "#00000020" }]} />
              <Text style={[styles.dividerText, { color: colors.textSecondary }]}>or</Text>
              <View style={[styles.divider, { backgroundColor: colors.border || "#00000020" }]} />
            </View>

            {/* ⬇️ HATA BANDI */}
            {errorMsg ? (
              <View
                accessibilityRole="alert"
                style={[
                  styles.errorBox,
                  {
                    backgroundColor: colors.dangerBg || "#FFEBEB",
                    borderColor: colors.dangerBorder || "#FFB4B4",
                  },
                ]}
              >
                <Text style={[styles.errorText, { color: colors.dangerText || "#B00020" }]}>{errorMsg}</Text>
              </View>
            ) : null}

            {/* Form */}
            <View style={styles.form}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Username</Text>
              <TextInput
                value={username}
                onChangeText={setUsername}
                keyboardType="default"
                autoCapitalize="none"
                placeholder="example"
                placeholderTextColor={colors.textTertiary || "#999"}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    color: colors.textPrimary,
                    borderColor: colors.border || "#00000020",
                  },
                ]}
                returnKeyType="next"
              />

              <View style={{ height: 12 }} />

              <Text style={[styles.label, { color: colors.textSecondary }]}>Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="•••••••••••"
                placeholderTextColor={colors.textTertiary || "#d4d4d4ff"}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    color: colors.textPrimary,
                    borderColor: colors.border || "#00000020",
                  },
                ]}
                returnKeyType="done"
                onSubmitEditing={onSubmit}
              />

              <TouchableOpacity onPress={() => {}} accessibilityRole="button" accessibilityLabel="Forgot password" style={styles.forgotRow}>
                <Text style={[styles.forgotText, { color: colors.primary }]}>Forgot password?</Text>
              </TouchableOpacity>

              <View style={{ height: 8 }} />

              <Button
                title={loading ? "Signing in..." : "Sign In"}
                variant="primary"
                size="lg"
                onPress={onSubmit}
                disabled={loading}
                accessibilityLabel="Sign in to your account"
              />
            </View>
          </View>

          {/* Alt kısım */}
          <View style={styles.footerRow}>
            <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Don’t have an account?</Text>
            <TouchableOpacity onPress={goSignUp} style={{ paddingHorizontal: 6 }}>
              <Text style={{ color: colors.primary, fontSize: 14, fontWeight: "700" }}>Create one</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: "space-between" },
  header: { marginTop: 8 },
  title: { fontSize: 28, fontWeight: "800" },
  subtitle: { fontSize: 14, marginTop: 4 },

  card: { borderWidth: 1, borderRadius: 16, padding: 16 },

  googleBtn: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    opacity: 0.7,
  },
  googleText: { fontSize: 15, fontWeight: "600" },

  dividerRow: { flexDirection: "row", alignItems: "center", marginVertical: 6 },
  divider: { height: 1, flex: 1, opacity: 0.6 },
  dividerText: { marginHorizontal: 10, fontSize: 12 },

  // ⬇️ Hata kutusu stili
  errorBox: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 8,
    marginBottom: 6,
  },
  errorText: { fontSize: 13, fontWeight: "600" },

  form: { marginTop: 10 },
  label: { fontSize: 13, marginBottom: 8, fontWeight: "600" },
  input: { height: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12 },
  forgotRow: { alignSelf: "flex-end", paddingVertical: 10 },
  forgotText: { fontSize: 13, fontWeight: "700" },

  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    gap: 4,
  },
});
