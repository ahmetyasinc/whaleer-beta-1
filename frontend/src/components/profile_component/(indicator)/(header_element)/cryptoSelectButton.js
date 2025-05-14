"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { IoMdSearch } from "react-icons/io";
import { BsPinAngle, BsPinAngleFill } from "react-icons/bs";
import useCryptoStore from "@/store/indicator/cryptoPinStore"; // Zustand Store'u import et

axios.defaults.withCredentials = true; // Tüm axios isteklerinde cookie'yi göndermeyi etkinleştir

const CryptoSelectButton = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [cryptosList, setCryptosList] = useState([]);

  const { pinned, togglePinned, selectedCrypto, setSelectedCrypto, setPinned } = useCryptoStore(); // Zustand state'ini kullan

  // API'den coin listesini çek
  useEffect(() => {
    const fetchCoins = async () => {
      try {
        const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/get-coin-list/`);

        if (response.data && response.data.coins) {
          const coins = response.data.coins.map(coin => ({
            id: coin.id, 
            name: coin.name, 
            symbol: coin.symbol,
            binance_symbol: coin.binance_symbol
          }));

          // Zustand store'un pinned listesini güncelle
          const pinnedCoins = response.data.coins
            .filter(coin => coin.pinned) // pinned: true olanları seç
            .map(coin => ({
              id: coin.id,
              name: coin.name,
              symbol: coin.symbol,
              binance_symbol: coin.binance_symbol
            }));
          
          setCryptosList(coins);
          setPinned(pinnedCoins); // Zustand store'daki pinned listesini güncelle

          // Zustand store'un coins listesini güncelle
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
      // Eğer zaten pinlenmişse, unpin fonksiyonunu çağır
      await handleUnpin(crypto);
    } else {
      // Değilse, pinleme işlemi yap
      togglePinned(crypto); // Zustand'da güncelle
  
      try {
        const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/pin-binance_coin/`, {
          coin_id: crypto.id,
        });
        console.log("Pinleme işlemi başarılı:", response.data);
      } catch (error) {
        console.error("Pinleme işlemi sırasında hata oluştu:", error);
      }
    }
  };

  const handleUnpin = async (crypto) => {
    togglePinned(crypto); // Zustand'da güncelle
  
    try {
      const response = await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/unpin-binance-coin/`, {
        data: { coin_id: crypto.id }, // DELETE isteği için `data` içinde gönderiyoruz
      });
      console.log("Pin kaldırma işlemi başarılı:", response.data);
    } catch (error) {
      console.error("Pin kaldırma işlemi sırasında hata oluştu:", error);
    }
  };
  

  // Kriptoları sıralama (pinned olanlar başa gelecek)
  const pinnedSet = new Set(pinned.map(p => p.id)); // Pinned coinlerin ID'lerini Set içine al
  const sortedCryptos = [
    ...pinned, 
    ...cryptosList.filter(c => !pinnedSet.has(c.id)) // Eğer pinned içinde varsa ekleme
  ];

  // Aramaya göre filtreleme
  const filteredCryptos = sortedCryptos.filter(crypto =>
    crypto.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    crypto.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );
  

  return (
    <>
      {/* Kripto Seçim Butonu */}
      <button
        className="pl-4 ml-2 flex items-center w-[200px] h-[40px] rounded bg-gray-950 hover:bg-gray-900 text-white overflow-hidden text-ellipsis whitespace-nowrap"
        onClick={() => setIsModalOpen(true)}
      >
        <IoMdSearch className="text-[19px] mr-2" />
        <span className="ml-3">
          {selectedCrypto ? `${selectedCrypto.name} (${selectedCrypto.symbol})` : "Kripto seçin"}
        </span>
      </button>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-gray-900 text-white rounded-[2px] p-6 w-[500px] h-[550px] shadow-lg flex flex-col relative">
            {/* Çarpı Kapat Butonu */}
            <button
              className="absolute top-2 right-4 text-gray-400 hover:text-white text-3xl"
              onClick={() => setIsModalOpen(false)}
            >
              &times;
            </button>

            <h2 className="text-lg font-bold mb-4">Kripto Para Seç</h2>

            {/* Arama Çubuğu */}
            <input
              type="text"
              placeholder="Kripto ara..."
              className="w-full px-3 py-2 rounded bg-gray-800 text-white mb-3 focus:outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            {/* Kripto Listesi */}
            <div className="flex-grow overflow-y-auto pl-0 ml-0">
              {filteredCryptos.length > 0 ? (
                <ul className="pl-0 ml-0">
                  {filteredCryptos.map((crypto) => (
                    <li
                      key={crypto.id}
                      className="py-2 pl-12 pr-4 hover:bg-gray-700 cursor-pointer rounded-sm flex items-center justify-between"
                      onClick={() => {
                        setSelectedCrypto(crypto); // Zustand state'ini güncelle
                        setIsModalOpen(false);
                      }}
                    >
                      {`${crypto.name} (${crypto.symbol})`}
                      <button onClick={(e) => {
                        e.stopPropagation(); // Listeyi kapatmamak için
                        handlePinToggle(crypto);
                      }}>
                        {pinned.includes(crypto) ? (
                          <BsPinAngleFill className="text-red-700" />
                        ) : (
                          <BsPinAngle className="text-gray-400" />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-center text-gray-400">Eşleşen öğe yok</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CryptoSelectButton;
