import { create } from 'zustand';

export const useBotStore = create((set) => ({
  bots: [],
  addBot: (bot) => set((state) => ({ bots: [...state.bots, bot] })),
  removeBot: (id) => set((state) => ({ bots: state.bots.filter((bot) => bot.id !== id) })),
  updateBot: (updatedBot) =>
    set((state) => ({
      bots: state.bots.map((bot) =>
        bot.id === updatedBot.id ? { ...bot, ...updatedBot } : bot
      ),
    })),
  toggleBotActive: (id) =>
    set((state) => ({
      bots: state.bots.map((bot) =>
        bot.id === id ? { ...bot, isActive: !bot.isActive } : bot
      ),
    })),
  setBots: (newBots) => set(() => ({ bots: newBots })),
}));
