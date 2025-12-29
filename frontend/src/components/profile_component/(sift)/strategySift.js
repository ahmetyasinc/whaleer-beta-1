'use client';

import { useState, useEffect } from 'react';
import { useSiftCoinStore } from '@/store/sift/strategySiftCoinStore';
import useStrategyStore from '@/store/indicator/strategyStore';
import StrategySiftModal from './strategySiftModal';
import StrategyButton from "./chooseStrategy";  
import axios from "axios";

const periods = ['1min', '3min', '5min', '15min', '30min', '1h', '2h', '4h', '6h', '1d', '1w'];
const candleOffsets = ['Last candle', '2nd candle', '3rd candle', '4th candle', '5th candle'];

const dummyLongCoins = [];
const dummyShortCoins = [];

export default function StrategySift() {
  const { strategies } = useStrategyStore();
  const { selectedCoins } = useSiftCoinStore();
  const allStrategies = strategies;

  const [selectedStrategy, setSelectedStrategy] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState(periods[0]);
  const [selectedOffset, setSelectedOffset] = useState(candleOffsets[0]);
  const [longCoins, setLongCoins] = useState(dummyLongCoins);
  const [shortCoins, setShortCoins] = useState(dummyShortCoins);
  const [isStrategyModalOpen, setIsStrategyModalOpen] = useState(false);
  const [isCoinModalOpen, setIsCoinModalOpen] = useState(false);

  useEffect(() => {
    if (allStrategies.length > 0 && selectedStrategy === '') {
      setSelectedStrategy(allStrategies[0].id);
    }
    if (selectedStrategy) {
      setSelectedStrategy(selectedStrategy);
    }
  }, [selectedStrategy]);

  const extractTarget = (label) => {
    if (label === "Last candle") return 1;
    const match = label.match(/\d+/);
    return match ? parseInt(match[0]) : 1;
  };

  const extractPeriod = (label) => {
    const map = {
      '1min': '1m', '3min': '3m', '5min': '5m', '15min': '15m', '30min': '30m',
      '1h': '1h', '2h': '2h', '4h': '4h', '6h': '6h', '1d': '1d', '1w': '1w'
    };
    return map[label] || '1m';
  };

  const scan = async () => {
    try {
      axios.defaults.withCredentials = true;
      const payload = {
        strategy_id: selectedStrategy,
        symbols: selectedCoins.map(c => c.symbol.replace("/", "")),
        interval: extractPeriod(selectedPeriod),
        candles: 200,
        target: extractTarget(selectedOffset),
      };

      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/scan/`, payload);
      const result = response.data;

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

      const sortFn = (a, b) => b.score - a.score;
      setLongCoins(longResults.sort(sortFn));
      setShortCoins(shortResults.sort(sortFn));

    } catch (error) {
      console.error("Scan error:", error);
    }
  };

  const handleStrategySelect = (strategyId) => {
    setSelectedStrategy(strategyId);
    setIsStrategyModalOpen(false);
  };

  const currentStrategy = allStrategies.find(s => s.id === selectedStrategy) || {};

  const CoinList = ({ coins, direction }) => {
    const isLong = direction === 'LONG';
    return (
      <div className="mt-2">
        <h3 className={`text-xs font-bold mb-2 ${isLong ? 'text-green-500' : 'text-red-500'}`}>
          {isLong ? 'LONG Signals' : 'SHORT Signals'}
        </h3>
        <div className="max-h-[220px] overflow-y-auto pr-1">
          {coins.map((coin, index) => (
            <div 
              key={index} 
              className="flex justify-between items-center p-2 mb-1 bg-zinc-800 rounded border border-zinc-700 hover:bg-zinc-700 cursor-pointer"
            >
              <div className="flex items-center">
                <div className={`w-2 h-2 rounded-full ${isLong ? 'bg-green-500' : 'bg-red-500'} mr-2`}></div>
                <div className="font-medium text-sm">{coin.symbol}</div>
              </div>
              <div className="text-sm">Weight: {coin.price}</div>
            </div>
          ))}
          {coins.length === 0 && (
            <div className="text-center text-zinc-500 text-sm py-4">
              No coins found in this scan
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full w-full bg-zinc-900 shadow-lg p-2 rounded text-white">
      <h2 className="text-sm font-bold text-center mb-4">Strategy Scanner</h2>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="mb-2">
          <label className="block text-xs mb-1">Strategy</label>
          <StrategyButton 
            onStrategySelect={handleStrategySelect}
            selectedStrategy={selectedStrategy}
          />
        </div>

        <div>
          <label className="block text-xs mb-1">Timeframe</label>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="w-full p-[6px] rounded bg-zinc-800 text-white border border-zinc-500 text-sm"
          >
            {periods.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs mb-1">Target Candle</label>
          <select
            value={selectedOffset}
            onChange={(e) => setSelectedOffset(e.target.value)}
            className="w-full p-[6px] rounded bg-zinc-800 text-white border border-zinc-500 text-sm"
          >
            {candleOffsets.map((offset) => (
              <option key={offset} value={offset}>{offset}</option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <button
            onClick={() => setIsCoinModalOpen(true)}
            className="w-full bg-zinc-800 border border-gray-500 text-white pt-[7px] pb-[8px] rounded text-sm"
          >
            Add Coin
          </button>
          <StrategySiftModal isOpen={isCoinModalOpen} onClose={() => setIsCoinModalOpen(false)} />
        </div>
      </div>

      <button
        onClick={() => scan()}
        className="mb-3 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded text-sm transition"
      >
        Scan
      </button>

      <div className="border-t border-zinc-700 pt-2 flex flex-col">
        <div className="flex-1 overflow-hidden">
          <CoinList coins={longCoins} direction="LONG" />
        </div>
        <div className="flex-1 overflow-hidden mt-3 ">
          <CoinList coins={shortCoins} direction="SHORT" />
        </div>
      </div>
    </div>
  );
}
