'use client';

import { useState, useEffect } from 'react';
import { useSiftCoinStore } from '@/store/sift/strategySiftCoinStore';
import useStrategyStore from '@/store/indicator/strategyStore';
import StrategySiftModal from './strategySiftModal';
import StrategyButton from "./chooseStrategy";  
import axios from "axios";

// Periyotlar ve mum offsetleri
const periods = ['1dk','3dk','5dk', '15dk', '30dk', '1saat', '2saat', '4saat', '6saat', '1gun', '1hafta'];
const candleOffsets = ['Son mum', '2. mum', '3. mum', '4. mum', '5. mum'];

// Örnek coin verileri
const dummyLongCoins = [];

const dummyShortCoins = [];

export default function StrategySift() {
  // Zustand store'dan sadece strategies arrayini çekiyoruz
  const { strategies } = useStrategyStore();
  const { selectedCoins } = useSiftCoinStore();


  // Sadece strategies arrayini kullanıyoruz
  const allStrategies = strategies;
  
  // State yönetimi
  const [selectedStrategy, setSelectedStrategy] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState(periods[0]);
  const [selectedOffset, setSelectedOffset] = useState(candleOffsets[0]);
  const [longCoins, setLongCoins] = useState(dummyLongCoins);
  const [shortCoins, setShortCoins] = useState(dummyShortCoins);
  const [isStrategyModalOpen, setIsStrategyModalOpen] = useState(false);
  const [isCoinModalOpen, setIsCoinModalOpen] = useState(false);

  // Stratejiler yüklendiğinde ilk stratejiyi seçmek için - sadece bir kez çalışsın
  useEffect(() => {
    if (allStrategies.length > 0 && selectedStrategy === '') {
      setSelectedStrategy(allStrategies[0].id);
    }
    if (selectedStrategy) {
      setSelectedStrategy(selectedStrategy);
    }
  }, [selectedStrategy]);
  // selectedStrategy dependency'sini kaldırdık

  const extractTarget = (label) => {
    if (label === "Son mum") return 1;

    const match = label.match(/\d+/);
    return match ? parseInt(match[0]) : 1;
  };

  const extraxtPeriod = (label) => {
    if (label === "1dk") return "1m";
    if (label === "3dk") return "3m";
    if (label === "5dk") return "5m";
    if (label === "15dk") return "15m";
    if (label === "30dk") return "30m";
    if (label === "1saat") return "1h";
    if (label === "2saat") return "2h";
    if (label === "4saat") return "4h";
    if (label === "6saat") return "6h";
    if (label === "1gun") return "1d";
    if (label === "1hafta") return "1w";
    else return "1m";
  };

  const scan = async () => {
    try {
      axios.defaults.withCredentials = true;

      // 1. Payload'u hazırla
      const payload = {
        strategy_id: selectedStrategy,
        symbols: selectedCoins.map(c => c.symbol.replace("/", "")),
        interval: extraxtPeriod(selectedPeriod), // veya selectedPeriod'dan dönüştür
        candles: 200,
        target: extractTarget(selectedOffset),// örneğin "5. mum" => 5 gibi parse edilmeli
      };
    
      console.log("Gönderilen veri:", payload);

      // 2. API isteği gönder
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/scan/`, // endpoint örnek
        payload
      );

      const result = response.data;
      console.log("Gelen veri:", result)
      // 3. Long ve Short coinleri ayır
      const longResults = [];
      const shortResults = [];

      Object.entries(result).forEach(([symbol, value]) => {
        const price = [...longCoins, ...shortCoins].find(c => c.symbol.replace("/", "") === symbol)?.price || value;
        const coinData = {
          symbol: symbol.replace("USDT", "/USDT"),
          price: price,
          score: Math.abs(value),
        };
        if (value > 0) {
          longResults.push(coinData);
        } else if (value < 0) {
          shortResults.push(coinData);
        }
      });

      // 4. Skora göre sırala
      const sortFn = (a, b) => b.score - a.score;

      setLongCoins(longResults.sort(sortFn));
      setShortCoins(shortResults.sort(sortFn));

    } catch (error) {
      console.error("Tarama hatası:", error);
    }
  };

  const handleCoinAdd = () => {
    console.log('Coin eklendi.');
  };

  // Strateji seçim handler'ı
  const handleStrategySelect = (strategyId) => {
    setSelectedStrategy(strategyId);
    setIsStrategyModalOpen(false);
  };

  // Seçili strateji nesnesini bul
  const currentStrategy = allStrategies.find(s => s.id === selectedStrategy) || {};

  const CoinList = ({ coins, direction }) => {
    const isLong = direction === 'LONG';
    return (
      <div className="mt-2">
        <h3 className={`text-xs font-bold mb-2 ${isLong ? 'text-green-500' : 'text-red-500'}`}>
          {isLong ? 'LONG Sinyali' : 'SHORT Sinyali'}
        </h3>
        <div className="max-h-[220px] overflow-y-auto pr-1">
          {coins.map((coin, index) => (
            <div 
              key={index} 
              className="flex justify-between items-center p-2 mb-1 bg-zinc-800 rounded border-1 border-zinc-700 hover:bg-zinc-700 cursor-pointer"
            >
              <div className="flex items-center">
                <div className={`w-2 h-2 rounded-full ${isLong ? 'bg-green-500' : 'bg-red-500'} mr-2`}></div>
                <div className="font-medium text-sm">{coin.symbol}</div>
              </div>
              <div className="text-sm">Katsayı: {coin.price}</div>
            </div>
          ))}
          {coins.length === 0 && (
            <div className="text-center text-zinc-500 text-sm py-4">
              Bu tarama sonucu herhangi bir coin bulunamadı
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full w-full bg-zinc-900 shadow-lg p-2 rounded text-white">
      <h2 className="text-sm font-bold text-center mb-4">Strateji Tarama</h2>

      <div className="grid grid-cols-2 gap-3 mb-4">

        {/* Strateji seçme */}
        <div className="mb-2">
          <label className="block text-xs mb-1">Strateji</label>
          <StrategyButton 
            onStrategySelect={handleStrategySelect}
            selectedStrategy={selectedStrategy}
          />
        </div>


        {/* Periyot Dropdown */}
        <div>
          <label className="block text-xs mb-1">Periyot</label>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="w-full p-[6px] rounded bg-zinc-800 text-white border-1 border-zinc-500 text-sm"
          >
            {periods.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        {/* Mum Offset Dropdown */}
        <div>
          <label className="block text-xs mb-1">Hedef Mum</label>
          <select
            value={selectedOffset}
            onChange={(e) => setSelectedOffset(e.target.value)}
            className="w-full p-[6px] rounded bg-zinc-800 text-white border-1 border-zinc-500 text-sm"
          >
            {candleOffsets.map((offset) => (
              <option key={offset} value={offset}>
                {offset}
              </option>
            ))}
          </select>
        </div>

        {/* Coin Ekle Butonu */}
        <div className="flex items-end">
          <button
            onClick={() => setIsCoinModalOpen(true)}
            className="w-full bg-zinc-800 border-1 border-gray-500 text-white pt-[7px] pb-[8px] rounded text-sm"
          >
            Coin Ekle
          </button>
          <StrategySiftModal isOpen={isCoinModalOpen} onClose={() => setIsCoinModalOpen(false)} />
        </div>

      </div>

      {/* TARAMA YAP Butonu */}
      <button
        onClick={() => scan()}
        className="mb-3 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded text-sm transition"
      >
        Tarama Yap
      </button>


      {/* Sonuç Bölümü - İki Bölmeli Yapı */}
      <div className="border-t border-zinc-700 pt-2 flex flex-col">
        {/* Long Sinyali Veren Coinler */}
        <div className="flex-1 overflow-hidden">
          <CoinList coins={longCoins} direction="LONG" />
        </div>
        
        {/* Short Sinyali Veren Coinler */}
        <div className="flex-1 overflow-hidden mt-3 ">
          <CoinList coins={shortCoins} direction="SHORT" />
        </div>
      </div>
    </div>
  );
}