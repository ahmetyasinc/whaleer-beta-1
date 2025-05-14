export const metadata = {
  title: "Profilim",
  description: "Kullanıcı profili sayfası.",
};

import ClientProfilePage from './client-profile'; // Yeni oluşturacağın istemci bileşeni

export default function ProfilePage() {
  return <ClientProfilePage />;
}
