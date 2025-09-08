// src/screens/Settings/SettingsScreen.js
import React, { useContext, useMemo, useCallback } from "react";
import {
  View, Text, StyleSheet, Switch, ScrollView,
  TouchableOpacity, Alert
} from "react-native";
import Header from "../../components/Layout/Header";
import { SettingsContext } from "../../context/SettingsContext";
import { getTheme } from "../../theme";
import useSettingsStore from "../../store/settings/settingsStore";
import useAuthStore from "../../store/auth/authStore";
import { useSafeAreaInsets } from "react-native-safe-area-context"; // <<— eklendi

function Section({ title, children, colors }) {
  return (
    <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.sectionTitle, { color: colors.muted }]}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Row({ label, value, onChange, colors, description }) {
  return (
    <View style={[styles.row, { borderColor: colors.border }]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
        {description ? <Text style={[styles.desc, { color: colors.muted }]}>{description}</Text> : null}
      </View>
      <Switch value={!!value} onValueChange={onChange} />
    </View>
  );
}

export default function SettingsScreen() {
  const { theme, changeTheme } = useContext(SettingsContext);
  const colors = useMemo(() => getTheme(theme), [theme]);
  const isDark = theme === "dark";

  const {
    notificationsEnabled, tradeAlerts, marketingEmails, analyticsEnabled,
    setNotificationsEnabled, setTradeAlerts, setMarketingEmails, setAnalyticsEnabled,
    requestNotificationPermission
  } = useSettingsStore();

  const signOut = useAuthStore(s => s.signOut);

  const insets = useSafeAreaInsets();                 // <<— eklendi
  const FOOTER_HEIGHT = 64;                            // kendi footer yüksekliğiniz (tab bar ise ~56–64)
  const EXTRA_SPACE = 24;                              // footer’dan biraz daha yukarıda dursun diye

  const toggleNotifications = useCallback(async (next) => {
    if (next) {
      const ok = await requestNotificationPermission();
      if (!ok) {
        Alert.alert("Permission required", "Notifications permission was not granted.");
        return;
      }
    }
    setNotificationsEnabled(next);
  }, [requestNotificationPermission, setNotificationsEnabled]);

  const confirmSignOut = useCallback(() => {
    Alert.alert("Sign out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          try { await signOut(); } catch { Alert.alert("Error", "Problem occured while log outing."); }
        },
      },
    ]);
  }, [signOut]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Header />
      <ScrollView
        style={{ flex: 1 }}                             // <<— önemli
        contentInsetAdjustmentBehavior="automatic"      // iOS için status/tab bar uyumu
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + FOOTER_HEIGHT + EXTRA_SPACE } // <<— en kritik kısım
        ]}
        showsVerticalScrollIndicator
      >
        {/* Appearance */}
        <Section title="Appearance" colors={colors}>
          <Row
            label="Dark Mode"
            value={isDark}
            onChange={() => changeTheme(isDark ? "light" : "dark")}
            colors={colors}
            description="Switch between light and dark theme."
          />
        </Section>

        {/* Notifications */}
        <Section title="Notifications" colors={colors}>
          <Row
            label="Enable Notifications"
            value={notificationsEnabled}
            onChange={toggleNotifications}
            colors={colors}
            description="Allow Whaleer to send you notifications."
          />
          <Row
            label="Trade Alerts"
            value={tradeAlerts}
            onChange={(v) => setTradeAlerts(v)}
            colors={colors}
            description="Signals, fills and P/L alerts."
          />
          <Row
            label="Marketing Emails"
            value={marketingEmails}
            onChange={(v) => setMarketingEmails(v)}
            colors={colors}
            description="Product updates, tips and offers."
          />
        </Section>

        {/* Privacy & Data */}
        <Section title="Privacy & Data" colors={colors}>
          <Row
            label="Analytics"
            value={analyticsEnabled}
            onChange={(v) => setAnalyticsEnabled(v)}
            colors={colors}
            description="Help us improve by sending anonymous usage data."
          />
        </Section>

        {/* About */}
        <Section title="About" colors={colors}>
          <View style={[styles.row, { borderColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: colors.text }]}>App Version</Text>
              <Text style={[styles.desc, { color: colors.muted }]}>Whaleer Mobile • 0.1.0</Text>
            </View>
            <TouchableOpacity onPress={() => Alert.alert("Terms", "Coming soon…")}>
              <Text style={{ color: colors.primary, fontWeight: "600" }}>Terms</Text>
            </TouchableOpacity>
          </View>
        </Section>

        {/* Account */}
        <Section title="Account" colors={colors}>
          <TouchableOpacity
            onPress={confirmSignOut}
            style={[styles.signOutBtn, { backgroundColor: colors.danger }]}
          >
            <Text style={styles.signOutText}>Sign out</Text>
          </TouchableOpacity>
        </Section>

        {/* (Opsiyonel) Alt boşluk için görsel spacer — footer varsa faydalı */}
        <View style={{ height: FOOTER_HEIGHT }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, gap: 16 },
  section: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 12,
  },
  sectionTitle: {
    fontSize: 12, fontWeight: "700", marginBottom: 8,
    textTransform: "uppercase", letterSpacing: 0.6
  },
  sectionBody: { gap: 8 },
  row: {
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  label: { fontSize: 16, fontWeight: "600" },
  desc: { marginTop: 4, fontSize: 12 },
  signOutBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  signOutText: {
    color: "#fff", fontWeight: "700", fontSize: 16,
  },
});
