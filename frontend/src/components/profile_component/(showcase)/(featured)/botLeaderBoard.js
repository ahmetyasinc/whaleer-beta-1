"use client";

import { useEffect, useState } from 'react';
import {
  FiChevronDown,
  FiTrendingUp,
  FiAward,
  FiActivity,
  FiZap,
  FiDollarSign,
  FiArrowUp,
  FiArrowDown
} from 'react-icons/fi';

const BotLeaderBoard = () => {
  const [sortBy, setSortBy] = useState('profit');
  const [sortOrder, setSortOrder] = useState('desc');
  const [setBots] = useState([]);
  const [loading, setLoading] = useState(true);


  const bots = [
    { id: 1, name: 'Bitcoin Master', creator: 'Ali Kaan Özdemir', profit: 12, successRate: 78, profitFactor: 1.45, weeklyTrades: 32, price: 299 },
    { id: 2, name: 'Scalping Pro', creator: 'Mehmet Yılmaz', profit: 98, successRate: 84, profitFactor: 1.7, weeklyTrades: 45, price: 450 },
    { id: 3, name: 'Altcoin Sniper', creator: 'Fatma Uçar', profit: 112, successRate: 81, profitFactor: 1.3, weeklyTrades: 28, price: 199 },
    { id: 4, name: 'Momentum AI', creator: 'Ahmet Demir', profit: 67, successRate: 76, profitFactor: 1.1, weeklyTrades: 15, price: 159 },
    { id: 5, name: 'Smart Grid', creator: 'Zeynep Yıldız', profit: 45, successRate: 79, profitFactor: 1.25, weeklyTrades: 21, price: 179 },
    { id: 6, name: 'Volume Hunter', creator: 'Ali Kaan Özdemir', profit: 133, successRate: 88, profitFactor: 1.9, weeklyTrades: 55, price: 399 },
    { id: 7, name: 'Dip Catcher', creator: 'Eren Bulut', profit: 29, successRate: 71, profitFactor: 1.05, weeklyTrades: 18, price: 149 },
    { id: 8, name: 'MACD Engine', creator: 'Buse Karaca', profit: 76, successRate: 82, profitFactor: 1.6, weeklyTrades: 31, price: 259 },
    { id: 9, name: 'SuperTrend Bot', creator: 'Can Ersoy', profit: 55, successRate: 77, profitFactor: 1.3, weeklyTrades: 25, price: 189 },
    { id: 10, name: 'QuickTradeX', creator: 'Mehmet Yılmaz', profit: 102, successRate: 86, profitFactor: 1.8, weeklyTrades: 42, price: 499 },
    { id: 11, name: 'Breakout Hunter', creator: 'Elif Çelik', profit: 83, successRate: 80, profitFactor: 1.42, weeklyTrades: 29, price: 215 },
    { id: 12, name: 'RiskManager', creator: 'Burak Ekinci', profit: 38, successRate: 74, profitFactor: 1.2, weeklyTrades: 17, price: 139 },
    { id: 13, name: 'ETH Surge', creator: 'Fatma Uçar', profit: 147, successRate: 89, profitFactor: 2.0, weeklyTrades: 61, price: 545 },
    { id: 14, name: 'ADA Scanner', creator: 'Ahmet Demir', profit: 59, successRate: 75, profitFactor: 1.15, weeklyTrades: 22, price: 169 },
    { id: 15, name: 'NightBot', creator: 'Yunus Özkan', profit: 35, successRate: 70, profitFactor: 1.1, weeklyTrades: 14, price: 129 },
    { id: 16, name: 'Trend Rider', creator: 'Cemile Ateş', profit: 90, successRate: 82, profitFactor: 1.6, weeklyTrades: 38, price: 289 },
    { id: 17, name: 'LunaRecovery', creator: 'Ali Kaan Özdemir', profit: 27, successRate: 68, profitFactor: 0.95, weeklyTrades: 10, price: 99 },
    { id: 18, name: 'Pivot Sniper', creator: 'Büşra Kılıç', profit: 71, successRate: 78, profitFactor: 1.3, weeklyTrades: 30, price: 209 },
    { id: 19, name: 'Swing Falcon', creator: 'Zeynep Yıldız', profit: 63, successRate: 76, profitFactor: 1.28, weeklyTrades: 26, price: 195 },
    { id: 20, name: 'ArbitrageX', creator: 'Eren Bulut', profit: 118, successRate: 85, profitFactor: 1.75, weeklyTrades: 47, price: 425 },
    { id: 21, name: 'CycleDetector', creator: 'Can Ersoy', profit: 81, successRate: 81, profitFactor: 1.5, weeklyTrades: 33, price: 245 },
    { id: 22, name: 'RSI Mage', creator: 'Cemile Ateş', profit: 56, successRate: 73, profitFactor: 1.12, weeklyTrades: 19, price: 155 },
    { id: 23, name: 'BollingerPilot', creator: 'Burak Ekinci', profit: 103, successRate: 87, profitFactor: 1.85, weeklyTrades: 50, price: 479 },
    { id: 24, name: 'Stoch Engine', creator: 'Yunus Özkan', profit: 48, successRate: 72, profitFactor: 1.18, weeklyTrades: 23, price: 165 },
    { id: 25, name: 'LongTerm Pro', creator: 'Elif Çelik', profit: 95, successRate: 79, profitFactor: 1.35, weeklyTrades: 35, price: 275 },
    { id: 26, name: 'ShortTerm X', creator: 'Mehmet Yılmaz', profit: 62, successRate: 74, profitFactor: 1.2, weeklyTrades: 24, price: 189 },
    { id: 27, name: 'KoinKoala', creator: 'Buse Karaca', profit: 41, successRate: 70, profitFactor: 1.05, weeklyTrades: 16, price: 145 },
    { id: 28, name: 'MemeTrend', creator: 'Ahmet Demir', profit: 33, successRate: 69, profitFactor: 0.92, weeklyTrades: 12, price: 109 },
    { id: 29, name: 'VelocityX', creator: 'Eren Bulut', profit: 110, successRate: 83, profitFactor: 1.72, weeklyTrades: 39, price: 325 },
    { id: 30, name: 'GridManager', creator: 'Fatma Uçar', profit: 77, successRate: 79, profitFactor: 1.4, weeklyTrades: 27, price: 199 }
  ];
  


  useEffect(() => {
    const fetchBots = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/bot-leaderboard?sortBy=${sortBy}&sortOrder=${sortOrder}`);
        const data = await response.json();
        setBots(data);
      } catch (error) {
        console.error('Failed to fetch bot data:', error);
      } finally {
        setLoading(false);
      }
    };

    //fetchBots();
  }, [sortBy, sortOrder]);

  const sortOptions = [
    { value: 'profit', label: 'By Profit', icon: FiTrendingUp },
    { value: 'successRate', label: 'By Success Rate', icon: FiAward },
    { value: 'profitFactor', label: 'By Profit Factor', icon: FiZap },
    { value: 'weeklyTrades', label: 'By Weekly Trades', icon: FiActivity },
    { value: 'price', label: 'By Price', icon: FiDollarSign }
  ];

  const sortOrderOptions = [
    { value: 'desc', label: 'Descending', icon: FiArrowDown },
    { value: 'asc', label: 'Ascending', icon: FiArrowUp }
  ];

  const sortedBots = [...bots].sort((a, b) => {
    if (sortOrder === 'desc') {
      return b[sortBy] - a[sortBy];
    } else {
      return a[sortBy] - b[sortBy];
    }
  });

  const formatValue = (value, type) => {
    switch (type) {
      case 'profit':
        return `%${value.toLocaleString()}`;
      case 'successRate':
        return `%${value}`;
      case 'profitFactor':
        return value.toFixed(2);
      case 'weeklyTrades':
        return `${value}`;
      case 'price':
        return `${value} $`;
      default:
        return value;
    }
  };

  const getRankColor = (index) => {
    if (index === 0) return 'from-yellow-400 to-orange-400';
    if (index === 1) return 'from-gray-300 to-gray-400';
    if (index === 2) return 'from-orange-400 to-red-400';
    return 'from-slate-500 to-slate-600';
  };

  return (
    <div className="bg-gradient-to-r from-gray-950 to-zinc-900 rounded-xl shadow-2xl p-6 h-[calc(100vh-140px)] border-1 border-slate-800 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-white bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          Bot Leaderboard
        </h2>
        <div className="flex items-center space-x-3">
          {/* Sort By Dropdown */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none bg-slate-800 border-1 border-slate-600 rounded-lg px-4 py-2 pr-8 text-sm font-medium text-slate-200 hover:border-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value} className="bg-slate-800 text-slate-200">
                  {option.label}
                </option>
              ))}
            </select>
            <FiChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Sort Order Dropdown */}
          <div className="relative">
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="appearance-none bg-slate-800 border-1 border-slate-600 rounded-lg px-4 py-2 pr-8 text-sm font-medium text-slate-200 hover:border-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
            >
              {sortOrderOptions.map((option) => (
                <option key={option.value} value={option.value} className="bg-slate-800 text-slate-200">
                  {option.label}
                </option>
              ))}
            </select>
            <FiChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Scrollable Bot List */}
      <div className="overflow-y-auto -mx-1 space-y-3 h-full pb-16 scrollbar-hide">
        {sortedBots.map((bot, index) => (
          <div
            key={bot.id}
            className="bg-slate-800/50 border-1 border-slate-700 rounded-lg py-2 px-3 hover:bg-slate-800/70 hover:border-slate-600 transition-all duration-200 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between">
              {/* Left - Bot Info */}
              <div className="flex items-center space-x-4">
                <div className={`flex items-center justify-center w-10 h-10 bg-gradient-to-br ${getRankColor(index)} rounded-full shadow-lg`}>
                  <span className="text-sm font-bold text-white">#{index + 1}</span>
                </div>
                <div className="pt-2">
                  <h3 className="font-semibold text-white text-base">
                    {bot.name.length > 13 ? `${bot.name.slice(0, 13)}...` : bot.name}
                  </h3>
                  <p className="text-[12px] text-slate-400">{bot.creator}</p>
                </div>
              </div>

              {/* Right - Metrics */}
              <div className="flex items-center space-x-8 text-sm">
                <div className="text-center">
                  <div className="font-bold text-green-400 text-base">{formatValue(bot.profit, 'profit')}</div>
                  <div className="text-xs text-slate-400">Profit</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-blue-400 text-base">{formatValue(bot.successRate, 'successRate')}</div>
                  <div className="text-xs text-slate-400">Success</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-purple-400 text-base">{formatValue(bot.profitFactor, 'profitFactor')}</div>
                  <div className="text-xs text-slate-400">Profit Factor</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-cyan-400 text-base">{formatValue(bot.weeklyTrades, 'weeklyTrades')}</div>
                  <div className="text-xs text-slate-400">Weekly Trades</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-yellow-400 text-base">{formatValue(bot.price, 'price')}</div>
                  <div className="text-xs text-slate-400">Price</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BotLeaderBoard;