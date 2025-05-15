'use client';

import { FaLock } from 'react-icons/fa';
import SyncedCharts from "@/components/profile_component/(indicator)/syncedCharts"; // SyncedCharts bileşenini import edin

const isBeta = true;

export default function ClientPage() {
  if (isBeta) {
    return (
      <div className="relative min-h-screen w-full overflow-hidden">
      <div
      className="absolute inset-0 bg-center bg-no-repeat bg-cover blur-lg"
      style={{ backgroundImage: "url('/pages/backtest.png')" }}
    ></div>
      <div className="absolute inset-0 bg-white bg-opacity-10 z-10" />
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-20">
        <FaLock className="text-yellow-500 text-6xl mb-4" />
        <h1 className="text-white text-xl font-semibold">
          Bu sayfa yakında sizlerle buluşacak
        </h1>
      </div>
    </div>

    );
  }
  

  return (
    <div>
      <h1>Backtest Sayfası</h1>
      <SyncedCharts />  {/* SyncedCharts bileşenini burada kullanıyoruz */}
    </div>
  );
}
