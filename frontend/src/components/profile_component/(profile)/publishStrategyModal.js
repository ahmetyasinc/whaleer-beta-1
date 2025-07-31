import { useEffect, useState } from 'react';
import React from 'react';
import { IoClose, IoHelpCircleOutline, IoCheckboxOutline, IoCheckbox } from 'react-icons/io5';

export const PublishStrategyModal = ({ isOpen, onClose, onPublish }) => {
  const [permissions, setPermissions] = useState({
    codeView: false,
    chartView: false,
    scan: false,
    backtest: false,
    botRun: false
  });

  const [description, setDescription] = useState('');
  const [showInfo, setShowInfo] = useState(false);

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

  const permissionItems = [
    ['codeView', 'Kod görüntülenmesine izin ver', 'Kullanıcılar stratejinizin kaynak kodunu görüntüleyebilir'],
    ['chartView', 'Grafik görüntülenmesine izin ver', 'Varlık grafikleri üzerinde görsel analizler yapılabilir'],
    ['scan', 'Tarama yapılmasına izin ver', 'Piyasa tarama araçlarında kullanılabilir'],
    ['backtest', 'Backtest yapılmasına izin ver', 'Geçmiş verilerle test edilebilir'],
    ['botRun', 'Bot çalıştırmasına izin ver', 'Otomatik ticaret botlarında kullanılabilir']
  ];

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-black/60 via-black/70 to-black/80 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-300">
      <div className="bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-xl text-white rounded-2xl w-[850px] max-h-[90vh] shadow-2xl relative flex flex-col border-1 border-slate-700/50 animate-in zoom-in-95 duration-300 overflow-hidden">
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none"></div>
        
        {/* Header */}
        <div className="relative p-6 pb-4 border-b border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                Stratejiyi Yayınla
              </h2>
              <p className="text-slate-400 text-sm mt-1">Stratejinizi toplulukla paylaşın</p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowInfo(true)}
                className="group relative p-2 text-slate-400 hover:text-white transition-all duration-200 hover:bg-slate-700/50 rounded-full"
                aria-label="Bilgi"
              >
                <IoHelpCircleOutline className="text-xl" />
                <div className="absolute -bottom-8 right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-xs text-slate-300 whitespace-nowrap">
                  Yardım
                </div>
              </button>
              <button
                onClick={onClose}
                className="group relative p-2 text-slate-400 hover:text-white transition-all duration-200 hover:bg-red-500/20 rounded-full"
                aria-label="Kapat"
              >
                <IoClose className="text-xl" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="relative p-6 overflow-y-auto flex-1">
          {/* Permissions Section */}
            <div className="grid mb-4 gap-2">
              <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
              <div className="w-2 h-6 bg-gradient-to-b from-violet-500 to-cyan-500 rounded-full"></div>
              İzinler
            </h3>
              {permissionItems.map(([key, label, description]) => (
                <div 
                  key={key} 
                  className="group relative p-2 rounded-lg bg-slate-800/50 border-1 border-slate-700/50 transition-all duration-200 cursor-pointer"
                  onClick={() => handleToggle(key)}
                >
                  <div className="flex items-center">
                    {/* Checkboxu ortaladık */}
                    <div className="flex items-center justify-center w-8 h-8 rounded-md border-1 border-slate-600 bg-slate-900 group-hover:border-slate-500">
                      {permissions[key] ? (
                        <IoCheckbox className="text-2xl text-green-500 transition-all duration-200" /> 
                      ) : (
                        <IoCheckboxOutline className="text-2xl text-slate-400 group-hover:text-slate-300 transition-all duration-200" />
                      )}
                    </div>
                    
                    {/* Metin kısmı */}
                    <div className="flex-1 ml-4">
                      <span className="block font-medium text-slate-200 group-hover:text-white transition-colors duration-200">
                        {label}
                      </span>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {description}
                      </p>
                    </div>
                  </div>
                    
                  {/* Hover efekti */}
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/10 via-transparent to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                </div>
              ))}
            </div>


          {/* Description Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
              <div className="w-2 h-6 bg-gradient-to-b from-yellow-300 to-amber-700 rounded-full"></div>
              Açıklama
            </h3>
            
            <div className="relative">
              <textarea
                className="w-full h-[140px] p-4 rounded-lg bg-slate-800/50 text-white placeholder-slate-400 resize-none border-1 border-slate-700/50 focus:border-blue-500/50 focus:bg-slate-800/70 transition-all duration-200 backdrop-blur-sm"
                placeholder="Bu strateji ne yapar, hangi amaçla oluşturuldu, hangi piyasa koşullarında en iyi sonucu verir..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <div className="absolute bottom-3 right-3 text-xs text-slate-500">
                {description.length}/500
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative p-3 pt-3 border-t border-slate-700/50 bg-slate-900/30">
          <div className="flex justify-end gap-3">
            <button 
              onClick={onClose} 
              className="px-6 py-2.5 bg-slate-700/50 hover:bg-slate-600/50 text-slate-200 rounded-xl transition-all duration-200 border-1 border-slate-600/50 hover:border-slate-500/50 font-medium"
            >
              İptal
            </button>
            <button 
              onClick={handleConfirm} 
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-blue-500/25 font-medium relative overflow-hidden group"
            >
              <span className="relative z-10">Yayınla</span>
              <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
            </button>
          </div>
        </div>
      </div>

      {/* Info Modal */}
      {showInfo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[150] animate-in fade-in duration-200">
          <div className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl text-white p-6 rounded-2xl w-[450px] shadow-2xl relative border-1 border-slate-700/50 animate-in zoom-in-95 duration-200">
            
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-purple-500/10 rounded-2xl pointer-events-none"></div>
            
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-500/20 rounded-full">
                  <IoHelpCircleOutline className="text-blue-400 text-xl" />
                </div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                  Yayınlama Hakkında
                </h3>
              </div>
              
              <div className="space-y-4 text-slate-300 leading-relaxed">
                <p>
                  Bu alandan stratejinizin hangi özelliklerinin kullanıcılar tarafından erişilebilir olacağını belirleyebilirsiniz.
                </p>
                <p>
                  Her bir izin, ilgili sayfalarda stratejinizin nasıl görüneceğini ve hangi işlemlerin yapılabileceğini etkiler.
                </p>
                <div className="p-3 bg-blue-500/10 rounded-lg border-1 border-blue-500/20">
                  <p className="text-blue-300 text-sm">
                    💡 <strong>İpucu:</strong> Daha fazla izin vermek, stratejinizin daha geniş bir kitle tarafından kullanılmasını sağlar.
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowInfo(false)}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-xl transition-all duration-200 shadow-lg hover:shadow-blue-500/25 font-medium relative overflow-hidden group"
                >
                  <span className="relative z-10">Anladım</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};