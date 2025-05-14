"use client";
import { useBotStore } from "@/store/bot/botStore";

export default function BotCard() {
  const bots = useBotStore((state) => state.bots);

  return (
    <div className="w-1/3 h-full flex flex-col overflow-hidden pl-2">
      <div className="bg-zinc-900 rounded-lg pr-3 shadow-lg text-white w-full flex flex-col h-full">
        <div className="sticky top-0 bg-zinc-900 px-4 py-3 border-b border-zinc-800">
          <h2 className="text-lg font-semibold">Botlarım</h2>
        </div>

        <div className="p-3 overflow-y-auto flex-1">
          {bots.length > 0 ? (
            <div className="grid gap-2">
              {bots.map((bot, index) => (
                <div
                  key={bot.id || index}
                  className="bg-zinc-800 rounded-lg p-3 hover:bg-zinc-700 transition-all duration-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium pt-2">{bot.name}</h3>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center justify-center ${
                          bot.isActive ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"
                        }`}
                      >
                        {bot.isActive ? "Aktif" : "Duraklatıldı"}
                      </span>
                    </div>
                    <span className="text-sm text-[hsl(0,0%,51%)]">Kar/Zarar:</span>
                    <span
                      className={`text-sm font-medium ${
                        bot.profit >= 0 ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {bot.profit >= 0 ? "+" : ""}${Math.abs(bot.profit).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-zinc-500">Henüz kayıtlı bot yok.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}