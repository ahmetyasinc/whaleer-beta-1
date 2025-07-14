// src/store/botDropdownSearchStore.js
import { create } from 'zustand';

const mockBots = [
  {
    id: 'bot_1',
    name: 'Bitcoin Master',
    creator: 'crypto_ali',
    weeklyProfit: 4.3,
    monthlyProfit: 11.2,
    winRate: 78.4
  },
  {
    id: 'bot_2',
    name: 'Altcoin Sniper',
    creator: 'trader_mehmet',
    weeklyProfit: -1.5,
    monthlyProfit: 3.8,
    winRate: 66.1
  },
  {
    id: 'bot_3',
    name: 'Scalping Beast',
    creator: 'fastbot_ahmet',
    weeklyProfit: 6.2,
    monthlyProfit: 14.7,
    winRate: 81.9
  },
  {
    id: 'bot_4',
    name: 'ETH Swinger',
    creator: 'eth_guru',
    weeklyProfit: 2.1,
    monthlyProfit: -0.8,
    winRate: 74.3
  },
  {
    id: 'bot_5',
    name: 'Luna Recovery',
    creator: 'moon_strategist',
    weeklyProfit: -3.4,
    monthlyProfit: -7.1,
    winRate: 42.8
  },
  {
    id: 'bot_6',
    name: 'DOT Scalper',
    creator: 'dot_io',
    weeklyProfit: 1.5,
    monthlyProfit: 5.0,
    winRate: 60.2
  },
  {
    id: 'bot_7',
    name: 'ADA Hunter',
    creator: 'cardano_club',
    weeklyProfit: 0.0,
    monthlyProfit: 2.6,
    winRate: 58.9
  },
  {
    id: 'bot_8',
    name: 'XRP Shield',
    creator: 'ripplex_dev',
    weeklyProfit: 3.3,
    monthlyProfit: 0.4,
    winRate: 69.5
  },
  {
    id: 'bot_9',
    name: 'AVAX Rebound',
    creator: 'avalanche_baba',
    weeklyProfit: -0.9,
    monthlyProfit: 6.1,
    winRate: 71.0
  },
  {
    id: 'bot_10',
    name: 'MATIC Trend',
    creator: 'polygon_max',
    weeklyProfit: 5.9,
    monthlyProfit: 13.2,
    winRate: 84.6
  }
];


const useBotDropdownSearchStore = create((set) => ({
  allBots: [],
  filteredBots: [],
  searchQuery: '',

  loadBots: () => set({
    allBots: mockBots,
    filteredBots: mockBots
  }),

  setSearchQuery: (query) =>
    set((state) => {
      const lower = query.toLowerCase();
      return {
        searchQuery: query,
        filteredBots: state.allBots.filter(
          (bot) =>
            bot.name.toLowerCase().includes(lower) ||
            bot.creator.toLowerCase().includes(lower)
        )
      };
    })
}));

export default useBotDropdownSearchStore;
