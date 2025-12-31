import React, { useState, useEffect } from 'react';

const BotToggleConfirmModal = ({ isOpen, onClose, onConfirm, actionType }) => {
    const [isChecked, setIsChecked] = useState(false);

    useEffect(() => {
        if (isOpen) setIsChecked(false);
    }, [isOpen]);

    if (!isOpen) return null;

    const labelText = actionType === 'start'
        ? "Botun çalıştırılmasını onaylıyorum"
        : "Botun durdurulmasını onaylıyorum";

    const titleText = actionType === 'start' ? "Botu Başlat" : "Botu Durdur";

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-sm shadow-xl animate-fadeIn relative">
                <h2 className="text-xl font-semibold text-white mb-6 text-center">
                    {titleText}
                </h2>

                <div className="flex items-center gap-3 mb-8 justify-center bg-zinc-800/50 p-4 rounded-lg border border-zinc-700/50">
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={isChecked}
                            onChange={(e) => setIsChecked(e.target.checked)}
                        />
                        {/* Toggle Switch UI */}
                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        <span className="ml-3 text-sm font-medium text-gray-300 select-none">{labelText}</span>
                    </label>
                </div>

                <div className="flex justify-between gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 rounded-lg bg-zinc-700 text-white hover:bg-zinc-600 transition"
                    >
                        İptal
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={!isChecked}
                        className={`flex-1 px-4 py-2 rounded-lg transition text-white font-medium
                            ${!isChecked
                                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
                                : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 border border-emerald-700 hover:to-emerald-500 shadow-lg shadow-green-900/40'}`}
                    >
                        Devam
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BotToggleConfirmModal;
