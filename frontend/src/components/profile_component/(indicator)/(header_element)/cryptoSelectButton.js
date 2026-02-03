"use client";

import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import api from "@/api/axios";
import { IoMdSearch } from "react-icons/io";
import { BsPinAngle, BsPinAngleFill } from "react-icons/bs";
import { FiSearch } from "react-icons/fi";
import { IoAddCircleOutline } from "react-icons/io5";
import useCryptoStore from "@/store/indicator/cryptoPinStore";
import useWatchListStore from "@/store/indicator/watchListStore";
import { useTranslation } from "react-i18next";

import i18n from "@/i18n";

// axios.defaults.withCredentials = true;

const CryptoSelectButton = forwardRef(({ locale, shortcutTitle }, ref) => {
  const { t } = useTranslation("indicator");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [cryptosList, setCryptosList] = useState([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const {
    pinned,
    togglePinned,
    selectedCrypto,
    setSelectedCrypto,
    setPinned,
  } = useCryptoStore();

  const { watchlist, toggleWatch } = useWatchListStore();

  useEffect(() => {
    if (locale && i18n.language !== locale) {
      i18n.changeLanguage(locale);
    }
  }, [locale]);

  // API'den coin listesini çek
  useEffect(() => {
    const fetchCoins = async () => {
      try {
        const response = await api.get("/get-coin-list/");

        if (response.data && response.data.coins) {
          const coins = response.data.coins.map((coin) => ({
            id: coin.id,
            name: coin.name,
            symbol: coin.symbol,
            binance_symbol: coin.binance_symbol,
            tick_size: coin.tick_size,
          }));

          const pinnedCoins = response.data.coins
            .filter((coin) => coin.pinned)
            .map((coin) => ({
              id: coin.id,
              name: coin.name,
              symbol: coin.symbol,
              binance_symbol: coin.binance_symbol,
              tick_size: coin.tick_size,
            }));

          setCryptosList(coins);
          setPinned(pinnedCoins);

          useCryptoStore.getState().setCoins(coins);
        }
      } catch (error) {
        console.error("Coin listesini çekerken hata oluştu:", error);
      }
    };

    fetchCoins();
  }, []);

  // API'ye pinleme durumunu gönder
  const handlePinToggle = async (crypto) => {
    if (pinned.some((p) => p.id === crypto.id)) {
      await handleUnpin(crypto);
    } else {
      togglePinned(crypto);

      try {
        await api.post("/pin-binance_coin/", { coin_id: crypto.id });
      } catch (error) {
        console.error("Pinleme işlemi sırasında hata oluştu:", error);
      }
    }
  };

  const handleUnpin = async (crypto) => {
    togglePinned(crypto);

    try {
      await api.delete("/unpin-binance-coin/", {
        data: { coin_id: crypto.id },
      });
    } catch (error) {
      console.error("Pin kaldırma işlemi sırasında hata oluştu:", error);
    }
  };

  // pinned'leri başa al
  const pinnedSet = new Set(pinned.map((p) => p.id));
  const sortedCryptos = [
    ...pinned,
    ...cryptosList.filter((c) => !pinnedSet.has(c.id)),
  ];

  // watchlist filtresi
  const watchSet = new Set(watchlist);

  let baseList = sortedCryptos;

  if (activeFilter === "watchlist") {
    baseList = sortedCryptos.filter((c) => watchSet.has(c.id));
  } else if (activeFilter === "spot") {
    // TODO: spot coin filter
    baseList = []; // şimdilik boş
  } else if (activeFilter === "takas") {
    // TODO: takas coin filter
    baseList = []; // şimdilik boş
  } else {
    // "all"
    baseList = sortedCryptos;
  }


  // Aramaya göre filtreleme
  const filteredCryptos = baseList.filter(
    (crypto) =>
      crypto.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      crypto.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectCrypto = (crypto) => {
    setSelectedCrypto(crypto);
    setIsModalOpen(false);
  };

  const isInWatchlist = (id) => watchSet.has(id);

  // Expose openModal to parent via ref
  useImperativeHandle(ref, () => ({
    openModal: () => setIsModalOpen(true)
  }));

  return (
    <>
      {/* Kripto Seçim Butonu */}
      <button
        className="pl-4 ml-2 flex items-center w-[230px] h-[40px] rounded bg-black border border-gray-800 hover:border-gray-600 transition duration-100 text-gray-200 overflow-hidden text-ellipsis whitespace-nowrap"
        onClick={() => setIsModalOpen(true)}
        title={shortcutTitle}
      >
        <IoMdSearch className="text-[19px] mr-2" />
        <span className="ml-3">
          {selectedCrypto
            ? `${selectedCrypto.name} (${selectedCrypto.symbol})`
            : "Kripto seçin"}
        </span>
      </button>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 animate-in fade-in duration-200">
          <div className="bg-zinc-900 text-white rounded-xl p-6 w-[700px] h-[calc(100vh-36px)] shadow-2xl border border-zinc-800 flex flex-col relative">
            {/* Çarpı Kapat Butonu */}
            <button
              className="absolute top-4 right-5 text-zinc-500 hover:text-white hover:rotate-90 transition-all duration-200 text-3xl font-light"
              onClick={() => setIsModalOpen(false)}
            >
              &times;
            </button>

            <h2 className="text-lg font-bold mb-4 text-zinc-200 tracking-tight">
              {t("titleCrypto")}
            </h2>

            {/* Arama Çubuğu */}
            <div className="relative w-4/5 ml-16 mb-3">
              <input
                type="text"
                placeholder={t("searchCrypto")}
                className="w-full pr-10 px-4 py-3 rounded-3xl bg-zinc-950 text-white border border-zinc-800 
                           focus:outline-none focus:border-zinc-600 focus:ring-2 focus:ring-zinc-700/50 
                           transition-all duration-200 placeholder:text-zinc-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />

              <FiSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xl pointer-events-none" />
            </div>


            {/* Çizgi + Filtre Butonları */}
            <div className="w-4/5 ml-16 mb-4 flex items-center">
              {/* Butonlar solda */}
              <div className="flex items-center gap-2 text-xs">
                {/* Tümü */}
                <button
                  type="button"
                  onClick={() => setActiveFilter("all")}
                  className={`px-3 py-1.5 rounded-full border transition-colors ${activeFilter === "all"
                    ? "bg-zinc-800 border-zinc-500 text-zinc-100"
                    : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500"
                    }`}
                >
                  {t("all", { defaultValue: "Tümü" })}
                </button>

                {/* Spot */}
                <button
                  type="button"
                  onClick={() => setActiveFilter("spot")}
                  className={`px-3 py-1.5 rounded-full border transition-colors ${activeFilter === "spot"
                    ? "bg-zinc-800 border-zinc-500 text-zinc-100"
                    : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500"
                    }`}
                >
                  {t("spot", { defaultValue: "Spot" })}
                </button>

                {/* Takas */}
                <button
                  type="button"
                  onClick={() => setActiveFilter("takas")}
                  className={`px-3 py-1.5 rounded-full border transition-colors ${activeFilter === "takas"
                    ? "bg-zinc-800 border-zinc-500 text-zinc-100"
                    : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500"
                    }`}
                >
                  {t("swap", { defaultValue: "Takas" })}
                </button>

                {/* Watchlist */}
                <button
                  type="button"
                  onClick={() => setActiveFilter("watchlist")}
                  className={`px-3 py-1.5 rounded-full border transition-colors ${activeFilter === "watchlist"
                    ? "bg-zinc-800 border-zinc-500 text-zinc-100"
                    : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500"
                    }`}
                >
                  {t("watchlist", { defaultValue: "Watchlist" })}
                </button>
              </div>

              {/* Çizgi sağda */}
              <div className="flex-1 h-px bg-zinc-800 ml-4" />
            </div>

            {/* Kripto Listesi */}
            <div className="flex-grow overflow-y-auto pl-0 ml-0 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-900">
              {filteredCryptos.length > 0 ? (
                <ul className="pl-0 ml-0 space-y-1">
                  {filteredCryptos.map((crypto) => (
                    <li
                      key={crypto.id}
                      className="py-[10px] pl-5 pr-4 hover:bg-zinc-800 active:bg-zinc-750 cursor-pointer rounded-lg flex items-center justify-between transition-all duration-0 group border border-transparent hover:border-zinc-700"
                      onClick={() => handleSelectCrypto(crypto)}
                    >
                      <span className="font-medium text-zinc-200 group-hover:text-white transition-colors">
                        {`${crypto.name} `}
                        <span className="text-zinc-500 text-sm font-normal">
                          ({crypto.symbol})
                        </span>
                      </span>

                      <div className="flex items-center gap-1">
                        {/* İzleme listesine ekle / çıkar */}
                        <button
                          type="button"
                          className="p-1 rounded-2xl border border-transparent hover:scale-[1.1] transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleWatch(crypto.id);
                          }}
                        >
                          <IoAddCircleOutline
                            className={`text-lg transition-colors ${isInWatchlist(crypto.id)
                              ? "text-emerald-400"
                              : "text-zinc-500 group-hover:text-zinc-300"
                              }`}
                          />
                        </button>

                        {/* Pin butonu */}
                        <button
                          type="button"
                          className="p-1 rounded-2xl border border-transparent hover:scale-[1.1] transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePinToggle(crypto);
                          }}
                        >
                          {pinned.some((p) => p.id === crypto.id) ? (
                            <BsPinAngleFill className="text-red-500 group-hover:scale-110 transition-transform" />
                          ) : (
                            <BsPinAngle className="text-zinc-500 group-hover:text-zinc-300 transition-colors" />
                          )}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-center text-zinc-500 mt-8">
                  {activeFilter === "watchlist"
                    ? t("emptyWatchlist", {
                      defaultValue: "İzleme listesi boş.(Klavye yön tuşları ile geçiş yapabilirsiniz.)",
                    })
                    : t("noMatch", { defaultValue: "Eşleşen öğe yok" })}
                </p>
              )}
            </div>

          </div>
        </div>
      )}
    </>
  );
});

export default CryptoSelectButton;
