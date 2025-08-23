// src/context/SettingsContext.js
import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';
import { View } from "react-native";

export const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
  const systemTheme = useColorScheme(); // cihazdan al
  const [theme, setTheme] = useState(systemTheme || 'light');
  const [ready, setReady] = useState(false);

  // İlk açılışta ayarı AsyncStorage'dan yükle
  useEffect(() => {
    (async () => {
      const savedTheme = await AsyncStorage.getItem("theme");
      if (savedTheme) setTheme(savedTheme);
      setReady(true);
    })();
  }, []);

  if (!ready) return <View style={{ flex:1, backgroundColor: systemTheme==='dark'?'#000':'#fff' }} />;

  // Tema değiştiğinde kaydet
  const changeTheme = async (newTheme) => {
    setTheme(newTheme);
    await AsyncStorage.setItem('theme', newTheme);
  };

  return (
    <SettingsContext.Provider value={{ theme, changeTheme }}>
      {children}
    </SettingsContext.Provider>
  );
};
