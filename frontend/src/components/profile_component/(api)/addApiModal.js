"use client";

import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FaKey } from "react-icons/fa6";

export default function AddApiModal({ isOpen, onClose, onSave, editMode = false, initialData = null }) {
  const [formData, setFormData] = useState({
    exchange: 'Binance',
    name: '',
    key: '',
    secretkey: ''
  });
  const [errors, setErrors] = useState({});
  const keyInputRef = useRef(null);
  const secretKeyInputRef = useRef(null);

  useEffect(() => {
    if (editMode && initialData) {
      setFormData(initialData);
    } else if (!editMode) {
      setFormData({
        exchange: 'Binance',
        name: '',
        key: '',
        secretkey: ''
      });
      setErrors({});
    }
  }, [editMode, initialData, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleKeyChange = (e, fieldName) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, [fieldName]: value }));

    if (errors[fieldName]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  const handleKeyInput = (e, fieldName) => {
    if (!(e.ctrlKey && e.key === 'v') && !(e.metaKey && e.key === 'v')) {
      e.preventDefault();
    }
  };

  const handlePaste = (e, fieldName) => {
    const pastedText = e.clipboardData.getData('text');
    setFormData(prev => ({ ...prev, [fieldName]: pastedText }));
    e.preventDefault();

    if (errors[fieldName]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  const handleSubmit = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Please enter an API name';
    if (!formData.key.trim()) newErrors.key = 'API key cannot be empty';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSave(formData, editMode);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        >
          <motion.div
            key="modal-content"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="bg-[rgb(0,3,15)] rounded p-6 w-full max-w-md shadow-lg text-white"
          >
            <h2 className="text-lg font-bold mb-4">
              {editMode ? 'Edit API' : 'Add New API'}
            </h2>

            <div className="space-y-4">
              {/* Exchange selection */}
              <div>
                <label className="block font-medium">Exchange</label>
                <div className="relative">
                  <select
                    name="exchange"
                    value={formData.exchange}
                    onChange={handleChange}
                    disabled={editMode}
                    className={`w-full mt-1 rounded-sm px-3 py-2 bg-gray-900 text-white appearance-none pr-10 ${editMode ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <option value="Binance">Binance</option>
                    <option value="Okx">OKX</option>
                    <option value="Coinbase">Coinbase Exchange</option>
                    <option value="Bybit">Bybit</option>
                    <option value="Upbit">Upbit</option>
                    <option value="Kucoin">KuCoin</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-1 flex items-center text-white">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* API name */}
              <div>
                <label className="block font-medium">API Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter API name"
                  className={`w-full mt-1 rounded-sm px-3 py-2 bg-gray-900 text-white ${errors.name ? 'border border-red-500' : ''}`}
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
              </div>

              {/* API key */}
              <div>
                <label className="block font-medium">API Key <span className="text-red-500">*</span></label>
                <div className="relative w-full">
                  <input
                    type="text"
                    name="key"
                    ref={keyInputRef}
                    value={formData.key}
                    onChange={(e) => handleKeyChange(e, 'key')}
                    onKeyDown={(e) => handleKeyInput(e, 'key')}
                    onPaste={(e) => handlePaste(e, 'key')}
                    disabled={editMode}
                    className={`w-full mt-1 rounded-sm px-3 py-2 bg-gray-900 text-white ${errors.key ? 'border border-red-500' : ''} ${editMode ? 'opacity-60 cursor-not-allowed' : ''}`}
                    placeholder="Paste your API key"
                  />
                  <span className="absolute inset-y-0 right-2 flex items-center text-gray-600 pointer-events-none text-base">
                    <FaKey />
                  </span>
                </div>
                {errors.key && <p className="text-red-500 text-sm mt-1">{errors.key}</p>}
              </div>

              {/* Secret key */}
              <div>
                <label className="block font-medium">Secret API Key</label>
                <div className="relative w-full">
                  <input
                    type="text"
                    name="secretkey"
                    ref={secretKeyInputRef}
                    value={formData.secretkey}
                    onChange={(e) => handleKeyChange(e, 'secretkey')}
                    onKeyDown={(e) => handleKeyInput(e, 'secretkey')}
                    onPaste={(e) => handlePaste(e, 'secretkey')}
                    disabled={editMode}
                    className={`w-full mt-1 rounded-sm px-3 py-2 bg-gray-900 text-white ${editMode ? 'opacity-60 cursor-not-allowed' : ''}`}
                    placeholder="Paste your secondary API key"
                  />
                  <span className="absolute inset-y-0 right-2 flex items-center text-gray-600 pointer-events-none text-base">
                    <FaKey />
                  </span>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex justify-end space-x-2 mt-4">
                <button
                  onClick={onClose}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                >
                  {editMode ? 'Update' : 'Save'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
