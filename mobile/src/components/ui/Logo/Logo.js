import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, Image, StyleSheet, View } from "react-native";

export default function Logo({ size = 96, theme = "light", style }) {
  // Tema'ya uygun kaynağı seç
  const source = useMemo(
    () =>
      theme === "dark"
        ? require("../../../styles/logo/logo_dark.png")
        : require("../../../styles/logo/logo_light.png"),
    [theme]
  );

  // İlk açılış animasyonu: fade + scale + hafif yukarı hareket
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;
  const translateY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 7,
        tension: 70,
        useNativeDriver: true,
      }),
    ]).start();
    // not: sadece mount'ta çalışsın; theme değişince döndürmeyelim
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={[styles.wrapper, { width: size, height: size }, style]}>
      <Animated.Image
        source={source}
        style={{
          width: size,
          height: size,
          // borderRadius YOK: logo dairesel PNG ise transparan alan zaten dosyada var
          opacity,
          transform: [{ translateY }, { scale }],
        }}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: "center", justifyContent: "center" },
});
