"use client";

import { useState } from "react";
import ChooseBotModal from "./chooseBotModal";

export default function SellRentModal({ open, onClose }) {
  const [sellChecked, setSellChecked] = useState(false);
  const [rentChecked, setRentChecked] = useState(false);
  const [sellPrice, setSellPrice] = useState("");
  const [rentPrice, setRentPrice] = useState("");
  const [description, setDescription] = useState("");
  const [chooseBotModalOpen, setChooseBotModalOpen] = useState(false);
  const [selectedBot, setSelectedBot] = useState(null);

  if (!open) return null;

  const handleSelectBot = (bot) => {
    setSelectedBot(bot);
    setChooseBotModalOpen(false);
  };

  return (
    <>
    <div className="fixed inset-0 z-[99] flex justify-center items-start bg-black/70 py-[60px]">
      <div
        className="bg-gradient-to-br from-zinc-900 to-zinc-950 text-white rounded-xl shadow-2xl p-8 w-[95vw] max-w-2xl relative border border-zinc-800
          max-h-[calc(100vh-120px)] overflow-y-auto"
      >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-6 right-6 text-2xl font-bold hover:text-red-400 transition-colors duration-200 w-8 h-8 flex items-center justify-center hover:bg-red-500/10 rounded-full"
          >
            ×
          </button>

          <h2 className="text-xl font-bold mb-6 text-center bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Sell / Rent Your Bot
          </h2>
          
          {/* Bot Selection */}
          <div className="mb-6">
            <label className="block text-base font-medium mb-3 text-gray-300">
              Choose a Bot
            </label>
            <div className="flex gap-3">
              <div className="flex-1">
                {selectedBot ? (
                  <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-white">{selectedBot.name}</div>
                      <div className="text-sm text-gray-400">
                        {selectedBot.strategy} • {selectedBot.api}
                      </div>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${
                      selectedBot.isActive ? 'bg-green-400' : 'bg-gray-400'
                    }`} />
                  </div>
                ) : (
                  <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 text-gray-400 text-center">
                    No bot selected yet
                  </div>
                )}
              </div>
              <button
                onClick={() => setChooseBotModalOpen(true)}
                className="px-4 h-10 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-purple-400/25"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Select
                </span>
              </button>
            </div>
          </div>
          
          {/* Sell / Rent Checkboxes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 h-24">
            {/* Want to Sell */}
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={sellChecked}
                    onChange={() => setSellChecked(!sellChecked)}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 rounded-lg border-2 transition-all duration-200 ${
                    sellChecked 
                      ? 'bg-cyan-400 border-cyan-400' 
                      : 'border-gray-600 hover:border-cyan-400'
                  }`}>
                    {sellChecked && (
                      <svg className="w-3 h-3 text-black absolute top-0.5 left-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-base font-medium group-hover:text-cyan-400 transition-colors">
                  I Want to Sell
                </span>
              </label>
              
              {sellChecked && (
                <div className="animate-in slide-in-from-top-2 duration-300">
                  <input
                    type="number"
                    min={0}
                    placeholder="Enter selling price"
                    className="w-full p-2.5 rounded-lg bg-zinc-800/50 border border-gray-700 hover:border-cyan-400 focus:border-cyan-400 focus:outline-none transition-all duration-200 text-sm placeholder-gray-400"
                    value={sellPrice}
                    onChange={e => setSellPrice(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Want to Rent */}
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={rentChecked}
                    onChange={() => setRentChecked(!rentChecked)}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 rounded-lg border-2 transition-all duration-200 ${
                    rentChecked 
                      ? 'bg-emerald-400 border-emerald-400' 
                      : 'border-gray-600 hover:border-emerald-400'
                  }`}>
                    {rentChecked && (
                      <svg className="w-3 h-3 text-black absolute top-0.5 left-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-base font-medium group-hover:text-emerald-400 transition-colors">
                  I Want to Rent
                </span>
              </label>
              
              {rentChecked && (
                <div className="animate-in slide-in-from-top-2 duration-300">
                  <input
                    type="number"
                    min={0}
                    placeholder="Enter rental price"
                    className="w-full p-2.5 rounded-lg bg-zinc-800/50 border border-gray-700 hover:border-emerald-400 focus:border-emerald-400 focus:outline-none transition-all duration-200 text-sm placeholder-gray-400"
                    value={rentPrice}
                    onChange={e => setRentPrice(e.target.value)}
                  />
                  <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                    <span>Monthly payment</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <label className="block text-base font-medium mb-2 text-gray-300">
              Listing Description
            </label>
            <textarea
              className="w-full min-h-[200px] max-h-[200px] bg-stone-900 border border-gray-700 rounded-sm p-3 text-sm resize-none placeholder-gray-400"
              placeholder="Describe your bot’s features, use cases, and other important details..."
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
            <div className="text-xs text-gray-400 mt-1.5 flex justify-between">
              <span>Detailed descriptions attract more attention</span>
              <span>{description.length}/1000</span>
            </div>
          </div>

          {/* Create Listing Request */}
          <button
            className="w-full bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-500 hover:to-blue-600 text-black font-semibold py-3 rounded-xl text-base transition-all duration-200 transform hover:scale-[1.01] active:scale-[0.99] shadow-lg hover:shadow-cyan-400/25"
            disabled={!sellChecked && !rentChecked || !selectedBot}
            // onClick={handleCreateRequest} // To be connected with backend
          >
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create Listing Request
            </span>
          </button>
        </div>
      </div>

      {/* Bot Selection Modal */}
      <ChooseBotModal
        open={chooseBotModalOpen}
        onClose={() => setChooseBotModalOpen(false)}
        onSelectBot={handleSelectBot}
      />
    </>
  );
}
