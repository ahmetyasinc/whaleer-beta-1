// src/store/showcase/showcaseStore.js
import { create } from "zustand";
import { fetchShowcase, followBot as apiFollowBot } from "../../api/showcase";

// Backend'in null-temelli default filtreleri
const DEFAULT_FILTERS = {
  bot_type: null,
  active: null,
  min_sell_price: null,
  max_sell_price: null,
  min_rent_price: null,
  max_rent_price: null,
  min_profit_factor: null,
  max_risk_factor: null,
  min_created_minutes_ago: null,
  min_trade_frequency: null,
  min_profit_margin: null,
  profit_margin_unit: null,
  min_uptime_minutes: null,
  demand: null,
  limit: 5,
};

// Her batch için benzersiz _key üret
function normalizeBatch(arr, serialStart = 0) {
  const safe = Array.isArray(arr) ? arr : [];
  return safe.map((it, i) => {
    const bid = it?.bot?.bot_id ?? "x";
    const uid = it?.user?.id ?? "u";
    // base aynı olsa da her gelişte farklı seri eklenir -> uniq key
    const _key = `${bid}:${uid}#${serialStart + i}`;
    return { ...it, _key };
  });
}

const useShowcaseStore = create((set, get) => ({
  // --- STATE ---
  items: [],              // [{ user, bot, chartData, tradingData, _key }]
  loading: false,
  refreshing: false,
  error: null,
  filters: { ...DEFAULT_FILTERS },
  fetchCycle: 0,          // kaçıncı "loadMore" çağrısı
  keySerial: 0,           // benzersiz _key üretimi için global sayaç

  // --- HELPERS ---
  _appendBatch(raw) {
    const { keySerial } = get();
    const normalized = normalizeBatch(raw, keySerial);
    set({
      items: [...get().items, ...normalized],     // DİKKAT: DEDUPE YOK!
      keySerial: keySerial + normalized.length,   // sayaç ilerlet
    });
  },

  // --- ACTIONS ---
  reset: () =>
    set({
      items: [],
      error: null,
      fetchCycle: 0,
      keySerial: 0,
      filters: { ...DEFAULT_FILTERS },
    }),

  firstLoad: async () => {
    set({ loading: true, error: null, items: [], fetchCycle: 0, keySerial: 0 });
    try {
      const payload = { ...get().filters, limit: get().filters.limit || 5 };
      const raw = await fetchShowcase(payload);
      const normalized = normalizeBatch(raw, 0);
      set({
        items: normalized,
        loading: false,
        fetchCycle: 1,
        keySerial: normalized.length,
      });
    } catch (e) {
      set({ loading: false, error: e?.message || "Showcase yüklenemedi" });
    }
  },

  refresh: async () => {
    set({ refreshing: true, error: null, keySerial: 0 });
    try {
      const payload = { ...get().filters, limit: get().filters.limit || 5 };
      const raw = await fetchShowcase(payload);
      const normalized = normalizeBatch(raw, 0);
      set({
        items: normalized,
        refreshing: false,
        fetchCycle: 1,
        keySerial: normalized.length,
      });
    } catch (e) {
      set({ refreshing: false, error: e?.message || "Yenileme başarısız" });
    }
  },

  loadMore: async () => {
    // Paralel istekleri engelle
    if (get().loading) return;
    set({ loading: true, error: null });
    try {
      const payload = { ...get().filters, limit: get().filters.limit || 5 };
      const raw = await fetchShowcase(payload);
      // AYNI BOT GELSİN, FARK ETMEZ → SONUNA EKLE
      get()._appendBatch(raw);
      set({ loading: false, fetchCycle: get().fetchCycle + 1 });
    } catch (e) {
      set({ loading: false, error: e?.message || "Daha fazla veri alınamadı" });
    }
  },

  applyFilters: async (nextFilters) => {
    // filtre değişince tam sıfırdan yükle (keySerial reset)
    const normalized = { ...DEFAULT_FILTERS, ...(nextFilters || {}) };
    if (normalized.limit == null) normalized.limit = 5;
    set({ filters: normalized });
    await get().firstLoad();
  },

  followBot: async (bot_id) => {
    if (!bot_id) return false;
    try {
      await apiFollowBot(bot_id);
      // Aynı bot birden fazla kez listede olabilir -> hepsini "followed" yap
      const updated = get().items.map((it) =>
        it?.bot?.bot_id === bot_id ? { ...it, followed: true } : it
      );
      set({ items: updated });
      return true;
    } catch (e) {
      set({ error: e?.message || "Takip edilemedi" });
      return false;
    }
  },

  setLimit: (n) =>
    set({ filters: { ...get().filters, limit: Number(n) || 5 } }),
}));

export default useShowcaseStore;
