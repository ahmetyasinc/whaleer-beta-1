import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  const [mounted, setMounted] = useState(false);

  const { pinned, setPinned } = useCryptoStore();
  const { selectedCrypto, setSelectedCrypto } = useBacktestStore();

  useEffect(() => {
    setMounted(true);
    const fetchCoins = async () => {
      try {
        const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/get-coin-list/`);

        if (response.data && response.data.coins) {
          const coins = response.data.coins.map(coin => ({
            id: coin.id,
            name: coin.name,
            symbol: coin.symbol,
            binance_symbol: coin.binance_symbol,
            tick_size: coin.tick_size
          }));

          const pinnedCoins = response.data.coins
            .filter(coin => coin.pinned)
            .map(coin => ({
              id: coin.id,
              name: coin.name,
              symbol: coin.symbol,
              binance_symbol: coin.binance_symbol,
              tick_size: coin.tick_size
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

  const modalContent = (
    <div className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-[9999]">
      <div className="bg-zinc-950 text-zinc-200 border border-zinc-800 rounded-[2px] p-6 w-[500px] h-[550px] shadow-[0_0_50px_-10px_rgba(0,0,0,0.8)] flex flex-col relative animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          className="absolute top-2 right-4 text-zinc-500 hover:text-white text-3xl transition-colors"
          onClick={() => setIsModalOpen(false)}
          aria-label={t('buttons.close')}
          title={t('buttons.close')}
        >
          &times;
        </button>

        <h2 className="text-lg font-bold mb-4 text-zinc-100">{t('titles.selectCryptocurrency')}</h2>

        {/* Search */}
        <input
          type="text"
          placeholder={t('placeholders.searchCrypto')}
          className="w-full px-3 py-2 rounded bg-zinc-900 border border-zinc-700 text-zinc-200 mb-3 focus:outline-none focus:border-blue-500/50 focus:shadow-[0_0_10px_-2px_rgba(59,130,246,0.3)] placeholder:text-zinc-600 transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label={t('placeholders.searchCrypto')}
        />

        {/* Crypto List */}
        <div className="flex-grow overflow-y-auto pl-0 ml-0 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent"
          role="listbox"
          aria-label={t('titles.selectCryptocurrency')}>
          {filteredCryptos.length > 0 ? (
            <ul className="pl-0 ml-0">
              {filteredCryptos.map((crypto) => (
                <li
                  key={crypto.id}
                  className="py-2 pl-12 pr-4 hover:bg-zinc-800/80 cursor-pointer rounded-sm flex items-center justify-between border-b border-zinc-900/50 last:border-0 transition-colors"
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
                      <BsPinAngleFill className="text-red-600 drop-shadow-[0_0_5px_rgba(220,38,38,0.5)]" />
                    ) : (
                      <BsPinAngle className="text-zinc-600 transition-colors" />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-zinc-500 mt-4">{t('empty.noMatches')}</p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Crypto Select Button */}
      <button
        className="bg-zinc-900 px-4 py-2 rounded hover:bg-zinc-800 transition border border-zinc-700/50 text-zinc-200"
        onClick={() => setIsModalOpen(true)}
        aria-label={t('buttons.selectCrypto')}
        title={t('buttons.selectCrypto')}
      >
        <span className="ml-3">
          {selectedCrypto ? `${selectedCrypto.name} (${selectedCrypto.symbol})` : t('buttons.selectCrypto')}
        </span>
      </button>

      {/* Modal */}
      {mounted && isModalOpen && createPortal(modalContent, document.body)}
    </>
  );
};

export default CryptoSelectButton;
