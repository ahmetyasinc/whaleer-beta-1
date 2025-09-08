'use client';

import { useEffect, useState } from 'react';
import {
  FiChevronDown,
  FiTrendingUp,
  FiAward,
  FiCpu,
  FiShoppingCart,
  FiActivity
} from 'react-icons/fi';
import { useTranslation } from 'react-i18next';

const UserLeaderBoard = () => {
  const { t } = useTranslation('userLeaderBoard');

  const [sortBy, setSortBy] = useState('monthlyProfit');
  const [sortOrder, setSortOrder] = useState('desc');
  const [setUsers] = useState([]); // mevcut işlev korunuyor
  const [loading, setLoading] = useState(true);

  const users = [
    { id: 1, username: 'TradeMaster', monthlyProfit: 15.4, successRate: 85, totalBots: 12, soldBots: 8, monthlyTransactions: 324 },
    { id: 2, username: 'CryptoWizard', monthlyProfit: 12.8, successRate: 92, totalBots: 8, soldBots: 6, monthlyTransactions: 278 },
    { id: 3, username: 'BotCreator', monthlyProfit: 9.6, successRate: 78, totalBots: 15, soldBots: 12, monthlyTransactions: 456 },
    { id: 4, username: 'AlgoTrader', monthlyProfit: 8.7, successRate: 88, totalBots: 6, soldBots: 4, monthlyTransactions: 198 },
    { id: 5, username: 'SmartBot', monthlyProfit: 7.2, successRate: 81, totalBots: 10, soldBots: 7, monthlyTransactions: 312 },
    { id: 6, username: 'ProfitHunter', monthlyProfit: 13.3, successRate: 83, totalBots: 9, soldBots: 5, monthlyTransactions: 287 },
    { id: 7, username: 'DeepSignal', monthlyProfit: 11.1, successRate: 80, totalBots: 14, soldBots: 10, monthlyTransactions: 335 },
    { id: 8, username: 'ArbiBot', monthlyProfit: 10.5, successRate: 76, totalBots: 11, soldBots: 9, monthlyTransactions: 248 },
    { id: 9, username: 'GridKing', monthlyProfit: 6.4, successRate: 74, totalBots: 7, soldBots: 3, monthlyTransactions: 174 },
    { id: 10, username: 'TrendSeeker', monthlyProfit: 14.1, successRate: 89, totalBots: 13, soldBots: 11, monthlyTransactions: 402 }
  ];

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch(`/api/leaderboard?sortBy=${sortBy}&sortOrder=${sortOrder}`);
        const data = await res.json();
        setUsers(data);
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch users:', err);
        setLoading(false);
      }
    };

    // fetchUsers(); // mevcut davranış korunuyor (yorumlu)
  }, [sortBy, sortOrder, setUsers]);

  const sortOptions = [
    { value: 'monthlyProfit', label: t('sort.byMonthlyProfit'), icon: FiTrendingUp },
    { value: 'successRate', label: t('sort.bySuccessRate'), icon: FiAward },
    { value: 'totalBots', label: t('sort.byTotalBots'), icon: FiCpu },
    { value: 'soldBots', label: t('sort.bySoldBots'), icon: FiShoppingCart },
    { value: 'monthlyTransactions', label: t('sort.byMonthlyTransactions'), icon: FiActivity }
  ];

  const sortOrderOptions = [
    { value: 'desc', label: t('sortOrder.desc') },
    { value: 'asc', label: t('sortOrder.asc') }
  ];

  const sortedUsers = [...users].sort((a, b) => {
    if (sortOrder === 'desc') {
      return b[sortBy] - a[sortBy];
    } else {
      return a[sortBy] - b[sortBy];
    }
  });

  const formatValue = (value, type) => {
    switch (type) {
      case 'monthlyProfit':
        return `%${value.toFixed(1)}`;
      case 'successRate':
        return `%${value}`;
      default:
        return value.toLocaleString();
    }
  };

  const getRankColor = (index) => {
    if (index === 0) return 'from-yellow-400 to-orange-400';
    if (index === 1) return 'from-gray-300 to-gray-400';
    if (index === 2) return 'from-orange-400 to-red-400';
    return 'from-slate-500 to-slate-600';
  };

  return (
    <div className="bg-gradient-to-r from-gray-950 to-zinc-900 rounded-lg shadow-2xl p-6 h-[calc(100vh-140px)] border border-slate-700 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-white bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          {t('title')}
        </h2>

        {/* Dropdowns */}
        <div className="flex items-center space-x-3">
          {/* Sort Criteria Dropdown */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 pr-8 text-sm font-medium text-slate-200 hover:border-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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
              className="appearance-none bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 pr-8 text-sm font-medium text-slate-200 hover:border-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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

      {/* User Cards - Scrollable */}
      <div className="overflow-y-auto -mx-1 space-y-3 h-full pb-16 scrollbar-hide">
        {sortedUsers.map((user, index) => (
          <div key={user.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 hover:bg-slate-800/70 hover:border-slate-600 transition-all duration-200 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              {/* Left side */}
              <div className="flex items-center space-x-4">
                <div className={`flex items-center justify-center w-10 h-10 bg-gradient-to-br ${getRankColor(index)} rounded-full shadow-lg`}>
                  <span className="text-sm font-bold text-white">#{index + 1}</span>
                </div>
                <div>
                  <h3 className="font-semibold text-white text-base">{user.username}</h3>
                </div>
              </div>

              {/* Right side */}
              <div className="flex items-center space-x-8 text-sm">
                <div className="text-center">
                  <div className="font-bold text-green-400 text-base">
                    {formatValue(user.monthlyProfit, 'monthlyProfit')}
                  </div>
                  <div className="text-xs text-slate-400">{t('cards.monthlyProfit')}</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-blue-400 text-base">
                    {formatValue(user.successRate, 'successRate')}
                  </div>
                  <div className="text-xs text-slate-400">{t('cards.success')}</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-purple-400 text-base">
                    {formatValue(user.totalBots)}
                  </div>
                  <div className="text-xs text-slate-400">{t('cards.bots')}</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-orange-400 text-base">
                    {formatValue(user.soldBots)}
                  </div>
                  <div className="text-xs text-slate-400">{t('cards.sales')}</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-cyan-400 text-base">
                    {formatValue(user.monthlyTransactions)}
                  </div>
                  <div className="text-xs text-slate-400">{t('cards.monthlyTrades')}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserLeaderBoard;
