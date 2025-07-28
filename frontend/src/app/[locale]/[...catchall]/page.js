import NotFound from '@/app/[locale]/not-found/NotFoundClient';

export async function generateStaticParams() {
  return [{ locale: 'en' }, { locale: 'tr' }];
}

export async function generateMetadata({ params }) {
  const { locale } = params;

  const metaByLocale = {
    en: {
      title: "Page Not Found",
      description: "The page you are looking for does not exist or has been removed."
    },
    tr: {
      title: "Sayfa Bulunamadı",
      description: "Aradığınız sayfa mevcut değil veya kaldırılmış."
    }
  };

  return metaByLocale[locale] || metaByLocale.en;
}

export default async function CatchAll({ params }) {
  const locale = await params.locale;
  return <NotFound locale={locale} />;
}
