'use client';

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';


import enNotFound from '@/locales/en/notFound.json';
import trNotFound from '@/locales/tr/notFound.json';

import enMetadata from '@/locales/en/metadata/metadata.json';
import trMetadata from '@/locales/tr/metadata/metadata.json';

import enHeader from '@/locales/en/home/main/header.json';
import trHeader from '@/locales/tr/home/main/header.json';

import enHero from '@/locales/en/home/main/hero.json';
import trHero from '@/locales/tr/home/main/hero.json';

import enAbout from '@/locales/en/home/main/about.json';
import trAbout from '@/locales/tr/home/main/about.json';

import enFuature from '@/locales/en/home/main/featuresTabs.json';
import trFuature from '@/locales/tr/home/main/featuresTabs.json';

import enFooter from '@/locales/en/home/main/footer.json';
import trFooter from '@/locales/tr/home/main/footer.json';

import enLogin from '@/locales/en/auth/login.json';
import trLogin from '@/locales/tr/auth/login.json';

import enLeftMenu from '@/locales/en/profile/leftMenu.json';
import trLeftMenu from '@/locales/tr/profile/leftMenu.json';

import enIndicator from '@/locales/en/profile/indicator.json';
import trIndicator from '@/locales/tr/profile/indicator.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
        en: {
          notFound: enNotFound,
          metadata: enMetadata,
          header: enHeader,
          hero: enHero,
          about: enAbout,
          feature :enFuature,
          footer : enFooter,
          login: enLogin,
          leftmenu: enLeftMenu,
          indicator: enIndicator,
        },
        tr: {
          notFound: trNotFound,
          metadata: trMetadata,
          header: trHeader,
          hero: trHero,
          about: trAbout,
          feature: trFuature,
          footer: trFooter,
          login: trLogin,
          leftmenu: trLeftMenu,
          indicator: trIndicator,
        },
    },
    fallbackLng: 'en',
    ns: ['common', 'notFound', 'metadata', 'header', 'hero', 'about', 'feature','footer', 'login', 'leftmenu'],
    defaultNS: 'common',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
