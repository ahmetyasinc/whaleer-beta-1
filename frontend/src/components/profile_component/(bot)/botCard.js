'use client';
import { useState, useRef, useEffect, useMemo } from 'react';
import useBotExamineStore from "@/store/bot/botExamineStore";
import { useBotStore } from "@/store/bot/botStore";
import { BotModal } from './botModal';
import { FaRegTrashAlt } from 'react-icons/fa';
import { FiEdit3 } from 'react-icons/fi';
import { BsThreeDotsVertical } from 'react-icons/bs';
import { IoSearch } from "react-icons/io5";
import RunBotToggle from './runBotToggle';
import SpinningWheel from './spinningWheel';
import ExamineBot from "./examineBot";
import { FaBan } from "react-icons/fa6";
import DeleteBotConfirmModal from "./deleteBotConfirmModal";
import ShotDownBotModal from "./shotDownBotModal";

/* ---- Type rozet stili ---- */
function getTypeBadgeClasses(type) {
  const t = (type || 'spot').toLowerCase();
  if (t === 'futures') return 'bg-amber-500/15 text-amber-300 border border-amber-700';
  return 'bg-emerald-500/15 text-emerald-300 border border-emerald-700'; // spot
}
function TypeBadge({ type }) {
  return (
    <span
      className={`px-2 py-[2px] rounded-full uppercase tracking-wide text-[10px] ${getTypeBadgeClasses(type)} shrink-0`}
      title={`Bot type: ${type || 'spot'}`}
    >
      {type || 'spot'}
    </span>
  );
}

/* ---- Geri sayım yardımcıları ---- */
function pad2(n) { return String(Math.max(0, n)).padStart(2, '0'); }
function diffParts(ms) {
  const clamped = Math.max(0, ms);
  const d = Math.floor(clamped / (24 * 3600e3));
  const h = Math.floor((clamped % (24 * 3600e3)) / 3600e3);
  const m = Math.floor((clamped % 3600e3) / 60e3);
  const s = Math.floor((clamped % 60e3) / 1e3);
  return { d, h, m, s };
}

function RentedCountdown({ rent_expires_at }) {
  const expiry = useMemo(() => rent_expires_at ? new Date(rent_expires_at).getTime() : null, [rent_expires_at]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!expiry) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [expiry]);

  const remaining = expiry ? (expiry - now) : 0;
  const expired = !expiry || remaining <= 0;
  const { d, h, m, s } = diffParts(remaining);

  return (
    <>
      <div
        className={[
          "w-full flex items-center justify-between rounded-md px-3 py-2 border",
          expired
            ? "bg-gray-800/60 border-gray-700 text-gray-400"
            : "bg-cyan-500/10 border-cyan-700 text-cyan-200"
        ].join(' ')}
        title={expired ? "Rental period ended" : "Time left on rental"}
      >
        <span className="text-[11px] uppercase tracking-wider">Rental time left :</span>
        <span className="font-mono text-sm">
          {pad2(d)}:{pad2(h)}:{pad2(m)}:{pad2(s)}
        </span>
      </div>
      <div className="h-px w-full bg-gray-700 my-2" />
    </>
  );
}

export const BotCard = ({ bot, column }) => {
  const removeBot = useBotStore((state) => state.removeBot);
  const updateBot = useBotStore((state) => state.updateBot);
  const toggleBotActive = useBotStore((state) => state.toggleBotActive);
  const { fetchAndStoreBotAnalysis } = useBotExamineStore.getState();

  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedBotId, setSelectedBotId] = useState(null);
  const [isShotDownModalOpen, setShotDownModalOpen] = useState(false);

  const [editing, setEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isExamineOpen, setIsExamineOpen] = useState(false);
  const menuRef = useRef(null);

  // RENTED kontrol + expiry
  const isRented = bot?.acquisition_type === 'RENTED';
  const expiryMs = isRented && bot?.rent_expires_at ? new Date(bot.rent_expires_at).getTime() : null;
  const isExpired = isRented && (expiryMs ? Date.now() >= expiryMs : true);
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    if (!expiryMs) return;
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [expiryMs]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- Yeni blokaj kontrolü (aktif etme ve examine için) ---
  const isBlocked =
    bot?.initial_usd_value == null ||
    bot?.current_usd_value == null ||
    (typeof bot?.api === 'undefined');

  // Toggle’ın gerçek kullanılabilirliği
  const canToggle = !(isRented && isExpired) && !isBlocked;

  // Ortak kırmızı uyarı stili (toggle alanı için)
  const redDisableWrap = !canToggle
    ? "ring-1 ring-red-700 rounded-md p-1 bg-red-500/10"
    : "";

  const disableTitle = isBlocked
    ? "Cannot activate: missing values (initial/current) or API undefined"
    : (isRented && isExpired)
      ? "Rental expired – cannot activate"
      : undefined;

  /* ==== SOL KART ==== */
  if (column === "left") {
    return (
      <>
        <div className="rounded-r-full px-4 py-4 relative border-2 border-cyan-900 bg-[hsl(227,82%,2%)] text-gray-200">
          <div className="grid grid-cols-3 gap-4">

            {/* SOL: Bot Bilgi Alanı */}
            <div className="border-r border-gray-700 pr-4">
              {/* Başlık satırı: İsim + Type + Menü */}
              <div className="flex items-center gap-2 border-b border-gray-600 pb-[10px] mb-2">
                <h3 className="text-[18px] font-semibold text-white truncate flex-1">{bot.name}</h3>
                <TypeBadge type={bot.type} />
                <div className="relative shrink-0" ref={menuRef}>
                  <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="p-2 rounded hover:bg-gray-700"
                    aria-label="More actions"
                  >
                    <BsThreeDotsVertical className="text-gray-300" size={18} />
                  </button>
                  {menuOpen && (
                    <div className="absolute right-0 top-8 w-40 bg-gray-900 rounded shadow-md z-50">
                      <button
                        onClick={() => { setEditing(true); setMenuOpen(false); }}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-blue-400 hover:bg-gray-800">
                        <FiEdit3 size={16} /> Edit
                      </button>

                      <button
                        onClick={() => { setSelectedBotId(bot.id); setDeleteModalOpen(true); setMenuOpen(false); }}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-400 hover:bg-gray-800">
                        <FaRegTrashAlt size={16} /> Delete (Dev)
                      </button>

                      <button
                        onClick={() => {
                          if (isBlocked) return;
                          setIsExamineOpen(true);
                          fetchAndStoreBotAnalysis(bot.id);
                          setMenuOpen(false);
                        }}
                        disabled={isBlocked}
                        aria-disabled={isBlocked}
                        title={isBlocked ? "Examine disabled: missing values or API undefined" : "Examine"}
                        className={[
                          "flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-700",
                          isBlocked ? "text-gray-500 cursor-not-allowed pointer-events-none" : "text-yellow-400"
                        ].join(' ')}
                      >
                        <IoSearch size={16} /> Examine
                      </button>

                      <button
                        onClick={() => { setSelectedBotId(bot.id); setShotDownModalOpen(true); setMenuOpen(false); }}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-orange-600 hover:bg-gray-700"
                        title="Shuts down the bot and all open trades">
                        <FaBan size={16} /> Shutdown
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <p className="mb-1 text-[14px]"><span className="text-stone-500">API:</span> {bot.api}</p>
              <p className="mb-1 text-[14px]"><span className="text-stone-500">Strategy:</span> {bot.strategy}</p>
              <p className="mb-1 text-[14px]"><span className="text-stone-500">Period:</span> {bot.period}</p>
              <p className="mb-1 text-[14px]">
                <span className="text-stone-500">Days:</span> {Array.isArray(bot.days) ? bot.days.join(', ') : 'Undefined'}
              </p>
              <p className="mb-1 text-[14px]"><span className="text-stone-500">Hours:</span> {bot.startTime} - {bot.endTime}</p>
              <p className="mb-1 text-[14px]">
                <span className="text-stone-500">Status:</span>{' '}
                <span className={bot.isActive ? 'text-green-400' : 'text-[rgb(216,14,14)]'}>
                  {bot.isActive ? 'Bot Active' : 'Bot Inactive'}
                </span>
              </p>
            </div>

            {/* ORTA: Countdown + Coinler */}
            <div className="flex flex-col pr-1 border-r border-gray-700 relative">
              {isRented && (
                <RentedCountdown rent_expires_at={bot?.rent_expires_at} />
              )}
              <h4 className="text-sm font-semibold mb-2 bg-gradient-to-r from-violet-900 via-sky-600 to-purple-500 text-transparent bg-clip-text">
                Cryptocurrencies
              </h4>
              <div className="h-44 overflow-y-auto mr-4 scrollbar-hide">
                {bot.cryptos?.length > 0 ? (
                  bot.cryptos.map((coin) => (
                    <div
                      key={coin}
                      className="w-full text-center text-[14px] bg-gradient-to-r from-[rgb(14,20,35)] to-neutral-800 border border-slate-700 px-2 py-1 rounded text-white mb-1"
                    >
                      {coin}
                    </div>
                  ))
                ) : (
                  <span className="text-[13px] text-gray-500">No selected coins</span>
                )}
              </div>
            </div>

            {/* SAĞ: Toggle + Spinner */}
            <div className="flex flex-col justify-center items-center relative">
              <div className="absolute flex items-center gap-3 mb-[152px] mr-[7px] z-10 pointer-events-none">
                <SpinningWheel isActive={bot.isActive} />
              </div>
              <div
                className={[
                  "flex items-center gap-3 z-20 relative",
                  (!canToggle) ? "opacity-90" : "",
                  redDisableWrap
                ].join(' ')}
                title={disableTitle}
                aria-disabled={!canToggle}
              >
                <RunBotToggle
                  checked={bot.isActive}
                  onChange={canToggle ? () => toggleBotActive(bot.id) : undefined}
                  disabled={!canToggle}
                />
              </div>
            </div>
          </div>

          {editing && <BotModal mode="edit" bot={bot} onClose={() => setEditing(false)} />}
          {isExamineOpen && <ExamineBot isOpen={isExamineOpen} onClose={() => setIsExamineOpen(false)} botId={bot.id} />}
        </div>

        <DeleteBotConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          onConfirm={() => { removeBot(selectedBotId); setSelectedBotId(null); }}
        />
        <ShotDownBotModal
          isOpen={isShotDownModalOpen}
          onClose={() => setShotDownModalOpen(false)}
          onConfirm={() => { removeBot(selectedBotId); setSelectedBotId(null); }}
        />
      </>
    );
  }

  /* ==== SAĞ KART ==== */
  return (
    <>
      <div className="rounded-l-full px-4 py-4 border-2 border-cyan-900 relative bg-[hsl(227,82%,2%)] text-gray-200">
        <div className="grid grid-cols-3 gap-4">
          {/* SOL: Toggle + Spinner */}
          <div className="flex flex-col justify-center items-center relative">
            <div className="absolute flex items-center gap-3 mb-[152px] ml-[7px] z-10 pointer-events-none scale-x-[-1]">
              <SpinningWheel isActive={bot.isActive} />
            </div>
            <div
              className={[
                "flex items-center gap-3 z-20 relative",
                (!canToggle) ? "opacity-90" : "",
                redDisableWrap
              ].join(' ')}
              title={disableTitle}
              aria-disabled={!canToggle}
            >
              <RunBotToggle
                checked={bot.isActive}
                onChange={canToggle ? () => toggleBotActive(bot.id) : undefined}
                disabled={!canToggle}
              />
            </div>
          </div>

          {/* ORTA: Countdown + Coinler */}
          <div className="flex flex-col border-x pl-4 border-gray-700">
            {isRented && (
              <RentedCountdown rent_expires_at={bot?.rent_expires_at} />
            )}
            <h4 className="text-sm font-semibold mb-2 bg-gradient-to-r from-violet-900 via-sky-600 to-purple-500 text-transparent bg-clip-text">
              Cryptocurrencies
            </h4>
            <div className="h-44 overflow-y-auto mr-4 scrollbar-hide">
              {bot.cryptos?.length > 0 ? (
                bot.cryptos.map((coin) => (
                  <div key={coin} className="w-full text-center text-[14px] bg-gradient-to-r from-[rgb(14,20,35)] to-neutral-800 border border-slate-700 px-2 py-1 rounded text-white mb-1">
                    {coin}
                  </div>
                ))
              ) : (
                <span className="text-[13px] text-gray-500">No selected coins</span>
              )}
            </div>
          </div>

          {/* SAĞ: Bilgiler */}
          <div className="border-gray-700 pr-4">
            {/* Başlık satırı: İsim + Type + Menü */}
            <div className="flex items-center gap-2 border-b border-gray-600 pb-[10px] mb-2">
              <h3 className="text-[18px] font-semibold text-white truncate flex-1">{bot.name}</h3>
              <TypeBadge type={bot.type} />
              <div className="relative shrink-0" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="p-2 rounded hover:bg-gray-700"
                  aria-label="More actions"
                >
                  <BsThreeDotsVertical className="text-gray-300" size={18} />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-8 w-40 bg-gray-900 rounded shadow-md z-50">
                    <button
                      onClick={() => { setEditing(true); setMenuOpen(false); }}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-blue-400 hover:bg-gray-800">
                      <FiEdit3 size={16} /> Edit
                    </button>

                    <button
                      onClick={() => { setSelectedBotId(bot.id); setDeleteModalOpen(true); setMenuOpen(false); }}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-400 hover:bg-gray-800">
                      <FaRegTrashAlt size={16} /> Delete (Dev)
                    </button>

                    <button
                      onClick={() => {
                        if (isBlocked) return;
                        setIsExamineOpen(true);
                        fetchAndStoreBotAnalysis(bot.id);
                        setMenuOpen(false);
                      }}
                      disabled={isBlocked}
                      aria-disabled={isBlocked}
                      title={isBlocked ? "Examine disabled: missing values or API undefined" : "Examine"}
                      className={[
                        "flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-700",
                        isBlocked ? "text-gray-500 cursor-not-allowed pointer-events-none" : "text-yellow-400"
                      ].join(' ')}
                    >
                      <IoSearch size={16} /> Examine
                    </button>

                    <button
                      onClick={() => { setSelectedBotId(bot.id); setShotDownModalOpen(true); setMenuOpen(false); }}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-orange-600 hover:bg-gray-700"
                      title="Shuts down the bot and all open trades">
                      <FaBan size={16} /> Shutdown
                    </button>
                  </div>
                )}
              </div>
            </div>

            <p className="mb-1 text-[14px]"><span className="text-stone-500">API:</span> {bot.api}</p>
            <p className="mb-1 text-[14px] flex items-center gap-1 max-w-[180px] overflow-hidden whitespace-nowrap">
              <span className="text-stone-500 shrink-0">Strategy:</span>
              <span className="truncate">{bot.strategy}</span>
            </p>
            <p className="mb-1 text-[14px]"><span className="text-stone-500">Period:</span> {bot.period}</p>
            <p className="mb-1 text-[14px]"><span className="text-stone-500">Days:</span> {Array.isArray(bot.days) ? bot.days.join(', ') : 'Undefined'}</p>
            <p className="mb-1 text-[14px]"><span className="text-stone-500">Hours:</span> {bot.startTime} - {bot.endTime}</p>
            <p className="mb-1 text-[14px]">
              <span className="text-stone-500">Status:</span>{' '}
              <span className={bot.isActive ? 'text-green-400' : 'text-[rgb(216,14,14)]'}>
                {bot.isActive ? 'Bot Active' : 'Bot Inactive'}
              </span>
            </p>
          </div>
        </div>

        {editing && <BotModal mode="edit" bot={bot} onClose={() => setEditing(false)} />}
        {isExamineOpen && <ExamineBot isOpen={isExamineOpen} onClose={() => setIsExamineOpen(false)} botId={bot.id} />}
      </div>

      <DeleteBotConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={() => { removeBot(selectedBotId); setSelectedBotId(null); }}
      />
      <ShotDownBotModal
        isOpen={isShotDownModalOpen}
        onClose={() => setShotDownModalOpen(false)}
        onConfirm={() => { removeBot(selectedBotId); setSelectedBotId(null); }}
      />
    </>
  );
};
