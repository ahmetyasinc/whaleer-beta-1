// services/marketData.js
export async function getSolPriceUSD(signal) {
  // 1) Binance (tercih)
  try {
    const r = await fetch("https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT", { signal });
    if (r.ok) {
      const j = await r.json();
      const p = parseFloat(j.price);
      if (!Number.isNaN(p)) return p;
    }
  } catch (e) { /* ignore, fallthrough */ }

  // 2) CoinGecko (yedek)
  try {
    const r = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd", { signal });
    if (r.ok) {
      const j = await r.json();
      const p = parseFloat(j?.solana?.usd);
      if (!Number.isNaN(p)) return p;
    }
  } catch (e) { /* ignore */ }

  return null; // bulunamadı
}
