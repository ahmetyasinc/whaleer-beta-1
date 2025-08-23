import React, { useContext, useMemo, useState } from "react";
import { View, Text, StyleSheet, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import AppLayout from "../../components/Layout/AppLayout";
import { Button } from "../../components/ui/Button";
import { SettingsContext } from "../../context/SettingsContext";
import { getTheme } from "../../theme";

export default function SignUpScreen({ navigation }) {
  const { theme } = useContext(SettingsContext);
  const colors = useMemo(() => getTheme(theme), [theme]);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!name || !username || !password) return;
    setLoading(true);
    try {
      // TODO: API bağla (örn. POST /api/auth/register)
      // await api.register({ name, username, password })
      // navigation.replace("SignIn") // veya otomatik login
    } catch (e) {
      // TODO: hata göster
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <View style={styles.container}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Create Account</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Start building bots on Whaleer
          </Text>

          <View style={styles.form}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Jane Doe"
              placeholderTextColor={colors.textTertiary || "#999"}
              style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border || "#00000020" }]}
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>Username</Text>
            <TextInput
              value={username}
              onChangeText={setUsername}
              keyboardType="username-address"
              autoCapitalize="none"
              placeholder="you@example.com"
              placeholderTextColor={colors.textTertiary || "#999"}
              style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border || "#00000020" }]}
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor={colors.textTertiary || "#999"}
              style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border || "#00000020" }]}
            />

            <Button
              title={loading ? "Creating..." : "Create Account"}
              variant="primary"
              size="lg"
              onPress={onSubmit}
              disabled={loading || !name || !username || !password}
              accessibilityLabel="Create your Whaleer account"
            />

            <View style={{ height: 16 }} />

            <Button
              title="I already have an account"
              variant="ghost"
              onPress={() => navigation.navigate("SignIn")}
              accessibilityLabel="Go to sign in"
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: "flex-start" },
  title: { fontSize: 28, fontWeight: "700", marginTop: 8 },
  subtitle: { fontSize: 14, marginTop: 4 },
  form: { marginTop: 24, gap: 8 },
  label: { fontSize: 13 },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
});
