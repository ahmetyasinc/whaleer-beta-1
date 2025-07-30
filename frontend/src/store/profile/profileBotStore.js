import { create } from "zustand";

const useProfileBotStore = create((set) => ({
  bots: [
    {
      id: "bot_1",
      name: "Bitcoin Master Bot",
      isActive: true,
      managedAmount: 152000, // yönettiği miktar USD
      totalTrades: 1247,
      winRate: "78.5",
    },
    {
      id: "bot_2",
      name: "Altcoin Hunter Pro Edition with Extra Long Name", // test için uzun isim
      isActive: false,
      managedAmount: 28750,
      totalTrades: 234,
      winRate: "65.2",
    },
    {
      id: "bot_3",
      name: "Scalping Pro",
      isActive: true,
      managedAmount: 99800,
      totalTrades: 2156,
      winRate: "82.3",
    },
  ],
}));

export default useProfileBotStore;
