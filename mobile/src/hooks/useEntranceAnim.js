// hooks/useEntranceAnim.js
import { useRef, useEffect } from "react";
import { Animated, Easing } from "react-native";

export const useEntranceAnim = () => {
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslate = useRef(new Animated.Value(16)).current;
  const buttonsOpacity = useRef(new Animated.Value(0)).current;
  const buttonsTranslate = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(titleOpacity, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(titleTranslate, { toValue: 0, duration: 2000, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.delay(80),
      Animated.parallel([
        Animated.timing(buttonsOpacity, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.spring(buttonsTranslate, { toValue: 0, friction: 30, tension: 2500, useNativeDriver: true }),
      ]),
    ]).start();
  }, [titleOpacity, titleTranslate, buttonsOpacity, buttonsTranslate]);

  return { titleOpacity, titleTranslate, buttonsOpacity, buttonsTranslate };
};
