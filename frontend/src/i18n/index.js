'use client';

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';


import enNotFound from '@/locales/en/notFound.json';
import trNotFound from '@/locales/tr/notFound.json';

import enHome from '@/locales/en/metadata/home.json';
import trHome from '@/locales/tr/metadata/home.json';

import enHeader from '@/locales/en/home/main/header.json';
import trHeader from '@/locales/tr/home/main/header.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
        en: {
          notFound: enNotFound,
          home: enHome,
          header: enHeader,
        },
        tr: {
          notFound: trNotFound,
          home: trHome,
          header: trHeader,
        },
    },
    lng: 'en',
    fallbackLng: 'en',
    ns: ['common', 'notFound', 'home', 'header'],
    defaultNS: 'common',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
