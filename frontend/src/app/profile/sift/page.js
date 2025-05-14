export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Tarama",
  description: "Tarama sayfası.",
};

import ClientPage from './client-page'; // Yeni oluşturacağın istemci bileşeni

export default function SiftPage() {
  return <ClientPage />;
}