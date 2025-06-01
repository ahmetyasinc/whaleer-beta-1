'use client';
import { useState, useEffect } from 'react';
import { useBotStore } from '@/store/bot/botStore';
import useApiStore from '@/store/api/apiStore'; // yolunu doğru ver
import useStrategyStore from '@/store/indicator/strategyStore';
import { FiSearch } from 'react-icons/fi';
import { toast } from 'react-toastify';

export const BotModal = ({ onClose, mode = "create", bot = null }) => {
  const [balance, setBalance] = useState(0); // Kullanıcının toplam bakiyesi
  const [allocatedAmount, setAllocatedAmount] = useState(0); // Bu bota ayrılan miktar
  const [percentage, setPercentage] = useState(0); // Slider'daki yüzde
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
  const strategies = useStrategyStore((state) => state.all_strategies);
  const [candleCount, setCandleCount] = useState(0);

  const filteredCoins = availableCoins.filter(
    (coin) =>
      coin.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !cryptoList.includes(coin)
  );

  const dayList = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
  
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
      setCryptoList(bot.cryptos || []);
      setCandleCount(bot.candleCount || 0);
      setAllocatedAmount(bot.balance || 0);
      setBalance(bot.total_balance || 0); // mevcut toplam bakiye
    
      // 🆕 Yüzde hesapla
      if (bot.balance && bot.total_balance) {
        const calculatedPct = (bot.balance / bot.total_balance) * 100;
        setPercentage(Math.min(100, Math.round(calculatedPct)));
      }
    }
  }, [mode, bot]);

  useEffect(() => {
    if (mode !== 'edit' && api) {
      const selectedApi = apiList.find((item) => item.name === api);
      if (selectedApi && selectedApi.balance !== undefined) {
        setBalance(selectedApi.balance);
      }
    }
    if (mode === 'edit' && bot) {
      const selectedApi = apiList.find((item) => item.name === api);
      if (selectedApi && selectedApi.balance !== undefined) {
        setBalance(selectedApi.balance);
      }
    }
  }, [api, mode, apiList]);

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
    const errors = [];

    if (!botName.trim()) errors.push("Bot ismi gerekli.");
    if (!api) errors.push("API seçimi yapılmalı.");
    if (!strategy) errors.push("Strateji seçimi yapılmalı.");
    if (!period) errors.push("Periyot seçilmeli.");
    if (!candleCount || candleCount <= 0) errors.push("Mum sayısı geçerli değil.");
    if (days.length === 0) errors.push("En az bir gün seçilmeli.");
    if (!startTime || !endTime) errors.push("Çalışma saatleri girilmeli.");
    if (!allocatedAmount || allocatedAmount <= 10) errors.push("Bakiye 10$ değerinden büyük ayarlanmalı.");
    if (cryptoList.length === 0) errors.push("En az bir kripto seçilmeli.");

    // 🕓 Saat farkı kontrolü (en az 1 saat)
    if (startTime && endTime) {
      const [startH, startM] = startTime.split(":").map(Number);
      const [endH, endM] = endTime.split(":").map(Number);

      const start = startH * 60 + startM;
      const end = endH * 60 + endM;

      if (end - start < 60) {
        toast.error("Bitiş saati, başlangıç saatinden en az 1 saat sonra olmalı.", { autoClose: 2000 });
        return;
      }
    }

    if (errors.length > 0) {
      errors.forEach((err) => toast.error(err, { autoClose: 2000 }));
      return;
    }

    if (allocatedAmount > balance) {
      toast.error("Ayırmak istediğiniz miktar, toplam bakiyenizden büyük olamaz.", { autoClose: 2000 });
      return;
    }
    console.log("Bot verileri:", {strategy});

    const botData = {
      id: bot?.id,
      name: botName,
      api,
      strategy: bot?.strategy || strategy,
      period,
      isActive: false,
      days,
      startTime,
      endTime,
      cryptos: cryptoList,
      candleCount,
      initial_usd_value: allocatedAmount,
      balance: balance,
    };

    if (mode === 'edit') {
      updateBot(botData);
      toast.success("Bot güncellendi!", { autoClose: 2000 });
    } else {
      addBot(botData);
      toast.success("Bot oluşturuldu!", { autoClose: 2000 });
    }

    onClose();
  };


  
  return (
    <div className="fixed inset-0 bg-black/50 bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-gray-900 p-6 rounded-xl w-full max-w-4xl shadow-2xl relative border-y border-x border-gray-950 flex gap-6">
        {/* Sol - Form Alanı */}
        <div className="w-2/3 pr-4 ">
          <h2 className="text-2xl font-bold text-white mb-6">
            {mode === 'edit' ? 'Botu Düzenle' : 'Yeni Bot Oluştur'}
          </h2>
          <label className="block mb-2 text-gray-200 font-medium">Bot İsmi</label>
          <input
            type="text"
            maxLength={15}
            placeholder="Bot ismi girin"
            className="w-60 mb-4 p-2 bg-gray-800 text-white rounded"
            value={botName}
            onChange={(e) => setBotName(e.target.value)}
          />
  
          <div className="grid grid-cols-4 gap-4 mb-6 ">
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
                <option value="1m">1 dk</option>
                <option value="5m">5 dk</option>
                <option value="15m">15 dk</option>
                <option value="30m">30 dk</option>
                <option value="1h">1 saat</option>
                <option value="2h">2 saat</option>
                <option value="4h">4 saat</option>
                <option value="1d">1 gün</option>
                <option value="1w">1 hafta</option>
              </select>
            </div>
            <div className="mb-6">
              <label className="block mb-1 text-gray-300">Mum Sayısı</label>
              <input
                type="number"
                min="1"
                placeholder="Örn: 100"
                className="w-full p-2 bg-gray-800 text-white rounded"
                value={candleCount}
                onChange={(e) => setCandleCount(Number(e.target.value))}
              />
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
            <label className="block mb-2 text-gray-200 font-medium">Bot için Bakiye Ayır</label>

            <div className="flex items-center gap-3 mb-2">
              <input
                type="range"
                min={0}
                max={100}
                value={percentage}
                onChange={(e) => {
                  const pct = Number(e.target.value);
                  setPercentage(pct);
                  setAllocatedAmount(((balance * pct) / 100).toFixed(2));
                }}
                className="w-full accent-blue-500"
              />
              <span className="text-gray-300 text-sm w-12 text-right">{percentage}%</span>
            </div>
              
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Toplam Bakiye: ${balance}</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max={balance}
                  step="0.01"
                  value={allocatedAmount}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    setAllocatedAmount(value);
                    setPercentage(Math.min(100, ((value / balance) * 100).toFixed(0)));
                  }}
                  className="w-24 px-2 py-1 bg-gray-800 text-white rounded text-sm"
                />
                <span className="text-gray-400 text-sm">$</span>
              </div>
            </div>
          </div>
          <div className="mb-6">
            <label className="block mb-2 text-gray-200 font-medium">Botun çalışma aralığı</label>

            <div className="flex justify-start gap-2 mb-2">
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

            {/* 🆕 TAM GÜN BUTONU */}
            <button
              onClick={() => {
                setStartTime("00:00");
                setEndTime("23:59");
              }}
              className="text-sm text-blue-400 hover:text-blue-300 underline"
            >
              Tüm gün çalışsın
            </button>
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