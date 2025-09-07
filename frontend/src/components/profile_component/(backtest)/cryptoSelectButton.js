'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { BsPinAngle, BsPinAngleFill } from 'react-icons/bs';
import useBacktestStore from '@/store/backtest/backtestStore';
import useCryptoStore from '@/store/indicator/cryptoPinStore';
import { useTranslation } from 'react-i18next';

axios.defaults.withCredentials = true;

const CryptoSelectButton = () => {
  const { t } = useTranslation('backtestCryptoSelectButton');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [cryptosList, setCryptosList] = useState([]);

  const { pinned, setPinned } = useCryptoStore();
  const { selectedCrypto, setSelectedCrypto } = useBacktestStore();

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

          const pinnedCoins = response.data.coins
            .filter(coin => coin.pinned)
            .map(coin => ({
              id: coin.id,
              name: coin.name,
              symbol: coin.symbol,
              binance_symbol: coin.binance_symbol
            }));

          setCryptosList(coins);
          setPinned(pinnedCoins);
          useCryptoStore.getState().setCoins(coins);
        }
      } catch (error) {
        console.error('Error fetching coin list:', error);
      }
    };

    fetchCoins();
  }, [setPinned]);

  const pinnedSet = new Set(pinned.map(p => p.id));
  const sortedCryptos = [
    ...pinned,
    ...cryptosList.filter(c => !pinnedSet.has(c.id))
  ];

  const filteredCryptos = sortedCryptos.filter(crypto =>
    crypto.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    crypto.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      {/* Crypto Select Button */}
      <button
        className="bg-gray-800 px-4 py-2 rounded hover:bg-gray-700 transition"
        onClick={() => setIsModalOpen(true)}
        aria-label={t('buttons.selectCrypto')}
        title={t('buttons.selectCrypto')}
      >
        <span className="ml-3">
          {selectedCrypto ? `${selectedCrypto.name} (${selectedCrypto.symbol})` : t('buttons.selectCrypto')}
        </span>
      </button>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-gray-900 text-white rounded-[2px] p-6 w-[500px] h-[550px] shadow-lg flex flex-col relative">
            {/* Close Button */}
            <button
              className="absolute top-2 right-4 text-gray-400 hover:text-white text-3xl"
              onClick={() => setIsModalOpen(false)}
              aria-label={t('buttons.close')}
              title={t('buttons.close')}
            >
              &times;
            </button>

            <h2 className="text-lg font-bold mb-4">{t('titles.selectCryptocurrency')}</h2>

            {/* Search */}
            <input
              type="text"
              placeholder={t('placeholders.searchCrypto')}
              className="w-full px-3 py-2 rounded bg-gray-800 text-white mb-3 focus:outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label={t('placeholders.searchCrypto')}
            />

            {/* Crypto List */}
            <div className="flex-grow overflow-y-auto pl-0 ml-0"
                 role="listbox"
                 aria-label={t('titles.selectCryptocurrency')}>
              {filteredCryptos.length > 0 ? (
                <ul className="pl-0 ml-0">
                  {filteredCryptos.map((crypto) => (
                    <li
                      key={crypto.id}
                      className="py-2 pl-12 pr-4 hover:bg-gray-700 cursor-pointer rounded-sm flex items-center justify-between"
                      onClick={() => {
                        setSelectedCrypto(crypto);
                        setIsModalOpen(false);
                      }}
                      role="option"
                      aria-selected={selectedCrypto?.id === crypto.id}
                    >
                      {`${crypto.name} (${crypto.symbol})`}
                      <div>
                        {pinned.find(p => p.id === crypto.id) ? (
                          <BsPinAngleFill className="text-red-700" />
                        ) : (
                          <BsPinAngle className="text-gray-400" />
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-center text-gray-400">{t('empty.noMatches')}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CryptoSelectButton;
