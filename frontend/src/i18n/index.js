'use client';

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';


import enNotFound from '@/locales/en/notFound.json';
import trNotFound from '@/locales/tr/notFound.json';

import enHome from '@/locales/en/metadata/home.json';
import trHome from '@/locales/tr/metadata/home.json';

import enHeader from '@/locales/en/home/main/header.json';
import trHeader from '@/locales/tr/home/main/header.json';

import enHero from '@/locales/en/home/main/hero.json';
import trHero from '@/locales/tr/home/main/hero.json';

import enAbout from '@/locales/en/home/main/about.json';
import trAbout from '@/locales/tr/home/main/about.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
        en: {
          notFound: enNotFound,
          home: enHome,
          header: enHeader,
          hero: enHero,
          about: enAbout,
        },
        tr: {
          notFound: trNotFound,
          home: trHome,
          header: trHeader,
          hero: trHero,
          about: trAbout,
        },
    },
    fallbackLng: 'en',
    ns: ['common', 'notFound', 'home', 'header', 'hero', 'about'],
    defaultNS: 'common',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
