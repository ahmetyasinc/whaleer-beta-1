import { useEffect, useState } from 'react';
import React from 'react';
import { IoClose, IoHelpCircleOutline } from 'react-icons/io5';

export const PublishModal = ({ isOpen, onClose, onPublish }) => {
  const [permissions, setPermissions] = useState({
    codeView: false,
    chartView: false,
    scan: false,
    backtest: false,
    botRun: false
  });

  const [description, setDescription] = useState('');
  const [showInfo, setShowInfo] = useState(false); // bilgi modalı kontrolü

  const handleToggle = (key) => {
    setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleConfirm = () => {
    onPublish({ permissions, description });
    onClose();
  };

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        if (showInfo) setShowInfo(false);
        else onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showInfo, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 bg-opacity-60 flex items-center justify-center z-[100]">
      <div className="bg-[#1e1e1e] text-white rounded-lg w-[800px] h-[550px] shadow-2xl relative flex flex-col">

        {/* Sağ üst köşe: Bilgi + Çarpı */}
        <div className="absolute top-3 right-3 flex items-center gap-2">
          <button
            onClick={() => setShowInfo(true)}
            className="text-gray-400 hover:text-white text-xl"
            aria-label="Bilgi"
          >
            <IoHelpCircleOutline />
          </button>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
            aria-label="Kapat"
          >
            <IoClose />
          </button>
        </div>

        {/* İçerik */}
        <div className="p-6 overflow-y-auto flex-1">
          <h2 className="text-lg font-bold mb-4">Göstergeyi Yayınla</h2>

          {[
            ['codeView', 'Kod görüntülenmesine izin ver'],
            ['chartView', 'Grafik görüntülenmesine izin ver'],
            ['scan', 'Tarama yapılmasına izin ver'],
            ['backtest', 'Backtest yapılmasına izin ver'],
            ['botRun', 'Bot çalıştırmasına izin ver']
          ].map(([key, label]) => (
            <label key={key} className="flex justify-between items-center text-sm py-1">
              <span>{label}</span>
              <input
                type="checkbox"
                checked={permissions[key]}
                onChange={() => handleToggle(key)}
                className="form-checkbox h-4 w-4 text-blue-500"
              />
            </label>
          ))}

          <div className="mt-4">
            <label className="block mb-1 text-sm">Kullanıcı Açıklaması</label>
            <textarea
              className="w-full h-[150px] p-2 rounded bg-gray-800 text-white overflow-auto whitespace-pre resize-none"
              placeholder="Bu strateji ne yapar, hangi amaçla oluşturuldu..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        {/* Butonlar */}
        <div className="flex justify-end gap-2 p-4 border-t border-gray-700">
          <button onClick={onClose} className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-500">İptal</button>
          <button onClick={handleConfirm} className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500">Yayınla</button>
        </div>
      </div>

      {/* Bilgi Modalı */}
      {showInfo && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-[150]">
          <div className="bg-[#2a2a2a] text-white p-6 rounded-lg w-[400px] shadow-xl relative">
            <h3 className="text-lg font-bold mb-2">Yayınlama Hakkında</h3>
            <p className="text-sm text-gray-300 mb-4">
              Bu alandan stratejinizin hangi özelliklerinin kullanıcılar tarafından erişilebilir olacağını belirleyebilirsiniz.
              Her bir izin, ilgili sayfalarda stratejinizin nasıl görüneceğini etkiler.
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setShowInfo(false)}
                className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500 text-sm"
              >
                Tamam
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
