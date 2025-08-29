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

      <div className="fixed inset-0 z-50">
        <div className="relative grid min-h-dvh place-items-center p-4">
          <div className="bg-gradient-to-br from-zinc-900 via-zinc-950 to-black text-white rounded-2xl shadow-2xl shadow-red-500/20 border border-zinc-800 ring-1 ring-red-500/20 w-full max-w-md p-8 relative max-h-[calc(100dvh-2rem)] overflow-y-auto animate-fade-in">
          
          {/* Glow overlay */}
          <div className="absolute inset-0 rounded-2xl 
                          bg-gradient-to-br from-red-600/10 to-orange-500/5 
                          pointer-events-none blur-sm" />

          <div className="relative z-10">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 rounded-full bg-red-900/30 ring-1 ring-red-600/30">
                <FaExclamationTriangle className="text-red-400 text-2xl" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Kritik Onay</h2>
                <p className="text-sm text-zinc-400">
                  Dikkatli olun, bu işlem geri alınamaz
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="mb-8 p-4 rounded-xl bg-red-900/20 border border-red-700/40">
              <p className="text-sm leading-relaxed text-zinc-200">
                <strong className="text-red-400">Tüm botlarınız durdurulacak</strong> ve{" "}
                <strong className="text-red-400">aktif pozisyonlar kapatılacaktır</strong>. 
                Bu işlem geri alınamaz. Devam etmek istediğinizden emin misiniz?
              </p>
            </div>

            {/* Buttons */}
            <div className="space-y-3">
              <button
                disabled={countdown > 0}
                onClick={onConfirm}
                className={`w-full py-3 px-4 rounded-xl font-semibold 
                            transition-all duration-200 ${
                  countdown > 0
                    ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                    : "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/40 transform hover:scale-[1.01]"
                }`}
              >
                {countdown > 0 ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
                    {countdown} saniye...
                  </span>
                ) : (
                  "Onaylıyorum"
                )}
              </button>

              <button
                onClick={onClose}
                className="w-full py-3 px-4 rounded-xl font-semibold 
                           bg-zinc-800 hover:bg-zinc-700 
                           text-zinc-300 transition-all duration-200 
                           hover:scale-[1.01]"
              >
                İptal Et
              </button>
            </div>
          </div>
        </div>
        </div>
      </div>
    </>
  );
};

export default CriticalConfirmModal;
