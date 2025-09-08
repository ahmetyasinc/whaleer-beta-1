// src/screens/Showcase/ShowcaseScreen.js
import React, {
  useContext,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import {
  View,
  Text,
  SafeAreaView,
  StyleSheet,
  ActivityIndicator,
  Animated,
  RefreshControl,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useIsFocused, useNavigation, useRoute } from "@react-navigation/native";

import { SettingsContext } from "../../context/SettingsContext";
import { getTheme } from "../../theme";
import AuthGate from "../../components/auth/AuthGate";
import Header from "../../components/Layout/Header";
import BotFullCard from "../../components/showcase/BotFullCard";
import useShowcaseStore from "../../store/showcase/showcaseStore";

export default function ShowcaseScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const isFocused = useIsFocused();

  const { theme } = useContext(SettingsContext);
  const colors = useMemo(() => getTheme(theme), [theme]);

  const insets = useSafeAreaInsets();
  const { height: winH } = useWindowDimensions();

  // Footer (58) + bottom inset; Header + üst bar tahmini
  const FOOTER_H = 108 + insets.bottom;
  const HEADER_BAR_GUESS = 72;

  // Dikey sayfa yüksekliği
  const PAGE_H = useMemo(
    () => Math.max(720, winH - FOOTER_H),
    [winH, FOOTER_H]
  );
  const CARD_H = useMemo(
    () => Math.min(500, PAGE_H - HEADER_BAR_GUESS),//normalde max ama ben min yaptım ..Ahmet
    [PAGE_H]
  );

  // Küçük alanlarda kart kompakt
  const COMPACT = CARD_H < 560;

  const {
    items,
    loading,
    error,
    refreshing,
    firstLoad,
    refresh,
    loadMore,
    followBot,
    applyFilters,
  } = useShowcaseStore();

  // ilk girişte veri çek
  useEffect(() => {
    if (isFocused && items.length === 0 && !loading) firstLoad();
  }, [isFocused]);

  // filtre ekranından dönüşte uygula
  useEffect(() => {
    const next = route?.params?.filters;
    if (next) applyFilters(next);
  }, [route?.params?.filters]);

  const scrollY = useRef(new Animated.Value(0)).current;

  // Sadece tam sayfa kaydırma bittiğinde index hesapla -> son karta geldiyse loadMore
  const currentIndexRef = useRef(0);
  const onMomentumScrollEnd = useCallback(
    (e) => {
      const y = e?.nativeEvent?.contentOffset?.y || 0;
      const idx = Math.round(y / PAGE_H);
      currentIndexRef.current = idx;

      // SON karta gelindiyse (tam olarak)
      if (idx === items.length - 1) {
        loadMore();
      }
    },
    [items.length, PAGE_H, loadMore]
  );

  const renderItem = useCallback(
    ({ item }) => (
      <View style={{ height: PAGE_H, justifyContent: "center" }}>
        <BotFullCard
          item={item}
          colors={colors}
          height={CARD_H}
          compact={COMPACT}
          onPress={() =>
            navigation.navigate("BotDetail", { botId: item?.bot?.bot_id })
          }
          onFollow={() => followBot(item?.bot?.bot_id)}
        />
      </View>
    ),
    [colors, PAGE_H, CARD_H, COMPACT]
  );

  // Benzersiz key (store normalize ediyor)
  const keyExtractor = useCallback((it, idx) => String(it?._key || idx), []);

  // Performans için sabit layout
  const getItemLayout = useCallback(
    (_, index) => {
      const length = PAGE_H;
      const offset = length * index;
      return { length, offset, index };
    },
    [PAGE_H]
  );

  return (
    <AuthGate>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <Header />

        {/* Üst bar */}
        <View style={[styles.top, { borderColor: colors.border }]}>
          <Text style={[styles.topTitle, { color: colors.text }]}>Showcase</Text>
          <TouchableOpacity
            onPress={() =>
              navigation.navigate("ShowcaseFilters", { current: null })
            }
            style={[
              styles.filterBtn,
              { borderColor: colors.border, backgroundColor: colors.surface },
            ]}
            activeOpacity={0.85}
          >
            <Text style={{ color: colors.text, fontWeight: "600" }}>
              Filters
            </Text>
          </TouchableOpacity>
        </View>

        {/* Dikey pager */}
        <Animated.FlatList
          data={items}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          pagingEnabled
          decelerationRate={Platform.OS === "ios" ? "fast" : 0.98}
          snapToAlignment="start"
          snapToInterval={PAGE_H}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          // ÖNEMLİ: sadece momentumScrollEnd'de, son karta geldiğinde loadMore
          onMomentumScrollEnd={onMomentumScrollEnd}
          // footer ile çakışmayı önlemek için alttan boşluk
          contentContainerStyle={{ paddingBottom: FOOTER_H }}
          ListFooterComponent={
            loading ? (
              <ActivityIndicator
                style={{ marginVertical: 12 }}
                color={colors.primary}
              />
            ) : null
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={colors.muted}
              colors={[colors.primary]}
              progressBackgroundColor={colors.surface}
            />
          }
          // viewability tabanlı tetikleyiciyi BİLEREK kullanmıyoruz
          // çünkü pagingEnabled ile birden fazla kez çağrılabiliyor
        />

        {error ? (
          <View
            style={{
              position: "absolute",
              bottom: FOOTER_H + 8,
              left: 16,
              right: 16,
              alignItems: "center",
            }}
          >
            <Text style={{ color: colors.danger }}>{error}</Text>
          </View>
        ) : null}
      </SafeAreaView>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  top: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topTitle: { fontSize: 20, fontWeight: "800" },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
});
