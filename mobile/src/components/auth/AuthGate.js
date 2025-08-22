import React, { useEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import useAuthStore from "../../store/auth/authStore";

export default function AuthGate({ children }) {
  const isAuthed = useAuthStore((s) => s.isAuthed);
  const hydrated = useAuthStore((s) => s.hydrated);
  const navigation = useNavigation();

  useEffect(() => {
    if (hydrated && !isAuthed) {
      navigation.reset({ index: 0, routes: [{ name: "SignIn" }] });
    }
  }, [hydrated, isAuthed, navigation]);

  if (!hydrated) return null; // Splash zaten gösteriliyor
  if (!isAuthed) return null; // reset bekleniyor

  return children;
}
