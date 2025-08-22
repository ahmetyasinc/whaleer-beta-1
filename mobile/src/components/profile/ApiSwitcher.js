// src/components/profile/ApiSwitcher.js
import React, { useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Animated,
  Easing,
  ScrollView,
  Modal,
  findNodeHandle,
} from "react-native";

export default function ApiSwitcher({ apis, selectedId, onSelect, colors }) {
  if (!apis?.length) return null;

  const selected = useMemo(
    () => apis.find((a) => a.api.id === selectedId)?.api,
    [apis, selectedId]
  );

  const [open, setOpen] = useState(false);
  const [triggerLayout, setTriggerLayout] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const triggerRef = useRef(null);

  const scale = useRef(new Animated.Value(0)).current;
  const isDark = colors?.mode === "dark";

  const animateIn = () => {
    Animated.timing(scale, {
      toValue: 1,
      duration: 160,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };
  const animateOut = (cb) => {
    Animated.timing(scale, {
      toValue: 0,
      duration: 140,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => finished && cb?.());
  };

  const openMenu = () => {
    if (!triggerRef.current) return;
    const node = findNodeHandle(triggerRef.current);
    if (!node) return;

    triggerRef.current.measureInWindow((x, y, w, h) => {
      setTriggerLayout({ x, y, w, h });
      setOpen(true);
      requestAnimationFrame(animateIn);
    });
  };

  const closeMenu = () => animateOut(() => setOpen(false));
  const toggle = () => (open ? closeMenu() : openMenu());

  const handleSelect = (id) => {
    if (id !== selectedId) onSelect(id);
    closeMenu();
  };

  const Chevron = ({ expanded }) => (
    <Text style={[styles.chev, { color: colors.textSecondary }]}>{expanded ? "▴" : "▾"}</Text>
  );

  const Dot = ({ label }) => (
    <View style={[styles.dot, { backgroundColor: isDark ? colors.primary : colors.primary }]}>
      <Text style={[styles.dotText, { color: colors.textPrimary }]}>
        {label?.trim()?.[0]?.toUpperCase() || "A"}
      </Text>
    </View>
  );

  return (
    <View style={{ marginTop: 8 }}>
      {/* Tetikleyici */}
      <TouchableOpacity
        ref={triggerRef}
        activeOpacity={0.8}
        onPress={toggle}
        style={[
          styles.trigger,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={styles.triggerLeft}>
          <Dot label={selected?.api_name} />
          <Text numberOfLines={1} style={[styles.triggerText, { color: colors.textPrimary, maxWidth: "82%" }]}>
            {selected?.api_name}
          </Text>
        </View>
        <Chevron expanded={open} />
      </TouchableOpacity>

      {/* Üstte görünen menü (arka görünür kalsın diye şeffaf backdrop; menü OPak) */}
      <Modal visible={open} transparent animationType="none" onRequestClose={closeMenu} statusBarTranslucent>
        <Pressable style={[styles.backdrop, { backgroundColor: "transparent" }]} onPress={closeMenu} />

        <Animated.View pointerEvents="box-none" style={[styles.modalLayer, { left: 0, top: 0, right: 0, bottom: 0 }]}>
          <Animated.View
            style={[
              styles.menu,
              {
                position: "absolute",
                left: Math.max(12, triggerLayout.x),
                top: triggerLayout.y + triggerLayout.h + 4,
                width: Math.max(triggerLayout.w, 220),
                // Menü opak ve temaya uygun
                backgroundColor: colors.card,     // dark: koyu, light: açık (theme’den geliyor)
                borderColor: colors.border,
                transform: [{ scale: scale.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] }) }],
              },
            ]}
          >
            <ScrollView bounces={false} style={{ maxHeight: 300 }}>
              {apis.map(({ api }) => {
                const isActive = api.id === selectedId;
                return (
                  <TouchableOpacity
                    key={api.id}
                    onPress={() => handleSelect(api.id)}
                    activeOpacity={0.9}
                    style={[
                      styles.item,
                      // Aktif arka planı opak, temaya göre (secondary opak geliyor)
                      { backgroundColor: isActive ? colors.secondary : "transparent" },
                    ]}
                  >
                    <Dot label={api.api_name} />
                    <View style={{ flex: 1 }}>
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.itemTitle,
                          { color: isActive ? colors.textPrimary : colors.textPrimary },
                        ]}
                      >
                        {api.api_name}
                      </Text>
                    </View>
                    {isActive && (
                      <View style={[styles.activeBadge, { backgroundColor: "transparent" }]}>
                        <Text style={[styles.activeBadgeText, { color: colors.textPrimary }]}>Seçili</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Animated.View>
        </Animated.View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  triggerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  triggerText: { fontSize: 16, fontWeight: "600" },
  chev: { fontSize: 16, marginLeft: 8 },

  modalLayer: { position: "absolute", zIndex: 9999 },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },

  menu: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 6,
    // Gölge yok
    shadowColor: "transparent",
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    zIndex: 1000,
  },
  item: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  itemTitle: { fontSize: 15, fontWeight: "600" },
  dot: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  dotText: { fontSize: 14, fontWeight: "700" },
  activeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  activeBadgeText: { fontSize: 12, fontWeight: "700" },
});
