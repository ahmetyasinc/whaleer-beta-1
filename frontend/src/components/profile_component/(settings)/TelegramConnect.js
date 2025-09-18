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
    <section className={`rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 ${className}`}>
      <h2 className="text-lg font-medium mb-4">
        {t('notifications')}
      </h2>

      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="font-medium flex items-center gap-2">
            {t('telegram.title')}
            {state.connected && (
              <FiCheckCircle className="text-emerald-400" title={t('telegram.connected')} />
            )}
          </p>

          <p className="text-sm text-zinc-400">
            {state.connected ? t('telegram.connected_hint') : t('telegram.connect_hint')}
          </p>

          {state.connected && (
            <p className="text-xs text-zinc-500">
              {t('telegram.account')}: {state.username ? `@${state.username}` : state.chatId}
            </p>
          )}

          {state.error && (
            <div className="text-sm text-rose-300 mt-1">{state.error}</div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!state.connected ? (
            <>
              <button
                onClick={handleConnect}
                disabled={state.working || state.loading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors duration-200 disabled:opacity-60"
              >
                <FiLink />
                {state.working ? t('telegram.connecting') : t('telegram.connect')}
              </button>
              <button
                onClick={refreshStatus}
                disabled={state.working}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white border border-zinc-600 transition-colors"
                title={t('telegram.refresh_status')}
              >
                <FiRefreshCw />
                {t('telegram.refresh')}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleDisconnect}
                disabled={state.working}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-colors duration-200 disabled:opacity-60"
              >
                <FiXCircle />
                {state.working ? t('telegram.disconnecting') : t('telegram.disconnect')}
              </button>
              <button
                onClick={refreshStatus}
                disabled={state.working}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white border border-zinc-600 transition-colors"
                title={t('telegram.refresh_status')}
              >
                <FiRefreshCw />
                {t('telegram.refresh')}
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
