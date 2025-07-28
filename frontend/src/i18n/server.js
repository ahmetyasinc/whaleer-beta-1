import i18next from 'i18next';
import enHome from '@/locales/en/metadata/home.json';
import trHome from '@/locales/tr/metadata/home.json';

import enHeader from '@/locales/en/home/main/header.json';
import trHeader from '@/locales/tr/home/main/header.json';

const resources = {
  en: {
    home: enHome,
    header: enHeader,
  },
  tr: {
    home: trHome,
    header: trHeader,
  },
};

export async function getI18n(locale) {
  const instance = i18next.createInstance();
  await instance.init({
    lng: locale,
    fallbackLng: 'en',
    resources,
    ns: ['home', 'header'], 
    defaultNS: 'home',
    interpolation: {
      escapeValue: false,
    },
  });

  return instance;
}
