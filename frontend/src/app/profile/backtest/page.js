// Backtest.js
//import SyncedCharts from "@/components/profile_component/(indicator)/syncedCharts";

export const metadata = {
  title: "BackTest",
  description: "Olusturulan stratejileri test etme sayfası.",
};

import ClientPage from './client-page'; // Yeni oluşturacağın istemci bileşeni

export default function Backtest() {
  return <ClientPage />;
}
