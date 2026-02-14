"use client";

import { useState, useEffect, forwardRef, useImperativeHandle, useRef } from "react";
import api from "@/api/axios";
import { BsPinAngle, BsPinAngleFill } from "react-icons/bs";
import { FiSearch } from "react-icons/fi";
import { IoAddCircleOutline } from "react-icons/io5";
import useCryptoStore from "@/store/indicator/cryptoPinStore";
import useWatchListStore from "@/store/indicator/watchListStore";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";

// axios.defaults.withCredentials = true;

const CryptoRow = ({ crypto, handleSelectCrypto, toggleWatch, isInWatchlist, handlePinToggle, pinned }) => {
  const [imgError, setImgError] = useState(false);


  return (
    <div
      className="mx-0 my-[1px] py-[8px] pl-5 pr-4 hover:bg-zinc-900 active:bg-zinc-750 cursor-pointer rounded-lg flex items-center justify-between transition-all duration-0 group border border-transparent hover:border-zinc-700"
      onClick={() => handleSelectCrypto(crypto)}
    >
      {/* SOL TARAF: İkon ve İsim Bilgisi */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Kripto İkonu */}
        <div className="w-[50px] h-[50px] bg-transparent flex-shrink-0 overflow-hidden flex items-center justify-center relative">
          {!imgError ? (
            <>
              <img
                src={`/crypto-icons/${crypto.symbol.toLowerCase()}.svg`}
                alt={crypto.name}
                className={`w-full h-full object-contain p-2 transition-opacity duration-200 ${imgError ? 'opacity-0' : 'opacity-100'}`}
                onError={() => {
                  setImgError(true);
                }}
                loading="lazy"
              />
            </>
          ) : (
            <span className="text-[18px] text-zinc-500">{crypto.symbol[0]}</span>
          )}
        </div>

        {/* İsim ve Sembol (Taşmayı önlemek için truncate eklendi) */}
        <div className="flex flex-col min-w-0">
          <span className="font-medium text-zinc-200 group-hover:text-white transition-colors truncate">
            {crypto.name}
          </span>
          <span className="text-zinc-500 text-xs font-normal">
            {crypto.symbol} <span className="text-zinc-600">[{crypto.market_type === 'spot' ? 'S' : 'F'}]</span>
          </span>
        </div>
      </div>

      {/* SAĞ TARAF: İşlem Butonları */}
      <div className="flex items-center gap-1 flex-shrink-0 ml-2">
        {/* İzleme listesine ekle / çıkar */}
        <button
          type="button"
          className="p-1.5 rounded-2xl border border-transparent hover:scale-110 transition-all"
          onClick={(e) => {
            e.stopPropagation();
            toggleWatch(crypto.id);
          }}
        >
          <IoAddCircleOutline
            className={`text-xl transition-colors ${isInWatchlist(crypto.id)
              ? "text-emerald-400"
              : "text-zinc-500 group-hover:text-zinc-300"
              }`}
          />
        </button>

        {/* Pin butonu */}
        <button
          type="button"
          className="p-1.5 rounded-2xl border border-transparent hover:scale-110 transition-all"
          onClick={(e) => {
            e.stopPropagation();
            handlePinToggle(crypto);
          }}
        >
          {pinned.some((p) => p.id === crypto.id) ? (
            <BsPinAngleFill className="text-red-500 text-lg" />
          ) : (
            <BsPinAngle className="text-zinc-500 group-hover:text-zinc-300 text-lg" />
          )}
        </button>
      </div>
    </div>
  );
};

const CryptoSelectButton = forwardRef(({ locale, shortcutTitle }, ref) => {
  const { t } = useTranslation("indicator");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [cryptosList, setCryptosList] = useState([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [visibleCount, setVisibleCount] = useState(20); // Progressive rendering initial count
  const {
    pinned,
    togglePinned,
    selectedCrypto,
    setSelectedCrypto,
    setPinned,
  } = useCryptoStore();

  const { watchlist, toggleWatch } = useWatchListStore();
  const [imgError, setImgError] = useState(false);
  const [areIconsLoaded, setAreIconsLoaded] = useState(false); // New state for loading tracking

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
            market_type: coin.market_type, // Add market_type
          }));

          const pinnedCoins = response.data.coins
            .filter((coin) => coin.pinned)
            .map((coin) => ({
              id: coin.id,
              name: coin.name,
              symbol: coin.symbol,
              binance_symbol: coin.binance_symbol,
              tick_size: coin.tick_size,
              market_type: coin.market_type,
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
    baseList = sortedCryptos.filter((c) => c.market_type === 'spot');
  } else if (activeFilter === "futures") {
    baseList = sortedCryptos.filter((c) => c.market_type === 'futures');
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

  // Progressive rendering logic
  useEffect(() => {
    if (isModalOpen) {
      // Reset view when modal opens or filter changes
      setVisibleCount(20);
      setAreIconsLoaded(false); // Reset loading state
    }
  }, [isModalOpen, searchTerm, activeFilter]);

  // Image preloading logic for the initial batch
  useEffect(() => {
    if (isModalOpen && !areIconsLoaded && filteredCryptos.length > 0) {
      const initialBatch = filteredCryptos.slice(0, 20); // Preload first 20 items
      const imagePromises = initialBatch.map((crypto) => {
        return new Promise((resolve) => {
          const img = new Image();
          img.src = `/crypto-icons/${crypto.symbol.toLowerCase()}.svg`;
          img.onload = resolve;
          img.onerror = resolve; // Resolve even on error to avoid blocking
        });
      });

      Promise.all(imagePromises).then(() => {
        setAreIconsLoaded(true);
      });
    } else if (isModalOpen && filteredCryptos.length === 0) {
      // If no items, consider loaded
      setAreIconsLoaded(true);
    }
  }, [isModalOpen, filteredCryptos, areIconsLoaded]);

  useEffect(() => {
    if (isModalOpen && visibleCount < filteredCryptos.length) {
      const timeout = setTimeout(() => {
        setVisibleCount((prev) => Math.min(prev + 50, filteredCryptos.length));
      }, 50);
      return () => clearTimeout(timeout);
    }
  }, [isModalOpen, visibleCount, filteredCryptos.length]);

  const displayedCryptos = filteredCryptos.slice(0, visibleCount);

  const isInWatchlist = (id) => watchSet.has(id);

  // Expose openModal to parent via ref
  useImperativeHandle(ref, () => ({
    openModal: () => setIsModalOpen(true)
  }));

  return (
    <>
      {/* Kripto Seçim Butonu */}
      <button
        className="px-2 ml-1 flex items-center w-[230px] h-[40px] rounded bg-black border border-gray-800 hover:border-gray-600 transition duration-100 text-gray-200 overflow-hidden text-ellipsis whitespace-nowrap"
        onClick={() => setIsModalOpen(true)}
        title={shortcutTitle}
      >
        <span className="ml-1 flex items-center gap-2 overflow-hidden">
          {selectedCrypto ? (
            <>
              <div className="w-7 h-7 mr-1 rounded-full bg-zinc-800 flex-shrink-0 overflow-hidden border border-zinc-700/50 flex items-center justify-center">
                {!imgError ? (
                  <img
                    src={`/crypto-icons/${selectedCrypto.symbol.toLowerCase()}.svg`}
                    alt={selectedCrypto.name}
                    className="w-full h-full object-contain p-0.5 scale-110"
                    onError={() => setImgError(true)}
                    loading="eager"
                  />
                ) : (
                  <span className="text-[8px] text-zinc-500">{selectedCrypto.symbol[0]}</span>
                )}
              </div>
              <span className="truncate">
                {selectedCrypto.name} <span className="text-zinc-500">({selectedCrypto.symbol})</span>
              </span>
              <span
                className={`text-[10px] px-1.5 mt-0.5 ml-1 py-0.5 rounded border leading-none ${selectedCrypto.market_type === "futures"
                  ? "border-blue-900 text-blue-400 bg-blue-900/20"
                  : "border-amber-900 text-amber-400 bg-amber-900/20"
                  }`}
              >
                {selectedCrypto.market_type === "futures" ? t("typeFutures") : t("typeSpot")}
              </span>
            </>
          ) : (
            t("cryptoSelect")
          )}
        </span>
      </button>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/20 z-50 animate-in fade-in duration-200">
          <div className="bg-zinc-950 text-white rounded-xl p-6 w-[700px] h-[calc(100vh-36px)] shadow-2xl border border-zinc-800 flex flex-col relative">
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
                className="w-full pr-10 px-4 py-3 rounded-3xl bg-zinc-900 text-white border border-zinc-800 
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
                  {t("all")}
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
                  {t("spot")}
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
                  {t("swap")}
                </button>

                {/* Futures */}
                <button
                  type="button"
                  onClick={() => setActiveFilter("futures")}
                  className={`px-3 py-1.5 rounded-full border transition-colors ${activeFilter === "futures"
                    ? "bg-zinc-800 border-zinc-500 text-zinc-100"
                    : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500"
                    }`}
                >
                  {t("futures")}
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
                  {t("watchlist")}
                </button>
              </div>

              {/* Çizgi sağda */}
              <div className="flex-1 h-px bg-zinc-800 ml-4" />

              {/* Sonuç Sayısı (En sağda) */}
              <span className="text-[11px] text-zinc-500 ml-4 whitespace-nowrap">
                {t("resultCount", { count: filteredCryptos.length })}
              </span>
            </div>


            {/* Kripto Listesi */}
            <div className="flex-grow overflow-y-auto pl-0 ml-0 custom-scrollbar relative">
              {!areIconsLoaded ? (
                // Global Loader
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 z-10">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-2 border-zinc-600 border-t-zinc-400 rounded-full animate-spin"></div>
                    <span className="text-zinc-500 text-sm">{t("loading")}</span>
                  </div>
                </div>
              ) : (
                <>
                  {displayedCryptos.length > 0 ? (
                    <div className="flex flex-col animate-in fade-in duration-300">
                      {displayedCryptos.map((crypto, index) => (
                        <CryptoRow
                          key={crypto.id}
                          crypto={crypto}
                          handleSelectCrypto={handleSelectCrypto}
                          toggleWatch={toggleWatch}
                          isInWatchlist={isInWatchlist}
                          handlePinToggle={handlePinToggle}
                          pinned={pinned}
                        />
                      ))}
                      {/* Show simple loader at bottom if still loading more items */}
                      {visibleCount < filteredCryptos.length && (
                        <div className="py-4 text-center text-zinc-600 text-xs">
                          Loading more...
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-center text-zinc-500 mt-8">
                      {activeFilter === "watchlist" ? t("emptyWatchlist") : t("noMatch")}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
});

export default CryptoSelectButton;
/*

---->  BU COİNLERİN İKONLARI TRADİNGDEN ALINDI --> (ilerde telif hakkı gote girebilir)

mav, cyber, iq, vanry, aeur, juv, psg, og, asr
acm, bar, city, qi, porto, santos, high, syn, mav, cyber
iq, ntrn, vanry, aeur, nfp, dym, pixel, portal, tnsr, saga
rez, bb, not, io, zk, lista, zro, g, banana, euri, neiro
turbo, scr, bnsol, lumia, kaia, cow, pnut, usual, the, move
me, velodrome, pengu, bio, d, aixbt, cookie, s, solv, trump
layer, hei, kaito, Shell, red, epic, bmt, form, nil, mubarak
tut, broccoli714, bananas31, baby, wct, hyper, init, sign, sto
syrup, kmno, sxt, nxpc, awe, huma, a, soph, resolv, spk, newt
sahara, era, c, tree, a2z, towns, prove, bfusd, dolo, mito
wlfi, somi, open, usde, holo, pump, avnt, zkc, sky, bard, xpl
mira, eden, nom, 2z, morpho, aster, wal, enso, yb, zbt, turtle
giggle, f, kite, mmt, sapien, allo, bank, met, at, u, rlusd

 */
