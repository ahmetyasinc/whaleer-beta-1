// Backtest.js
import SyncedCharts from "@/components/profile_component/(indicator)/syncedCharts"; // SyncedCharts bileşenini import edin
export const dynamic = 'force-dynamic';

export const metadata = {
  title: "BackTest",
  description: "Olusturulan stratejileri test etme sayfası.",
};

export default function Backtest() {
  return (
    <div>
      <h1>Backtest Sayfası</h1>
      <SyncedCharts />  {/* SyncedCharts bileşenini burada kullanıyoruz */}
    </div>
  );
}
