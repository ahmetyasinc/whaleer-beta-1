'use client';
import { useState, useEffect } from 'react';
import { useBotStore } from '@/store/bot/botStore';
import useApiStore from '@/store/api/apiStore'; // yolunu doğru ver
import useStrategyStore from '@/store/indicator/strategyStore';
import { FiSearch } from 'react-icons/fi';


export const BotModal = ({ onClose, mode = "create", bot = null }) => {
  const [botName, setBotName] = useState('');
  const [api, setApi] = useState('');
  const [strategy, setStrategy] = useState('');
  const [period, setPeriod] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [days, setDays] = useState([]);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [cryptoList, setCryptoList] = useState([]);
  const [selectedCrypto, setSelectedCrypto] = useState('');  
  const [searchQuery, setSearchQuery] = useState('');
  const availableCoins = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT", "DOGEUSDT", "SUIUSDT", "MATICUSDT", "TRXUSDT", "LTCUSDT", "AVAXUSDT", "LINKUSDT", "DOTUSDT", "SHIBUSDT", "ADAUSDT", "XMRUSDT", "ETCUSDT", "FILUSDT", "ICPUSDT", "AAVEUSDT", "MANAUSDT", "SANDUSDT", "CHZUSDT"];
  const apiList = useApiStore((state) => state.apiList);
  const strategies = useStrategyStore((state) => state.strategies);


  const filteredCoins = availableCoins.filter(
    (coin) =>
      coin.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !cryptoList.includes(coin)
  );
  
  
  const dayList = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

  const botData = {
    id: bot?.id || Date.now(),
    name: botName,
    api,
    strategy,
    period,
    isActive,
    days,
    startTime,
    endTime,
    cryptos: cryptoList, // 🟢 yeni alan
  };
  

  const addCrypto = () => {
    if (selectedCrypto && !cryptoList.includes(selectedCrypto)) {
      setCryptoList([...cryptoList, selectedCrypto]);
      setSelectedCrypto('');
    }
  };
  
  const removeCrypto = (symbol) => {
    setCryptoList(cryptoList.filter((c) => c !== symbol));
  };
  

  useEffect(() => {
    if (mode === 'edit' && bot) {
      setBotName(bot.name || '');
      setApi(bot.api || '');
      setStrategy(bot.strategy || '');
      setPeriod(bot.period || '');
      setIsActive(bot.isActive ?? true);
      setDays(bot.days || []);
      setStartTime(bot.startTime || '');
      setEndTime(bot.endTime || '');
      setCryptoList(bot.cryptos || []); // 🟢 bu satır kritik
    }
  }, [mode, bot]);
  

  const toggleDay = (day) => {
    if (days.includes(day)) {
      setDays(days.filter((d) => d !== day));
    } else {
      setDays([...days, day]);
    }
  };

  const addBot = useBotStore((state) => state.addBot);
  const updateBot = useBotStore((state) => state.updateBot);
  

  const handleSave = () => {
    const botData = {
      id: bot?.id || Date.now(),
      name: botName,
      api,
      strategy,
      period,
      isActive:false,
      days,
      startTime,
      endTime,
      cryptos: cryptoList,
    };
  
    if (mode === 'edit') {
      updateBot(botData);
    } else {
      addBot(botData);
    }
  
    onClose();
  };
  
  

  return (
    <div className="fixed inset-0 bg-black/50 bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-gray-900 p-6 rounded-xl w-full max-w-4xl shadow-2xl relative border-y border-x border-gray-950 flex gap-6">
        {/* Sol - Form Alanı */}
        <div className="w-2/3 pr-4 ">
          <h2 className="text-2xl font-bold text-white mb-6">Yeni Bot Oluştur</h2>
  
          <label className="block mb-2 text-gray-200 font-medium">Bot İsmi</label>
          <input
            type="text"
            maxLength={15}
            placeholder="Bot ismi girin"
            className="w-60 mb-4 p-2 bg-gray-800 text-white rounded"
            value={botName}
            onChange={(e) => setBotName(e.target.value)}
          />
  
          <div className="grid grid-cols-3 gap-4 mb-6 ">
            <div>
              <label className="block mb-1 text-gray-300">API</label>
              <select
                className="w-full p-2 bg-gray-800 text-white rounded"
                value={api}
                onChange={(e) => setApi(e.target.value)}
              >
                <option value="" disabled hidden>Seç</option>
              
                {apiList.map((item, i) => (
                  <option key={i} value={item.name}>
                    {item.name}
                  </option>
                ))}
              </select>

            </div>
            <div>
              <label className="block mb-1 text-gray-300">Strateji</label>
              <select
                className="w-full p-2 bg-gray-800 text-white rounded"
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
              >
                <option value="" disabled hidden>Seç</option>
                          
                {strategies.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>

            </div>
            <div>
              <label className="block mb-1 text-gray-300">Periyot</label>
              <select
                className="w-full p-2 bg-gray-800 text-white rounded"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              >
                <option value="" disabled hidden>Seç</option>
                <option value="1m">1dk</option>
                <option value="5m">5dk</option>
                <option value="15m">15dk</option>
                <option value="15m">30dk</option>
                <option value="15m">1sa</option>
                <option value="15m">2sa</option>
                <option value="15m">4sa</option>
                <option value="15m">1g</option>
                <option value="15m">1h</option>
              </select>
            </div>
          </div>
  
          <div className="mb-6">
            <label className="block mb-2 text-gray-200 font-medium">Çalışma Günleri</label>
            <div className="grid grid-cols-4 gap-2 text-gray-300">
              {dayList.map((day) => (
                <label key={day} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={days.includes(day)}
                    onChange={() => toggleDay(day)}
                    className="accent-black h-3 w-3 border-gray-600 rounded-sm"
                  />
                  <span>{day}</span>
                </label>
              ))}
            </div>
          </div>
  
          <div className="mb-6">
            <label className="block mb-2 text-gray-200 font-medium">Botun çalışma aralığı</label>
            <div className="flex justify-start gap-2">
              <input
                type="time"
                className="bg-gray-800 text-white px-2 py-1 rounded"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
              <input
                type="time"
                className="bg-gray-800 text-white px-2 py-1 rounded"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>
  
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-gray-200 rounded-lg hover:bg-gray-500"
            >
              İptal
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Kaydet
            </button>
          </div>
        </div>
  
        {/* Sağ - Kripto Paneli */}
        <div className="w-1/3 flex flex-col bg-gray-950 p-3 rounded max-h-[500px]">
          {/* Arama kutusu + filtrelenmiş sonuçlar */}
          <div className="mb-4">
            <label className="block mb-1 text-gray-300">Kripto Para Ekle</label>
            <div className="relative w-full">
              <input
                type="text"
                className="w-full p-2 pr-10 mb-2 bg-gray-900 text-white rounded-sm"
                placeholder="Örn: BTCUSDT"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <FiSearch
                className="absolute right-3 top-[40%] transform -translate-y-1/2 text-gray-400 pointer-events-none"
                size={16}
              />
            </div>

            {searchQuery && (
              <div className="bg-gray-900 rounded max-h-48 overflow-y-auto scrollbar-hide">
                {filteredCoins.length > 0 ? (
                  filteredCoins.map((coin) => (
                    <div
                      key={coin}
                      className="flex justify-between items-center px-3 py-1 hover:bg-gray-800 text-white border-b border-gray-700 last:border-b-0"
                    >
                      <span>{coin}</span>
                      <button
                        onClick={() => {
                          setCryptoList([...cryptoList, coin]);
                        }}
                        className="text-green-400 text-sm px-2 py-1 hover:text-green-500 rounded"
                      >
                        Ekle
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-400 px-3 py-2">Eşleşen kripto yok</p>
                )}
              </div>
            )}

          </div>
        
          {/* Eklenen Coinler - üstten başlar */}
          <div className="flex flex-col gap-2 max-h-[350px] overflow-y-auto scrollbar-hide">
            {cryptoList.map((crypto) => (
              <div key={crypto} className="flex justify-between items-center bg-gray-900 px-3 py-2 rounded">
                <span className="text-white">{crypto}</span>
                <button
                  onClick={() => removeCrypto(crypto)}
                  className="text-red-500 hover:text-red-600 text-sm"
                >
                  Sil
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};