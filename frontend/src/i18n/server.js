import i18next from 'i18next';

import enMetadata from '@/locales/en/metadata/metadata.json';
import trMetadata from '@/locales/tr/metadata/metadata.json';

import enHeader from '@/locales/en/home/main/header.json';
import trHeader from '@/locales/tr/home/main/header.json';

import enHero from '@/locales/en/home/main/hero.json';
import trHero from '@/locales/tr/home/main/hero.json';

import enAbout from '@/locales/en/home/main/about.json';
import trAbout from '@/locales/tr/home/main/about.json';

import enProfileHeader from '@/locales/en/profile/header.json';
import trProfileHeader from '@/locales/tr/profile/header.json';


const resources = {
  en: {
    metadata: enMetadata,
    header: enHeader,
    hero: enHero,
    about: enAbout,
    profileHeader: enProfileHeader,
  },
  tr: {
    metadata: trMetadata,
    header: trHeader,
    hero: trHero,
    about: trAbout,
    profileHeader: trProfileHeader,
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
