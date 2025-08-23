const BASE_URL = "http://13.62.20.65:8000";

export async function fetchHeroInfos() {
  try {
    const res = await fetch(`${BASE_URL}/api/hero-infos/`);
    if (!res.ok) throw new Error("HTTP " + res.status);
    return await res.json();
  } catch (e) {
    return { user_count: 0, trader_count: 0, strategy_count: 0, bot_count: 0 };
  }
}
