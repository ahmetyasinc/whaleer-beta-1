import { useEffect, useState } from "react";
import { FaExclamationTriangle } from "react-icons/fa";

const CriticalConfirmModal = ({ isOpen, onClose, onConfirm }) => {
  const [countdown, setCountdown] = useState(5);
  const [showWhiteFlash, setShowWhiteFlash] = useState(false);


  useEffect(() => {
    if (!isOpen) return;
    setCountdown(5);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
    {showWhiteFlash && (
      <div className="fixed inset-0 z-[9999] bg-white animate-fadeout pointer-events-none" />
    )}


    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gradient-to-br dark:from-zinc-900 dark:to-zinc-950 text-gray-900 dark:text-white rounded-2xl shadow-2xl dark:shadow-red-500/10 p-8 w-full max-w-md relative animate-fade-in border-1 dark:border-zinc-800/50 dark:ring-1 dark:ring-red-500/20">
        {/* Glow effect for dark mode */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-red-500/5 to-orange-500/5 dark:from-red-500/10 dark:to-orange-500/10 pointer-events-none" />
        
        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 rounded-full bg-red-100 dark:bg-red-950/50 dark:ring-1 dark:ring-red-500/30">
              <FaExclamationTriangle className="text-red-600 dark:text-red-400 text-2xl" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Kritik Onay</h2>
              <p className="text-sm text-gray-500 dark:text-zinc-400">Dikkatli olun, bu işlem geri alınamaz</p>
            </div>
          </div>

          {/* Content */}
          <div className="mb-8 p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border-1 border-red-200 dark:border-red-900/30">
            <p className="text-sm leading-relaxed text-gray-800 dark:text-zinc-200">
              <strong className="text-red-700 dark:text-red-300">Tüm botlarınız durdurulacak</strong> ve{" "}
              <strong className="text-red-700 dark:text-red-300">aktif pozisyonlar kapatılacaktır</strong>. 
              Bu işlem geri alınamaz. Devam etmek istediğinizden emin misiniz?
            </p>
          </div>

          {/* Buttons */}
          <div className="space-y-3">
            <button
              disabled={countdown > 0}
              onClick={() => {
                // 1. Ses çal
                const audio = new Audio("/sounds/flash.mp3");
                audio.play().catch((e) => {
                  console.warn("Ses oynatılamadı:", e);
                });
                //onConfirm();                 asıl işlem burada yapılacak
                // 2. Beyaz ekran efekti başlat
                setShowWhiteFlash(true);
                setTimeout(() => setShowWhiteFlash(false), 6000);
              }}
              className={`w-full py-3 px-4 rounded-xl font-semibold transition-all duration-200 ${
                countdown > 0
                  ? "bg-gray-200 dark:bg-zinc-800 text-gray-500 dark:text-zinc-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 dark:from-red-500 dark:to-red-600 dark:hover:from-red-600 dark:hover:to-red-700 text-white shadow-lg dark:shadow-red-500/25 hover:shadow-xl dark:hover:shadow-red-500/40 transform hover:scale-[1.01]"
              }`}
            >
              {countdown > 0 ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-gray-400 dark:border-zinc-500 border-t-transparent rounded-full animate-spin" />
                  {countdown} saniye...
                </span>
              ) : (
                "Onaylıyorum"
              )}
            </button>
            <button
              onClick={onClose}
              className="w-full py-3 px-4 rounded-xl font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 transition-all duration-200 hover:scale-[1.01]"
            >
              İptal Et
            </button>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default CriticalConfirmModal;