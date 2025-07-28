'use client';

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enNotFound from '@/locales/en/notFound.json';
import trNotFound from '@/locales/tr/notFound.json';

import enHome from '@/locales/en/home.json';
import trHome from '@/locales/tr/home.json';



i18n
  .use(initReactI18next)
  .init({
    resources: {
        en: {
          notFound: enNotFound,
          home: enHome,
        },
        tr: {
          notFound: trNotFound,
          home: trHome,
        },
    },
    lng: 'tr',
    fallbackLng: 'en',
    ns: ['common'],
    defaultNS: 'common',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
