'use client';

import { useState, useEffect, useMemo } from 'react';
import { useBotStore } from '@/store/bot/botStore';
import useApiStore from '@/store/api/apiStore';
import { FiSearch, FiLock } from 'react-icons/fi';
import { toast } from 'react-toastify';
import StrategyButton from './chooseStrategy';
import useBotChooseStrategyStore from '@/store/bot/botChooseStrategyStore';
import { useTranslation } from 'react-i18next';

export const BotModal = ({ onClose, mode = 'create', bot = null }) => {
  const { t } = useTranslation('botModal');
  const { selectedStrategy } = useBotChooseStrategyStore();

  // ---- State ----
  const [type, setType] = useState('spot'); // spot | futures
  const [balance, setBalance] = useState(0);
  const [allocatedAmount, setAllocatedAmount] = useState(0);
  const [percentage, setPercentage] = useState(0);

  const [botName, setBotName] = useState('');
  const [api, setApi] = useState('');
  const [strategy, setStrategy] = useState('');
  const [period, setPeriod] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [days, setDays] = useState([]);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [cryptoList, setCryptoList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [candleCount, setCandleCount] = useState(0);

  const apiList = useApiStore((state) => state.apiList);

  // --- Acquisition lock kontrolü ---
  const isEdit = mode === 'edit' && !!bot;
  const acquisitionType = (bot?.acquisition_type || '').toUpperCase();
  const isAcquiredLocked = isEdit && (acquisitionType === 'PURCHASED' || acquisitionType === 'RENTED');

  const availableCoins = [
    'BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT','ADAUSDT','XRPUSDT','DOGEUSDT',
    'TONUSDT','TRXUSDT','LINKUSDT','MATICUSDT','DOTUSDT','LTCUSDT','SHIBUSDT','AVAXUSDT',
  ];

  const filteredCoins = useMemo(
    () =>
      availableCoins.filter(
        (coin) =>
          coin.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !cryptoList.includes(coin)
      ),
    [searchQuery, cryptoList]
  );

  const dayList = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Seçili API nesnesi
  const selectedApiObj = useMemo(
    () => apiList.find((item) => item && item.name === api),
    [apiList, api]
  );

  // Edit modunda başlangıç değerleri yükle
  useEffect(() => {
    if (isEdit) {
      setBotName(bot.name || '');
      setApi(bot.api || '');
      // Strateji adı satın alanda gösterilmeyecek → UI'da boş kalsın
      setStrategy(isAcquiredLocked ? '' : (bot.strategy || ''));
      setPeriod(bot.period || '');
      setIsActive(bot.isActive ?? true);
      setDays(bot.days || []);
      setStartTime(bot.startTime || '');
      setEndTime(bot.endTime || '');
      setCryptoList(bot.cryptos || []);
      setCandleCount(bot.candleCount || 0);
      setAllocatedAmount(
        bot.initial_usd_value != null ? bot.initial_usd_value : (bot.balance || 0)
      );
      setType(bot.type === 'futures' ? 'futures' : 'spot');
    }
  }, [isEdit, bot, isAcquiredLocked]);

  // API veya TIP değişince balance'ı güncelle
  useEffect(() => {
    if (!selectedApiObj) {
      setBalance(0);
      return;
    }
    const apiBalance =
      type === 'futures'
        ? Number(selectedApiObj.futures_balance ?? 0)
        : Number(selectedApiObj.spot_balance ?? 0);

    setBalance(apiBalance);

    // Ayrılan tutarı ve yüzdeyi mevcut bakiyeye göre hizala
    setAllocatedAmount((prev) => {
      const safe = Math.min(apiBalance, Number(prev) || 0);
      const pct = apiBalance > 0 ? Math.round((safe / apiBalance) * 100) : 0;
      setPercentage(pct);
      return safe;
    });
  }, [selectedApiObj, type]);

  // Bakiye değişince yüzdeyi düzelt (ek güvence)
  useEffect(() => {
    const pct =
      balance > 0 ? Math.round(((Number(allocatedAmount) || 0) / balance) * 100) : 0;
    setPercentage(Math.max(0, Math.min(100, pct)));
  }, [balance]); // eslint-disable-line

  const toggleDay = (day) => {
    setDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  };

  const removeCrypto = (symbol) => {
    setCryptoList((prev) => prev.filter((c) => c !== symbol));
  };

  const addBot = useBotStore((state) => state.addBot);
  const updateBot = useBotStore((state) => state.updateBot);

  const handleSave = () => {
    const errors = [];

    if (!botName.trim()) errors.push(t('errors.nameRequired'));
    if (!api) errors.push(t('errors.apiRequired'));
    // Strateji seçme zorunluluğu sadece kilitli olmayanlarda
    if (!isAcquiredLocked) {
      if (!selectedStrategy || !selectedStrategy.name) errors.push(t('errors.strategyRequired'));
    }
    if (!period) errors.push(t('errors.periodRequired'));
    if (!candleCount || candleCount <= 0) errors.push(t('errors.candleInvalid'));
    if (days.length === 0) errors.push(t('errors.dayRequired'));
    if (!startTime || !endTime) errors.push(t('errors.hoursRequired'));
    if (!allocatedAmount || Number(allocatedAmount) <= 10) errors.push(t('errors.amountMin'));
    if (cryptoList.length === 0) errors.push(t('errors.cryptoRequired'));

    // çalışma aralığı en az 1 saat
    const [startH, startM] = (startTime || '0:0').split(':').map(Number);
    const [endH, endM] = (endTime || '0:0').split(':').map(Number);
    if (endH * 60 + endM - (startH * 60 + startM) < 60) {
      toast.error(t('errors.endAfterStart'), { autoClose: 2000 });
      return;
    }

    if (errors.length > 0) {
      errors.forEach((err) => toast.error(err, { autoClose: 2000 }));
      return;
    }

    if (Number(allocatedAmount) > Number(balance)) {
      toast.error(t('errors.amountGtBalance'), { autoClose: 2000 });
      return;
    }

    const botData = {
      id: bot?.id,
      name: botName,
      api,
      // Satın alınan/kiralanan botta strateji gönderilmez (backend'de saklı)
      ...(isAcquiredLocked ? {} : { strategy: selectedStrategy?.name }),
      period,
      isActive: false,
      days,
      startTime,
      endTime,
      cryptos: cryptoList,
      candleCount,
      initial_usd_value: Number(allocatedAmount),
      balance: Number(balance),
      type, // spot | futures
    };

    if (mode === 'edit') {
      updateBot(botData);
      toast.success(t('toast.updated'), { autoClose: 2000 });
    } else {
      addBot(botData);
      toast.success(t('toast.created'), { autoClose: 2000 });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-gray-900 p-6 rounded-xl w-full max-w-4xl shadow-2xl relative border-y border-x h-[85vh] overflow-y-auto border-gray-950 flex gap-6">
        {/* SOL - FORM */}
        <div className="w-2/3 pr-4">
          <h2 className="text-2xl font-bold text-white mb-6">
            {mode === 'edit' ? t('titles.edit') : t('titles.create')}
          </h2>

          {/* Bot Name + Type yan yana */}
          <div className="flex items-end gap-4 mb-4">
            <div>
              <label className="block mb-2 text-gray-200 font-medium">{t('labels.botName')}</label>
              <input
                type="text"
                maxLength={15}
                placeholder={t('labels.enterBotName')}
                className="w-60 p-2 bg-gray-800 text-white rounded"
                value={botName}
                onChange={(e) => setBotName(e.target.value)}
              />
            </div>

            <div>
              <label className="block mb-2 text-gray-200 font-medium">{t('labels.type')}</label>
              <div className="relative">
                <select
                  className={`w-40 p-2 bg-gray-800 text-white rounded ${isAcquiredLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  disabled={isAcquiredLocked}
                >
                  <option value="spot">{t('types.spot')}</option>
                  <option value="futures">{t('types.futures')}</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block mb-1 text-gray-300">{t('labels.api')}</label>
              <select
                className="w-full p-2 bg-gray-800 text-white rounded"
                value={api}
                onChange={(e) => setApi(e.target.value)}
              >
                <option value="" disabled hidden>
                  {t('labels.select')}
                </option>
                {apiList.map((item, i) => (
                  <option key={i} value={item.name}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-1 text-gray-300">{t('labels.strategy')}</label>
              {!isAcquiredLocked ? (
                <StrategyButton onSelect={(selected) => setStrategy(selected)} />
              ) : (
                <div className="w-full p-2 bg-gray-800 text-gray-300 rounded flex items-center gap-2">
                  <FiLock className="shrink-0" />
                  <span className="text-sm">
                    {t('labels.hidden')}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block mb-1 text-gray-300">{t('labels.period')}</label>
              <select
                className="w-full p-2 bg-gray-800 text-white rounded"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              >
                <option value="" disabled hidden>
                  {t('labels.select')}
                </option>
                <option value="1m">{t('periods.1m')}</option>
                <option value="5m">{t('periods.5m')}</option>
                <option value="15m">{t('periods.15m')}</option>
                <option value="30m">{t('periods.30m')}</option>
                <option value="1h">{t('periods.1h')}</option>
                <option value="2h">{t('periods.2h')}</option>
                <option value="4h">{t('periods.4h')}</option>
                <option value="1d">{t('periods.1d')}</option>
                <option value="1w">{t('periods.1w')}</option>
              </select>
            </div>

            <div>
              <label className="block mb-1 text-gray-300">{t('labels.candleCount')}</label>
              <input
                type="number"
                min="1"
                placeholder={t('labels.candleCountPlaceholder')}
                className={`w-full p-2 bg-gray-800 text-white rounded ${isAcquiredLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                value={candleCount}
                onChange={(e) => setCandleCount(Number(e.target.value))}
                disabled={isAcquiredLocked}
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block mb-2 text-gray-200 font-medium">{t('labels.workingDays')}</label>
            <div className="grid grid-cols-4 gap-2 text-gray-300">
              {dayList.map((day) => (
                <label key={day} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={days.includes(day)}
                    onChange={() => toggleDay(day)}
                    className="accent-black h-3 w-3 border-gray-600 rounded-sm"
                  />
                  <span>{t(`days.${day}`)}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <label className="block mb-2 text-gray-200 font-medium">{t('labels.allocateBalance')}</label>

            <div className="flex items-center gap-3 mb-2">
              <input
                type="range"
                min={0}
                max={100}
                value={percentage}
                onChange={(e) => {
                  const pct = Number(e.target.value);
                  setPercentage(pct);
                  const next = Number(((balance * pct) / 100).toFixed(2));
                  setAllocatedAmount(next);
                }}
                className="w-full accent-blue-500"
              />
              <span className="text-gray-300 text-sm w-12 text-right">{percentage}%</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">{t('labels.totalBalance')}: ${balance}</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max={balance}
                  step="0.01"
                  value={allocatedAmount}
                  onChange={(e) => {
                    const value = Math.max(0, Math.min(Number(e.target.value), Number(balance)));
                    setAllocatedAmount(value);
                    const pct = balance > 0 ? Math.round((value / Number(balance)) * 100) : 0;
                    setPercentage(Math.min(100, pct));
                  }}
                  className="w-24 px-2 py-1 bg-gray-800 text-white rounded text-sm"
                />
                <span className="text-gray-400 text-sm">$</span>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <label className="block mb-2 text-gray-200 font-medium">{t('labels.botWorkingHours')}</label>
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
            <button
              onClick={() => {
                setStartTime('00:00');
                setEndTime('23:59');
              }}
              className="text-sm text-blue-400 hover:text-blue-300 underline"
            >
              {t('labels.startEndAllDay')}
            </button>
          </div>

          <div className="flex right-2 gap-3 pb-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-gray-200 rounded-lg hover:bg-gray-500"
            >
              {t('labels.cancel')}
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {t('labels.save')}
            </button>
          </div>
        </div>

        {/* SAĞ - KRİPTO PANELİ */}
        <div className="w-1/3 flex flex-col bg-gray-950 p-3 rounded max-h-[500px]">
          <div className="mb-4">
            <label className="block mb-1 text-gray-300">{t('labels.addCryptocurrency')}</label>
            <div className="relative w-full">
              <input
                type="text"
                className="w-full p-2 pr-10 mb-2 bg-gray-900 text-white rounded-sm"
                placeholder={t('labels.searchPlaceholder')}
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
                        onClick={() => setCryptoList((prev) => [...prev, coin])}
                        className="text-green-400 text-sm px-2 py-1 hover:text-green-500 rounded"
                      >
                        {t('labels.add')}
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-400 px-3 py-2">{t('labels.noMatchingCrypto')}</p>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 max-h-[350px] overflow-y-auto scrollbar-hide">
            {cryptoList.map((crypto) => (
              <div key={crypto} className="flex justify-between items-center bg-gray-900 px-3 py-2 rounded">
                <span className="text-white">{crypto}</span>
                <button
                  onClick={() => removeCrypto(crypto)}
                  className="text-red-500 hover:text-red-600 text-sm"
                >
                  {t('labels.remove')}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
