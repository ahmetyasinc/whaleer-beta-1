import ClientPage from './client-page'; // Yeni oluşturacağın istemci bileşeni
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'API Bağlantısı',
  description: 'Kullanıcının eklediği API anahtarlarını yönetin',
};

export default function ApiConnectionPage() {
  return <ClientPage />;
}
