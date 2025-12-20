import ReactDOM from 'react-dom';
import React, { useState, useEffect, useMemo } from 'react';
import { IoClose, IoOptionsOutline } from 'react-icons/io5';
import useIndicatorDataStore from '@/store/indicator/indicatorDataStore';
import { useTranslation } from "react-i18next";

const IndicatorSettingsModal = ({ isOpen, onClose, indicatorId, subId }) => {
  const { t } = useTranslation("apiContent");
  const { indicatorData, updateInputs } = useIndicatorDataStore();
  const [formState, setFormState] = useState({});
  const [mounted, setMounted] = useState(false);

  // Hydration hatasını önlemek için mount kontrolü
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const inputDefs = useMemo(() => {
    const rawInputs = indicatorData?.[indicatorId]?.subItems?.[subId]?.inputs?.inputs;
    if (!rawInputs) return [];

    return Object.entries(rawInputs).map(([_, input]) => ({
      name: input.name,
      type: input.type,
      default: input.default,
      options: input.options ?? null,
      min: input.min ?? undefined,
      max: input.max ?? undefined,
      step: input.step ?? undefined,
    }));
  }, [indicatorData, indicatorId, subId]);

  useEffect(() => {
    if (!isOpen || inputDefs.length === 0) return;

    const defaultState = {};
    inputDefs.forEach((input) => {
      defaultState[input.name] = input.default ?? '';
    });

    setFormState(defaultState);
  }, [isOpen, inputDefs]);

  const handleChange = (key, value) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    await updateInputs(indicatorId, subId, formState);
    onClose();
  };

  // Kapatma işlemi için dış tıklama kontrolü veya ESC tuşu eklenebilir
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!mounted || !isOpen || !indicatorId || !subId) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop - Blur ve Karartma */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-100"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative bg-zinc-950 text-zinc-100 rounded-xl border border-zinc-800 shadow-2xl w-full max-w-md flex flex-col max-h-[85vh] overflow-hidden transition-transform duration-100 transform scale-100">

        {/* Header - Sticky */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-zinc-800 bg-zinc-950 sticky top-0 z-10">
          <h2 className="text-lg font-semibold tracking-wide text-zinc-50">{t("settings")}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors duration-100"
          >
            <IoClose className="text-xl" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 
          [&::-webkit-scrollbar]:w-1.5
          [&::-webkit-scrollbar-track]:bg-zinc-900
          [&::-webkit-scrollbar-thumb]:bg-zinc-700
          [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-zinc-600">

          {inputDefs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 space-y-3 opacity-50">
              <IoOptionsOutline className="text-4xl text-zinc-600" />
              <div className="text-sm text-zinc-500 font-medium">
                {t("no_settings_available", "Ayarlanacak özellik bulunmuyor")}
              </div>
            </div>
          ) : (
            inputDefs.map((input) => (
              <div key={input.name} className="group">

                {/* Boolean (Switch) */}
                {input.type === 'bool' ? (
                  <div className="flex items-center justify-between py-1">
                    <label className="text-sm font-medium text-zinc-300 cursor-pointer select-none" onClick={() => handleChange(input.name, !formState[input.name])}>
                      {input.name}
                    </label>
                    <button
                      onClick={() => handleChange(input.name, !formState[input.name])}
                      className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-950 focus:ring-blue-600 ${formState[input.name] ? 'bg-blue-600' : 'bg-zinc-700'
                        }`}
                    >
                      <span
                        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 transform ${formState[input.name] ? 'translate-x-5' : 'translate-x-0'
                          }`}
                      />
                    </button>
                  </div>
                ) : input.type === 'color' ? (
                  // Color Input
                  <div className="flex items-center justify-between py-1">
                    <label className="text-sm font-medium text-zinc-300">{input.name}</label>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-zinc-500 uppercase font-mono">
                        {formState[input.name]}
                      </span>
                      <div className="relative w-8 h-8 rounded-full overflow-hidden border border-zinc-700 ring-2 ring-transparent hover:ring-zinc-600 transition-all duration-100">
                        <input
                          type="color"
                          value={formState[input.name] ?? '#000000'}
                          onChange={(e) => handleChange(input.name, e.target.value)}
                          className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] cursor-pointer p-0 border-0"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  // Standard Inputs (Text, Number, Select)
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider ml-1">
                      {input.name}
                    </label>

                    {input.type === 'string' && input.options ? (
                      <div className="relative">
                        <select
                          value={formState[input.name] ?? input.default}
                          onChange={(e) => handleChange(input.name, e.target.value)}
                          className="w-full px-3 py-2.5 rounded-lg bg-zinc-900 text-zinc-100 border border-zinc-800 
                          focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none appearance-none transition-colors duration-100"
                        >
                          {input.options.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                      </div>
                    ) : (
                      <input
                        type={input.type === 'int' || input.type === 'float' ? 'number' : 'text'}
                        value={formState[input.name] ?? (input.type === 'int' || input.type === 'float' ? 0 : '')}
                        step={input.type === 'float' ? '0.01' : '1'}
                        onChange={(e) =>
                          handleChange(
                            input.name,
                            input.type === 'int'
                              ? parseInt(e.target.value || '0', 10)
                              : input.type === 'float'
                                ? parseFloat(e.target.value || '0')
                                : e.target.value
                          )
                        }
                        className="w-full px-3 py-2.5 rounded-lg bg-zinc-900 text-zinc-100 border border-zinc-800 
                        placeholder-zinc-600 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-colors duration-100"
                      />
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer - Sticky */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-950 mt-auto sticky bottom-0 z-10 flex justify-end">
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-indigo-600 hover:to-blue-600 
            text-white font-semibold rounded-xl shadow-lg shadow-blue-500/15 
            transform transition-all duration-75 hover:scale-[1.01] active:scale-[0.99]"
          >
            {t("save")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default IndicatorSettingsModal;