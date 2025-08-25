import axios from "axios";
import { useSessionStore } from "@/store/profile/sessionStore";
import { useProfileStore } from "@/store/profile/profileStore";
import { useAccountDataStore } from "@/store/profile/accountDataStore";
import useIndicatorStore from "@/store/indicator/indicatorStore";
import useStrategyStore from "@/store/indicator/strategyStore";
import { useBotStore } from "@/store/bot/botStore";

// Aynı anda çoklu çağrıları tek promiselık havuzda toplamak için:
let bootPromise = null;

function hasAnyAccountData(state) {
  const maps = [
    state.snapshotsByApiId,
    state.portfolioByApiId,
    state.tradesByApiId,
    state.botsByApiId,
  ];
  return maps.some((m) => m && Object.keys(m).length > 0);
}

export async function bootstrapProfile() {
  axios.defaults.withCredentials = true;

  const { data } = await axios.get(
    `${process.env.NEXT_PUBLIC_API_URL}/api/profile`,
    { withCredentials: true }
  );

  // 1) user
  useSessionStore.setState({ user: data.user || null });

  // 2) apis + active
  const apiBlocks = Array.isArray(data.apis) ? data.apis : [];
  const apis = apiBlocks.map((x) => x.api);
  const defaultApi = apis.find((a) => a?.default) || apis[0] || null;

  useProfileStore.setState({
    apis,
    activeApiId: defaultApi?.id ?? null,
  });

  // 3) api-bazlı haritalar
  const snapshots = {};
  const portfolio = {};
  const trades = {};
  const bots = {};

  for (const block of apiBlocks) {
    const apiId = block?.api?.id;
    if (!apiId) continue;

    // snapshots
    snapshots[apiId] = (block.snapshots || []).map((s) => ({
      x: new Date(s.timestamp),
      y: Number(s.usd_value || 0),
    }));

    // portfolio (holdings + positions)
    const holdings = block.portfolio?.holdings_merged || [];
    const positions = block.portfolio?.positions_merged || [];
    portfolio[apiId] = [
      ...holdings.map((h) => ({
        symbol: h.symbol,
        name: h.symbol,
        amount: Number(h.amount || 0),
        cost: Number(h.average_cost || 0),
        profitLoss: Number(h.profit_loss || 0),
      })),
      ...positions.map((p) => ({
        symbol: p.symbol,
        name: p.symbol,
        amount: Number(p.amount || 0),
        cost: Number(p.average_cost || 0),
        profitLoss: Number(p.profit_loss || 0),
        _isPosition: true,
        position_side: p.position_side,
        leverage: p.leverage,
      })),
    ];

    // trades
    trades[apiId] = (block.trades || []).map((tx) => ({
      symbol: tx.symbol,
      type: String(tx.trade_type || "").toLowerCase(), // spot | futures
      direction: String(tx.side || "").toLowerCase(),  // buy | sell
      date: tx.created_at,
      price: Number(tx.price || 0),
      amount: Number(tx.amount || 0),
      position_side: tx.position_side,
      bot_id: tx.bot_id,
    }));

    // bots (senin yeni şemana göre)
    bots[apiId] = (block.bots || []).map((b) => ({
      id: b.bot.id,
      name: b.bot.name,
      api_id: b.bot.api_id,
      created_at: b.bot.created_at,
      active: b.bot.active,
      initial_usd_value: b.bot.initial_usd_value,
      current_usd_value: b.bot.current_usd_value,
      profit_usd: b.bot.profit_usd,
      profit_percent: b.bot.profit_percent,
    }));
  }

  // 4) account data store’u toplu hydrate + işaretle
  useAccountDataStore.getState().hydrateAll({
    snapshots,
    portfolio,
    trades,
    bots,
  });

  // 5) indicators & strategies
  useIndicatorStore.setState((state) => ({
    indicators: data.indicators || [],
    tecnic: state.tecnic,
    community: state.community,
    favorites: [
      ...state.favorites,
      ...(data.indicators || []).filter((i) => i.favorite),
    ],
  }));

  useStrategyStore.setState((state) => {
    const personal = data.strategies || [];
    const all_strategies = [...state.tecnic, ...personal, ...state.community];
    return {
      strategies: personal,
      all_strategies,
      favorites: [
        ...state.favorites,
        ...personal.filter((s) => s.favorite),
      ],
    };
  });

  // 6) opsiyonel: botStore cache (UI okumuyor ama istersen tut)
  useBotStore.getState().hydrateFromProfileMaps(bots);
}

/**
 * İhtiyaç varsa boot et. Daha önce hydrate edilmişse (ve veri varsa) yeniden fetch yapmaz.
 * Aynı anda birden fazla çağrı gelirse tek Promise döner.
 */
export function bootstrapProfileIfNeeded() {
  const acc = useAccountDataStore.getState();
  if (acc.isHydrated && hasAnyAccountData(acc)) {
    // zaten var → hiçbir şey yapma
    return Promise.resolve();
  }

  // halen bir boot işlemi çalışıyorsa onu döndür
  if (bootPromise) return bootPromise;

  bootPromise = bootstrapProfile()
    .catch((err) => {
      // hata durumunda bir sonraki denemeye izin vermek için promise'ı sıfırla
      bootPromise = null;
      throw err;
    })
    .then((res) => {
      // başarıyla bitti → yeni istekler için sıfırla
      bootPromise = null;
      return res;
    });

  return bootPromise;
}
