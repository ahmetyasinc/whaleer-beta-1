'use client';

import { useState, useEffect, useMemo } from 'react';
import { useBotStore } from '@/store/bot/botStore';
import useApiStore from '@/store/api/apiStore';
import { toast } from 'react-toastify';
import StrategyButton from './chooseStrategy';
import useBotChooseStrategyStore from '@/store/bot/botChooseStrategyStore';
import { useTranslation } from 'react-i18next';
import { FiX, FiSearch, FiLock, FiCheck, FiCpu, FiCalendar, FiClock } from "react-icons/fi";

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

  // NEW: Mevcut sinyalde hemen girilsin mi?
  const [enterOnCurrentSignal, setEnterOnCurrentSignal] = useState(false);

  const apiList = useApiStore((state) => state.apiList);

  // --- Edit/Kilit durumları ---
  const isEdit = mode === 'edit' && !!bot;
  const acquisitionType = (bot?.acquisition_type || '').toUpperCase();
  const isAcquiredLocked =
    isEdit && (acquisitionType === 'PURCHASED' || acquisitionType === 'RENTED');

  const isStrategyLocked = isEdit || isAcquiredLocked;
  const isLockedStatic = isEdit || isAcquiredLocked; // candleCount + enterOnCurrentSignal
  const lockAllButCore = isEdit; // edit modunda core dışı kilit

  const displayStrategyName = bot?.strategy || selectedStrategy?.name || '';

  const availableCoins = [
    'BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT','ADAUSDT','XRPUSDT','DOGEUSDT',
    'TONUSDT','TRXUSDT','LINKUSDT','PEPEUSDT','DOTUSDT','LTCUSDT','SHIBUSDT','AVAXUSDT',
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

  // ---- Kaydet'e kadar kilidi ertele ----
  // Modal ilk açıldığında api yoksa, API + Bakiye kilidi Kaydet'e kadar kalksın.
  const [deferLockApiAndBalance, setDeferLockApiAndBalance] = useState(false);
  useEffect(() => {
    if (isEdit) {
      const initiallyNoApi = !(bot?.api && String(bot.api).trim().length > 0);
      setDeferLockApiAndBalance(initiallyNoApi);
    } else {
      setDeferLockApiAndBalance(false);
    }
  }, [isEdit, bot]);

  // Editte API seçili değilse normalde serbest; ayrıca deferLock true ise her hâlükârda serbest.
  const canEditApiAndBalance = isEdit && (!api || !selectedApiObj);
  const lockApiAndBalance = lockAllButCore && !canEditApiAndBalance && !deferLockApiAndBalance;

  // Edit modunda başlangıç değerleri yükle
  useEffect(() => {
    if (isEdit) {
      setBotName(bot.name || '');
      setApi(bot.api || '');
      setStrategy(isAcquiredLocked ? '' : (bot.strategy || ''));
      setPeriod(bot.period || '');
      setIsActive(bot.isActive ?? true);
      setDays(bot.days || []);
      setStartTime(bot.startTime || '');
      setEndTime(bot.endTime || '');
      setCryptoList(bot.cryptos || []);
      setCandleCount(bot.candleCount || 0);

      setEnterOnCurrentSignal(
        bot.enterOnCurrentSignal ?? bot.enter_on_current_signal ?? false
      );

      setAllocatedAmount(
        bot.initial_usd_value != null ? bot.initial_usd_value : (bot.balance || 0)
      );
      setType(((bot && (bot.bot_type || bot.type)) === 'futures') ? 'futures' : 'spot');
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
    if (lockAllButCore) return; // edit modunda kaldıramasın
    setCryptoList((prev) => prev.filter((c) => c !== symbol));
  };

  const addBot = useBotStore((state) => state.addBot);
  const updateBot = useBotStore((state) => state.updateBot);

  const handleSave = () => {
    const errors = [];

    if (!botName.trim()) errors.push(t('errors.nameRequired'));

    if (!isEdit) {
      if (!api) errors.push(t('errors.apiRequired'));

      const shouldRequireStrategy = !isAcquiredLocked;
      if (shouldRequireStrategy) {
        if (!selectedStrategy || !selectedStrategy.name) {
          errors.push(t('errors.strategyRequired'));
        }
      }

      if (!period) errors.push(t('errors.periodRequired'));
      if (!candleCount || candleCount <= 0) errors.push(t('errors.candleInvalid'));
      if (!allocatedAmount || Number(allocatedAmount) <= 10) errors.push(t('errors.amountMin'));
      if (cryptoList.length === 0) errors.push(t('errors.cryptoRequired'));
      if (Number(allocatedAmount) > Number(balance)) {
        errors.push(t('errors.amountGtBalance'));
      }
    } else {
      // EDIT: Başlangıçta api yoktuysa (deferLock) veya bot.api boşsa -> api seçilmesi zorunlu
      if (deferLockApiAndBalance || !bot?.api) {
        if (!api) errors.push(t('errors.apiRequired'));
        if (Number(allocatedAmount) > Number(balance)) {
          errors.push(t('errors.amountGtBalance'));
        }
      }
    }

    if (days.length === 0) errors.push(t('errors.dayRequired'));
    if (!startTime || !endTime) errors.push(t('errors.hoursRequired'));

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

    // Kayıt verisi
    if (isEdit) {
      // 🔧 Kritik: Eğer deferLock aktifse (veya bot.api hiç yoksa),
      // API ve (ilk bakiye ayırma akışıysa) initial/balance değerleri STATE'ten gönderilir.
      const useStateApiBlock = (deferLockApiAndBalance || !bot?.api);

      const effectiveApi = useStateApiBlock ? api : bot.api;
      const effectiveInitialUsd = useStateApiBlock
        ? Number(allocatedAmount)
        : (bot.initial_usd_value ?? bot.balance ?? 0);
      const effectiveBalance = useStateApiBlock ? Number(balance) : bot.balance;
      console.log("Bot:", bot);
      //console.log("bot:", bot);
      const botData = {
        id: bot?.id,
        name: botName,
        isActive,
        days,
        startTime,
        endTime,

        // 🔧 yeni/etkin alanlar
        api: effectiveApi,
        initial_usd_value: effectiveInitialUsd,
        balance: effectiveBalance,

        // Diğerleri dokunulmaz (backend uyumu için mevcutları taşıyoruz)
        period: bot.period,
        cryptos: bot.cryptos,
        candleCount: bot.candleCount,
        bot_type: bot.type,
        deposit: bot.deposit_balance,
        enterOnCurrentSignal: bot.enterOnCurrentSignal ?? bot.enter_on_current_signal ?? false,
        ...(isAcquiredLocked ? {} : { strategy: bot.strategy }),
      };
      console.log("Updating bot with data (before API):", botData);
      updateBot(botData);
      setDeferLockApiAndBalance(false);
      //toast.success(t('toast.updated'), { autoClose: 2000 });
      onClose();
      return;
    }

    // CREATE
    const botData = {
      id: bot?.id,
      name: botName,
      api,
      ...(isStrategyLocked ? {} : { strategy: selectedStrategy?.name }),
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
      enterOnCurrentSignal,
    };

    addBot(botData);
    toast.success(t('toast.created'), { autoClose: 2000 });
    onClose();
  };

return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop (Arka plan karartma ve blur) */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-5xl h-[90vh] flex flex-col bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* --- HEADER (Sabit) --- */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
          <div>
            <h2 className="text-xl font-semibold text-white tracking-wide">
              {mode === 'edit' ? t('titles.edit') : t('titles.create')}
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">Bot yapılandırmanızı aşağıdan düzenleyin.</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* --- BODY (Scrollable Grid) --- */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full flex flex-col lg:flex-row">
            
            {/* SOL TARAF: FORM (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
              <div className="space-y-6">
                
                {/* 1. Satır: İsim ve Tip */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="group">
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5 ml-1">{t('labels.botName')}</label>
                    <input
                      type="text"
                      maxLength={15}
                      placeholder={t('labels.enterBotName')}
                      className="w-full bg-zinc-900/50 text-white border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-zinc-600"
                      value={botName}
                      onChange={(e) => setBotName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5 ml-1">{t('labels.type')}</label>
                    <select
                      className={`w-full bg-zinc-900/50 text-white border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none cursor-pointer ${lockAllButCore ? 'opacity-50 cursor-not-allowed' : ''}`}
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      disabled={lockAllButCore}
                    >
                      <option value="spot">{t('types.spot')}</option>
                      <option value="futures">{t('types.futures')}</option>
                    </select>
                  </div>
                </div>

                {/* 2. Satır: API & Strateji */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-zinc-900/30 rounded-xl border border-zinc-800/50">
                  <div>
                    <label className="flex items-center gap-2 text-xs font-medium text-zinc-400 mb-1.5 ml-1">
                      <FiCpu className="text-sm" /> {t('labels.api')}
                    </label>
                    <select
                      className={`w-full bg-zinc-950 text-white border border-zinc-800 rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-blue-500 ${lockApiAndBalance ? 'opacity-50' : ''}`}
                      value={api}
                      onChange={(e) => setApi(e.target.value)}
                      disabled={lockApiAndBalance}
                    >
                      <option value="" disabled hidden>{t('labels.select')}</option>
                      {apiList.map((item, i) => (
                        <option key={i} value={item.name}>{item.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-xs font-medium text-zinc-400 mb-1.5 ml-1">
                      <FiLock className="text-zinc-400 text-sm"/> {t('labels.strategy')}
                    </label>
                    {!isStrategyLocked ? (
                      <div className="strategy-btn-wrapper">
                         {/* StrategyButton bileşenine stil giydirilmiş varsayıyoruz, yoksa wrapper ile sarmalayın */}
                         <StrategyButton onSelect={(selected) => setStrategy(selected)} />
                      </div>
                    ) : (
                      <div className="w-full bg-zinc-950 text-zinc-400 border border-zinc-800 rounded-lg px-3 py-2.5 flex items-center gap-2 opacity-70">
                        <FiLock size={14} />
                        <span className="text-sm truncate">
                          {isAcquiredLocked ? t('labels.hidden') : (displayStrategyName || t('labels.hidden'))}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Satır: Zamanlama Ayarları */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5 ml-1">{t('labels.period')}</label>
                    <select
                      className={`w-full bg-zinc-900/50 text-white border border-zinc-800 rounded-xl px-3 py-2.5 focus:ring-1 focus:ring-blue-500 ${lockAllButCore ? 'opacity-50' : ''}`}
                      value={period}
                      onChange={(e) => setPeriod(e.target.value)}
                      disabled={lockAllButCore}
                    >
                      <option value="" disabled hidden>{t('labels.select')}</option>
                      {['1m','5m','15m','30m','1h','2h','4h','1d','1w'].map(p => (
                        <option key={p} value={p}>{t(`periods.${p}`)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5 ml-1">{t('labels.candleCount')}</label>
                    <input
                      type="number"
                      min="1"
                      className={`w-full bg-zinc-900/50 text-white border border-zinc-800 rounded-xl px-3 py-2.5 focus:ring-1 focus:ring-blue-500 ${isLockedStatic ? 'opacity-50' : ''}`}
                      value={candleCount}
                      onChange={(e) => setCandleCount(Number(e.target.value))}
                      disabled={isLockedStatic}
                    />
                  </div>
                </div>

                {/* Toggle Switch: Mevcut Sinyal */}
                <div className={`flex items-center justify-between p-4 rounded-xl border border-zinc-800 bg-zinc-900/30 ${isLockedStatic ? 'opacity-50' : ''}`}>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-zinc-200">{t('labels.enterOnCurrentSignalTitle')}</span>
                    <span className="text-xs text-zinc-500">{t('labels.enterOnCurrentSignalDesc')}</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={enterOnCurrentSignal}
                      onChange={(e) => setEnterOnCurrentSignal(e.target.checked)}
                      disabled={isLockedStatic}
                    />
                    <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Günler (Chips/Tags Style) */}
                <div>
                  <label className="flex items-center gap-2 text-xs font-medium text-zinc-400 mb-2 ml-1">
                    <FiCalendar /> {t('labels.workingDays')}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {dayList.map((day) => {
                      const isSelected = days.includes(day);
                      return (
                        <button
                          key={day}
                          onClick={() => toggleDay(day)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all duration-200 
                            ${isSelected 
                              ? 'bg-blue-600/20 text-blue-400 border-blue-600/50 hover:bg-blue-600/30' 
                              : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-700 hover:text-zinc-300'}`}
                        >
                          {t(`days.${day}`)}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Bakiye Ayarı */}
                <div className={`space-y-3 p-4 rounded-xl border border-zinc-800 bg-zinc-900/20 ${lockApiAndBalance ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-zinc-300">{t('labels.allocateBalance')}</label>
                    <span className="text-xs font-mono text-zinc-500">{t('labels.totalBalance')}: <span className="text-emerald-400">${balance}</span></span>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex-1 relative">
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
                        className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                    </div>
                    <span className="text-sm font-medium text-blue-400 w-10 text-right">{percentage}%</span>
                  </div>

                  <div className="flex justify-end items-center gap-2">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
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
                        className="w-32 bg-zinc-950 border border-zinc-700 rounded-lg pl-6 pr-2 py-1.5 text-right text-white text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Çalışma Saatleri */}
                <div>
                   <div className="flex items-center justify-between mb-2">
                    <label className="flex items-center gap-2 text-xs font-medium text-zinc-400 ml-1">
                      <FiClock /> {t('labels.botWorkingHours')}
                    </label>
                    <button
                      onClick={() => { setStartTime('00:00'); setEndTime('23:59'); }}
                      className="text-xs text-blue-500 hover:text-blue-400 hover:underline"
                    >
                      {t('labels.startEndAllDay')}
                    </button>
                   </div>
                   <div className="flex items-center gap-3">
                     <input type="time" className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm focus:ring-1 focus:ring-blue-500" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                     <span className="text-zinc-600">-</span>
                     <input type="time" className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm focus:ring-1 focus:ring-blue-500" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                   </div>
                </div>

              </div>
            </div>

            {/* SAĞ TARAF: CRYPTO LIST (Sidebar Style) */}
            <div className="w-full lg:w-80 bg-zinc-900/80 border-t lg:border-t-0 lg:border-l border-zinc-800 flex flex-col h-full">
              
              {/* Arama */}
              <div className="p-4 border-b border-zinc-800">
                <label className="block text-xs font-medium text-zinc-500 mb-2 uppercase tracking-wider">{t('labels.addCryptocurrency')}</label>
                <div className="relative group">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-blue-400 transition-colors" />
                  <input
                    type="text"
                    className={`w-full bg-black/40 text-white border border-zinc-700 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-zinc-600 ${lockAllButCore ? 'opacity-50 cursor-not-allowed' : ''}`}
                    placeholder={t('labels.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    disabled={lockAllButCore}
                  />
                  
                  {/* Arama Sonuçları Dropdown */}
                  {searchQuery && !lockAllButCore && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl max-h-60 overflow-y-auto z-10">
                      {filteredCoins.length > 0 ? (
                        filteredCoins.map((coin) => (
                          <div
                            key={coin}
                            className="flex justify-between items-center px-4 py-2 hover:bg-zinc-700 cursor-pointer group/item"
                            onClick={() => {
                              // Sadece listeye ekliyoruz, search query'i SIFIRLAMIYORUZ.
                              // Böylece pencere kapanmıyor.
                              setCryptoList((prev) => {
                                  // (Opsiyonel Güvenlik) Eğer listede zaten varsa tekrar ekleme:
                                  if (prev.includes(coin)) return prev; 
                                  return [...prev, coin];
                              });
                              // setSearchQuery(''); // <-- BU SATIRI KALDIRDIK
                            }}
                          >
                            <span className="text-sm text-zinc-200 font-medium">{coin}</span>
                            <span className="text-xs text-blue-400 opacity-0 group-hover/item:opacity-100 transition-opacity">
                              {t('labels.add')}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-sm text-zinc-500 text-center">
                          {t('labels.noMatchingCrypto')}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Seçilen Listesi */}
              <div className="flex-1 overflow-y-auto p-3 scrollbar-hide">
                 <div className="flex items-center justify-between px-2 mb-2">
                    <span className="text-xs font-medium text-zinc-500"></span>
                    <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">{cryptoList.length}</span>
                 </div>
                 
                 <div className="space-y-1.5">
                    {cryptoList.length === 0 && (
                      <div className="text-center py-10 opacity-30 flex flex-col items-center">
                        <FiSearch size={24} className="mb-2"/>
                        <span className="text-sm">Henüz coin seçilmedi</span>
                      </div>
                    )}
                    {cryptoList.map((crypto) => (
                      <div key={crypto} className={`group flex justify-between items-center bg-zinc-950/50 hover:bg-zinc-800 border border-zinc-800/50 hover:border-zinc-700 px-3 py-2.5 rounded-lg transition-all ${lockAllButCore ? 'opacity-60' : ''}`}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                          <span className="text-sm text-zinc-200 font-medium">{crypto}</span>
                        </div>
                        <button
                          onClick={() => removeCrypto(crypto)}
                          disabled={lockAllButCore}
                          className="text-zinc-500 hover:text-red-400 p-1 rounded-md hover:bg-red-400/10 transition-colors"
                        >
                          <FiX size={14} />
                        </button>
                      </div>
                    ))}
                 </div>
              </div>
            </div>

          </div>
        </div>

        {/* --- FOOTER (Sabit) --- */}
        <div className="px-6 py-3 bg-zinc-900 border-t border-zinc-800 flex justify-end gap-3 z-10">
          <button
            onClick={handleSave}
            className="
              relative px-7 py-2 text-sm font-semibold 
              text-white rounded-xl 
              bg-gradient-to-r from-blue-600 to-blue-500
              shadow-[0_0_5px_rgba(37,99,235,0.35)]
              hover:shadow-[0_0_10px_rgba(37,99,235,0.55)]
              hover:scale-[1.01]
              active:scale-[0.97]
              transition-all duration-100
              flex items-center gap-2
              backdrop-blur-sm
              border border-white/10
            "
          >
            <FiCheck size={17} className="drop-shadow-sm" />
            {t("labels.save")}
          </button>
        </div>
      </div>
    </div>
  );
};
