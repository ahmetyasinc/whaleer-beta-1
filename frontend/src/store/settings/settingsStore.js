// src/store/settingsStore.js
import { create } from 'zustand';
import i18n from '@/i18n';

const useSettingsStore = create((set, get) => ({
  language: 'tr', // varsayılan dil

  setLanguage: (lang) => {
    i18n.changeLanguage(lang);                // i18n dil değişimi
    localStorage.setItem('language', lang);   // kalıcı saklama
    set({ language: lang });
  },

  initializeLanguage: () => {
    const savedLang = 'tr' //localStorage.getItem('language');
    const browserLang = 'tr'//navigator.language?.split('-')[0] || 'en';
    const lang = savedLang || browserLang;

    i18n.changeLanguage(lang);
    set({ language: lang });
  },
}));

export default useSettingsStore;
