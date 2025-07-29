import i18next from 'i18next';

import enHome from '@/locales/en/metadata/home.json';
import trHome from '@/locales/tr/metadata/home.json';

import enHeader from '@/locales/en/home/main/header.json';
import trHeader from '@/locales/tr/home/main/header.json';

import enHero from '@/locales/en/home/main/hero.json';
import trHero from '@/locales/tr/home/main/hero.json';

import enAbout from '@/locales/en/home/main/about.json';
import trAbout from '@/locales/tr/home/main/about.json';

const resources = {
  en: {
    home: enHome,
    header: enHeader,
    hero: enHero,
    about: enAbout,
  },
  tr: {
    home: trHome,
    header: trHeader,
    hero: trHero,
    about: trAbout,
  },
};

export async function getI18n(locale) {
  const instance = i18next.createInstance();
  await instance.init({
    lng: locale,
    fallbackLng: 'en',
    resources,
    ns: ['about'], 
    defaultNS: 'home',
    interpolation: {
      escapeValue: false,
    },
  });

  return instance;
}
