import i18next from 'i18next';
import enHome from '@/locales/en/home.json';
import trHome from '@/locales/tr/home.json';

const resources = {
  en: {
    home: enHome,
  },
  tr: {
    home: trHome,
  },
};

export async function getI18n(locale) {
  const instance = i18next.createInstance();
  await instance.init({
    lng: locale,
    fallbackLng: 'en',
    resources,
    ns: ['home'],
    defaultNS: 'home',
    interpolation: {
      escapeValue: false,
    },
  });

  return instance;
}
