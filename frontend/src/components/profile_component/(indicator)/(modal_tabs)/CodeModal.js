"use client";

import { IoMdClose } from "react-icons/io";

const CodeModal = ({ isOpen, onClose, indicator }) => {
  if (!isOpen || !indicator) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-gray-900 text-white rounded-md w-[600px] h-[400px] p-6 shadow-lg relative">
        
        {/* Kapatma Butonu */}
        <button
          className="absolute top-3 right-3 text-gray-400 hover:text-white text-2xl"
          onClick={onClose}
        >
          <IoMdClose />
        </button>

        <h2 className="text-lg font-bold mb-4">{indicator.name}</h2>

        {/* Kod alanı */}
        <div className="bg-gray-800 p-3 rounded-md border  border-gray-700 overflow-auto max-h-[300px]">
        <pre className="text-sm whitespace-nowrap overflow-auto h-[250px] max-h-90 max-w-full p-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
          {indicator.code}
        </pre>

        </div>
      </div>
    </div>
  );
};

export default CodeModal;
