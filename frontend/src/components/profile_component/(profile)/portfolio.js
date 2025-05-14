"use client";
import { useState } from "react";

export default function Portfolio() {
  const [selectedExchange, setSelectedExchange] = useState("Binance");

  const portfolioData = [
    {
      name: "Bitcoin",
      symbol: "BTC",
      amount: 0.42,
      cost: 11000,
      pnl: 5200,
    },
    {
      name: "Ethereum",
      symbol: "ETH",
      amount: 3.1,
      cost: 4000,
      pnl: -600,
    },
    {
      name: "Render",
      symbol: "Ren",
      amount: 8.1,
      cost: 4800,
      pnl: -100,
    },
    {
      name: "Solana",
      symbol: "SOL",
      amount: 50,
      cost: 1200,
      pnl: 350,
    },
  ];

  return (
    <div className="w-1/3 h-full flex flex-col overflow-auto px-2">
      <div className="bg-zinc-900 rounded-md shadow-md text-white w-full flex flex-col h-full">
        
        {/* Sabit Başlık + Dropdown */}
        <div className="sticky top-0 z-10 bg-zinc-900 px-6 pt-6 pb-4 space-y-3">
          <h2 className="text-xl font-bold">Portföyüm</h2>
          <select
            value={selectedExchange}
            onChange={(e) => setSelectedExchange(e.target.value)}
            className="bg-zinc-800 text-white text-sm rounded px-3 py-2 outline-none focus:ring-2 ring-zinc-600 w-full"
          >
            <option value="Binance">Binance</option>
            <option value="Bybit">Bybit</option>
            <option value="KuCoin">KuCoin</option>
            <option value="OKX">OKX</option>
            <option value="MEXC">MEXC</option>
          </select>
        </div>

        {/* Scroll edilebilir coin listesi */}
        <div className="space-y-3 px-6 pb-6 overflow-y-auto flex-1">
          {portfolioData.map((coin, index) => (
            <div
              key={index}
              className="bg-zinc-800 rounded-md px-4 py-4 h-20 flex items-center justify-between hover:bg-zinc-700 transition"
            >
              {/* Sol Bilgiler */}
              <div className="flex flex-col">
                <h3 className="text-base font-semibold leading-tight">
                  {coin.name} ({coin.symbol})
                </h3>
                <span className="text-sm text-zinc-400">Adet: {coin.amount}</span>
                <span className="text-sm text-zinc-400">
                  Maliyet: ${coin.cost.toLocaleString()}
                </span>
              </div>

              {/* Sağ Kar/Zarar */}
              <div className="text-right">
                <span className="text-sm text-zinc-400 block mb-1">Kar/Zarar</span>
                <span
                  className={`text-lg font-bold ${
                    coin.pnl >= 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {coin.pnl >= 0 ? "+" : ""}
                  ${coin.pnl.toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
