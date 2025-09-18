import ReactDOM from 'react-dom';
import React, { useState, useEffect, useMemo } from 'react';
import { IoClose } from 'react-icons/io5';
import useStrategyDataStore from '@/store/indicator/strategyDataStore';
import { useTranslation } from "react-i18next";

const StrategySettingsModal = ({ isOpen, onClose, strategyId, subId }) => {
  const { t } = useTranslation("apiContent");
  const { strategyData, updateInputs } = useStrategyDataStore();
  const [formState, setFormState] = useState({});

  const inputDefs = useMemo(() => {
    const rawInputs = strategyData?.[strategyId]?.subItems?.[subId]?.inputs?.inputs;
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
  }, [strategyData, strategyId, subId]);


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
    await updateInputs(strategyId, subId, formState);
    onClose();
  };

  if (!isOpen || !strategyId || !subId) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center overflow-y-auto">
      <div className="bg-[#1e1e1e] text-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">{t("settings")}</h2>
          <button onClick={onClose}>
            <IoClose className="text-2xl hover:text-red-500" />
          </button>
        </div>

        {inputDefs.map((input) => (
          <div key={input.name} className="mb-4">
            <label className="block mb-1">{input.name}</label>

            {input.type === 'int' || input.type === 'float' ? (
              <input
                type="number"
                value={formState[input.name] ?? 0}
                step={input.type === 'float' ? '0.01' : '1'}
                onChange={(e) =>
                  handleChange(
                    input.name,
                    input.type === 'int'
                      ? parseInt(e.target.value || '0', 10)
                      : parseFloat(e.target.value || '0')
                  )
                }
                className="w-full p-2 rounded bg-gray-800 text-white border border-gray-600"
              />
            ) : input.type === 'bool' ? (
              <input
                type="checkbox"
                checked={!!formState[input.name]}
                onChange={(e) => handleChange(input.name, e.target.checked)}
                className="w-5 h-5"
              />
            ) : input.type === 'color' ? (
              <input
                type="color"
                value={formState[input.name] ?? '#000000'}
                onChange={(e) => handleChange(input.name, e.target.value)}
                className="w-12 h-8 p-1"
              />
            ) : (
              <input
                type="text"
                value={formState[input.name] ?? ''}
                onChange={(e) => handleChange(input.name, e.target.value)}
                className="w-full p-2 rounded bg-gray-800 text-white border border-gray-600"
              />
            )}
          </div>
        ))}

        <button
          onClick={handleSave}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded"
        >
          {t("save")}
        </button>
      </div>
    </div>,
    document.body
  );
};

export default StrategySettingsModal;
