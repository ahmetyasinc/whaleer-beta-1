'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiLink, FiXCircle, FiCheckCircle, FiRefreshCw } from 'react-icons/fi';
import api from '@/api/axios';

/**
 * Telegram bağlantı kutusu
 * - Backend uçları:
 *   GET  /api/notifications/telegram/status -> { connected: boolean, username?: string, chat_id?: number }
 *   POST /api/notifications/telegram/link   -> { deep_link?: string } veya { bot_username, start_param }
 *   POST /api/notifications/telegram/unlink -> 204/200
 *
 * Props:
 * - className?: ek stil
 * - onChange?: (state) => void  // connected durumu değişince haber verir
 */
export default function TelegramConnect({ className = '', onChange }) {
  const { t } = useTranslation('settings');

  const [state, setState] = useState({
    connected: false,
    username: null,
    chatId: null,
    loading: true,
    working: false,
    error: null,
  });

  const setPartial = (patch) =>
    setState((s) => ({ ...s, ...patch }));

  useEffect(() => {
    refreshStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshStatus() {
    try {
      setPartial({ loading: true, error: null });
      const { data } = await api.get('/api/notifications/telegram/status');
      const next = {
        connected: !!data?.connected,
        username: data?.username || null,
        chatId: data?.chat_id || null,
        loading: false,
        working: false,
        error: null,
      };
      setState((prev) => next);
      onChange && onChange(next);
    } catch (e) {
      console.error(e);
      setPartial({
        loading: false,
        error: t('telegram.errors.status'),
      });
    }
  }

  async function handleConnect() {
    try {
      setPartial({ working: true, error: null });
      const { data } = await api.post('/api/notifications/telegram/link');

      // Tercihen backend doğrudan deep_link döndürsün:
      // { deep_link: "https://t.me/WhaleerBot?start=abc123" }
      let deepLink = data?.deep_link;
      if (!deepLink && data?.bot_username && data?.start_param) {
        deepLink = `https://t.me/${data.bot_username}?start=${encodeURIComponent(
          data.start_param
        )}`;
      }
      if (!deepLink) throw new Error('Missing deep link');

      window.open(deepLink, '_blank', 'noopener,noreferrer');
      // Kullanıcı /start’a bastıktan sonra “Durumu Yenile” ile senkronlar.
    } catch (e) {
      console.error(e);
      setPartial({ error: t('telegram.errors.link') });
    } finally {
      setPartial({ working: false });
    }
  }

  async function handleDisconnect() {
    try {
      setPartial({ working: true, error: null });
      await api.post('/api/notifications/telegram/unlink');
      await refreshStatus();
    } catch (e) {
      console.error(e);
      setPartial({ error: t('telegram.errors.unlink') });
    } finally {
      setPartial({ working: false });
    }
  }

return (
  <section
    className={`relative overflow-hidden rounded-2xl border border-zinc-800/80 
    bg-gradient-to-br from-zinc-950/90 via-zinc-900/80 to-zinc-950/90 
    p-5 sm:p-6 shadow-xl shadow-black/40 ${className}`}
  >

    {/* Üst mavi glow çizgisi */}
    <div className="pointer-events-none absolute inset-x-0 top-0 h-px 
      bg-gradient-to-r from-blue-500/0 via-blue-500/60 to-blue-500/0" />

    {/* Arka plan blur efekt */}
    <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 
      rounded-full bg-blue-500/10 blur-3xl" />

    <h2 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
      {t("notifications")}
    </h2>

    <div className="flex items-start justify-between gap-4">

      {/* Sol taraf açıklama */}
      <div className="space-y-1">
        <p className="font-medium flex items-center gap-2 text-zinc-200">
          {t("telegram.title")}
          {state.connected && (
            <FiCheckCircle className="text-blue-400" title={t("telegram.connected")} />
          )}
        </p>

        <p className="text-sm text-zinc-400">
          {state.connected ? t("telegram.connected_hint") : t("telegram.connect_hint")}
        </p>

        {state.connected && (
          <p className="text-xs text-zinc-500">
            {t("telegram.account")}:{" "}
            {state.username ? `@${state.username}` : state.chatId}
          </p>
        )}

        {state.error && (
          <div className="text-sm text-rose-400 mt-1">{state.error}</div>
        )}
      </div>

      {/* Sağ taraf butonlar */}
      <div className="flex items-center gap-2">

        {!state.connected ? (
          <>
            {/* Connect */}
            <button
              onClick={handleConnect}
              disabled={state.working || state.loading}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
              transition-all duration-200
              ${
                state.working || state.loading
                  ? "bg-zinc-900/80 text-zinc-500 ring-1 ring-zinc-800/80 cursor-not-allowed opacity-60"
                  : "bg-blue-600/90 text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0"
              }`}
            >
              <FiLink />
              {state.working ? t("telegram.connecting") : t("telegram.connect")}
            </button>

            {/* Refresh */}
            <button
              onClick={refreshStatus}
              disabled={state.working}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
              bg-zinc-900/60 text-zinc-300 border border-zinc-800 transition-all
              hover:bg-zinc-800 hover:text-white
              disabled:opacity-50`}
            >
              <FiRefreshCw />
              {t("telegram.refresh")}
            </button>
          </>
        ) : (
          <>
            {/* Disconnect */}
            <button
              onClick={handleDisconnect}
              disabled={state.working}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
              transition-all duration-200
              ${
                state.working
                  ? "bg-zinc-900/80 text-zinc-500 ring-1 ring-zinc-800/80 cursor-not-allowed opacity-60"
                  : "bg-rose-600/90 text-white shadow-lg shadow-rose-600/30 hover:bg-rose-500 hover:shadow-rose-500/40 hover:-translate-y-0.5 active:translate-y-0"
              }`}
            >
              <FiXCircle />
              {state.working ? t("telegram.disconnecting") : t("telegram.disconnect")}
            </button>

            {/* Refresh */}
            <button
              onClick={refreshStatus}
              disabled={state.working}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
              bg-zinc-900/60 text-zinc-300 border border-zinc-800 transition-all
              hover:bg-zinc-800 hover:text-white
              disabled:opacity-50`}
            >
              <FiRefreshCw />
              {t("telegram.refresh")}
            </button>
          </>
        )}
      </div>
    </div>
  </section>
);

}
