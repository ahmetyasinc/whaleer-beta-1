// src/screens/Profile/ProfileScreen.js
import React, { useContext, useMemo } from "react";
import {
  View, Text, ActivityIndicator, StyleSheet, SafeAreaView,
  ScrollView, RefreshControl
} from "react-native";
import AuthGate from "../../components/auth/AuthGate";
import { SettingsContext } from "../../context/SettingsContext";
import { getTheme } from "../../theme";
import Header from "../../components/Layout/Header";
import useProfile from "../../hooks/useProfile";
import ApiSwitcher from "../../components/profile/ApiSwitcher";
import SegmentTabs from "../../components/profile/SegmentTabs";
import PerformanceChart from "../../components/profile/PerformanceChart";
import PortfolioList from "../../components/profile/PortfolioList";
import TransactionsList from "../../components/profile/TransactionsList";
import ProfileStats from "../../components/profile/ProfileStats";

export default function ProfileScreen() {
  const { theme } = useContext(SettingsContext);
  const colors = useMemo(() => getTheme(theme), [theme]);

  const {
    data, loading, error,
    selectedApiId, setSelectedApiId,
    perfSummary, activeTab, setActiveTab,
    refreshing, refresh
  } = useProfile();

  const stats = useMemo(() => {
    const strategies = Array.isArray(data?.strategies) ? data.strategies.length : 0;
    const indicators = Array.isArray(data?.indicators) ? data.indicators.length : 0;
    const bots = Array.isArray(data?.apis)
      ? data.apis.reduce((sum, a) => sum + (Array.isArray(a?.bots) ? a.bots.length : 0), 0)
      : 0;
    return { strategies, indicators, bots };
  }, [data]);

  const selectedApi = data?.apis?.find((a) => a.api.id === selectedApiId);

  return (
    <AuthGate>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Header />
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={colors.muted}              // iOS spinner rengi
            colors={[colors.primary]}             // Android spinner rengi
            progressBackgroundColor={colors.surface}
          />
        }
      >
        <ProfileStats
          strategies={stats.strategies}
          indicators={stats.indicators}
          bots={stats.bots}
          colors={colors}
          style={{ marginTop: 12 }}
        />

        {/* API Switcher */}
        <ApiSwitcher
          apis={data?.apis}
          selectedId={selectedApiId}
          onSelect={setSelectedApiId}
          colors={colors}
        />

        {/* Tabs */}
        <SegmentTabs active={activeTab} onChange={setActiveTab} colors={colors} />

        {/* Content */}
        {loading && <ActivityIndicator style={{ marginTop: 24 }} color={colors.primary} />}
        {error && <Text style={{ color: colors.danger, marginTop: 12 }}>{error}</Text>}

        {!loading && selectedApi && (
          <>
            {activeTab === "performance" && (
              <PerformanceChart
                snapshots={selectedApi.snapshots}
                perfSummary={perfSummary}
                colors={colors}
              />
            )}

            {activeTab === "portfolio" && (
              <PortfolioList portfolio={selectedApi.portfolio} colors={colors} />
            )}

            {activeTab === "transactions" && (
              <TransactionsList trades={selectedApi.trades} colors={colors} />
            )}
          </>
        )}
      </ScrollView>
      </SafeAreaView>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  userBadge: {
    marginTop: 8, padding: 12, borderRadius: 12,
    flexDirection: "row", justifyContent: "space-between"
  },
});
