import ReactDOM from 'react-dom';
import { useEffect, useState, useCallback } from 'react';
import React from 'react';
import { IoClose, IoHelpCircleOutline } from 'react-icons/io5';
import { useTranslation } from 'react-i18next';

const INITIAL_PERMS = {
  codeView: false,
  chartView: false,
  scan: false,
  backtest: false,
  botRun: false,
};

export const PublishStrategyModal = ({ isOpen, onClose, onPublish }) => {
  const { t } = useTranslation('publishStrategyModal');
  const [mounted, setMounted] = useState(false);
  const [permissions, setPermissions] = useState(INITIAL_PERMS);
  const [description, setDescription] = useState('');
  const [showInfo, setShowInfo] = useState(false);
  const [loading, setLoading] = useState(false);

  // Hydration hatasını önlemek için mount kontrolü
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const resetForm = useCallback(() => {
    setPermissions(INITIAL_PERMS);
    setDescription('');
    setShowInfo(false);
    setLoading(false);
  }, []);

  const handleToggle = (key) => {
    setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleClose = useCallback(() => {
    resetForm();
    onClose && onClose();
  }, [onClose, resetForm]);

  const handleConfirm = async () => {
    if (loading) return;
    try {
      setLoading(true);
      await Promise.resolve(onPublish?.({ permissions, description }));
    } finally {
      resetForm();
      onClose && onClose();
    }
  };

  // ESC ile kapama
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        if (showInfo) setShowInfo(false);
        else handleClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, showInfo, handleClose]);

  // Modal açıldığında temiz başlasın
  useEffect(() => {
    if (isOpen) resetForm();
  }, [isOpen, resetForm]);

  if (!mounted || !isOpen) return null;

  // İzin kartları (metinler i18n'den)
  const permissionItems = [
    ['codeView', t('perms.items.codeView.label'), t('perms.items.codeView.desc')],
    ['chartView', t('perms.items.chartView.label'), t('perms.items.chartView.desc')],
    // ['scan', t('perms.items.scan.label'), t('perms.items.scan.desc')],
    ['backtest', t('perms.items.backtest.label'), t('perms.items.backtest.desc')],
    ['botRun', t('perms.items.botRun.label'), t('perms.items.botRun.desc')],
  ];

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-100"
        onClick={handleClose}
      />

      {/* Modal Container */}
      <div className="relative bg-zinc-950 text-zinc-100 rounded-xl border border-zinc-800 shadow-2xl w-full max-w-xl flex flex-col max-h-[85vh] overflow-hidden transition-transform duration-100 transform scale-100">

        {/* Header - Sticky */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-zinc-800 bg-zinc-950 sticky top-0 z-10">
          <div>
            <h2 className="text-lg font-semibold tracking-wide text-zinc-50">{t('title')}</h2>
            <p className="text-zinc-500 text-xs mt-0.5">{t('subtitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowInfo(true)}
              className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors duration-100"
              aria-label={t('aria.help')}
              title={t('help')}
            >
              <IoHelpCircleOutline className="text-xl" />
            </button>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors duration-100"
            >
              <IoClose className="text-xl" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 
          [&::-webkit-scrollbar]:w-1.5
          [&::-webkit-scrollbar-track]:bg-zinc-900
          [&::-webkit-scrollbar-thumb]:bg-zinc-700
          [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-zinc-600">

          {/* Permissions Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-2">
              <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
              {t('headers.permissions')}
            </h3>
            <div className="space-y-2">
              {permissionItems.map(([key, label, desc]) => (
                <div
                  key={key}
                  className="group flex items-center gap-4 p-3 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all duration-100 cursor-pointer"
                  onClick={() => handleToggle(key)}
                >
                  {/* Toggle Button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleToggle(key); }}
                    className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-950 focus:ring-blue-600 ${permissions[key] ? 'bg-blue-600' : 'bg-zinc-700'
                      }`}
                  >
                    <span
                      className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 transform ${permissions[key] ? 'translate-x-5' : 'translate-x-0'
                        }`}
                    />
                  </button>

                  {/* Label & Description */}
                  <div className="flex-1">
                    <span className="block text-sm font-medium text-zinc-200 group-hover:text-white transition-colors">
                      {label}
                    </span>
                    <p className="text-xs text-zinc-500 mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Description Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-2">
              <div className="w-1 h-4 bg-amber-500 rounded-full"></div>
              {t('headers.description')}
            </h3>
            <div className="relative">
              <textarea
                className="w-full h-32 px-3 py-2.5 rounded-lg bg-zinc-900 text-zinc-100 border border-zinc-800 
                placeholder-zinc-600 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none 
                transition-colors duration-100 resize-none"
                placeholder={t('placeholders.description')}
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 500))}
              />
              <div className="absolute bottom-2 right-3 text-xs text-zinc-600">
                {description.length}/500
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Sticky */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-950 mt-auto sticky bottom-0 z-10 flex justify-end gap-3">
          <button
            onClick={handleClose}
            disabled={loading}
            className="px-5 py-2 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors duration-100 font-medium"
          >
            {t('buttons.cancel')}
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || !Object.values(permissions).some(Boolean)}
            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-indigo-600 hover:to-blue-600 
            disabled:opacity-50 disabled:cursor-not-allowed
            text-white font-semibold rounded-xl shadow-lg shadow-blue-500/15 
            transform transition-all duration-75 hover:scale-[1.01] active:scale-[0.99]"
          >
            {loading ? t('buttons.publishing') : t('buttons.publish')}
          </button>
        </div>
      </div>

      {/* Info Modal */}
      {showInfo && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowInfo(false)}
          />
          <div className="relative bg-zinc-950 text-zinc-100 rounded-xl border border-zinc-800 shadow-2xl w-full max-w-md p-6">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-500/20 rounded-full">
                <IoHelpCircleOutline className="text-blue-400 text-xl" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-50">
                {t('headers.aboutPublishing')}
              </h3>
            </div>

            {/* Content */}
            <div className="space-y-3 text-zinc-300 text-sm leading-relaxed">
              <p>{t('info.p1')}</p>
              <p>{t('info.p2')}</p>
              <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <p className="text-blue-300 text-xs">
                  💡 <strong>{t('info.tip')}</strong> {t('info.tipText')}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowInfo(false)}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-indigo-600 hover:to-blue-600 
                text-white font-semibold rounded-xl shadow-lg shadow-blue-500/15 
                transform transition-all duration-75 hover:scale-[1.01] active:scale-[0.99]"
              >
                {t('buttons.gotIt')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};
