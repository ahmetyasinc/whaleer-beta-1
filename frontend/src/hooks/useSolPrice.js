// hooks/useSolPrice.js
"use client";

import { useEffect, useRef, useState } from "react";
import { getSolPriceUSD } from "@/services/showcase/marketData";

export default function useSolPrice(options) {
  const { refreshMs = 30000, immediate = true } = options || {};
  const [price, setPrice] = useState(null);
  const [loading, setLoading] = useState(Boolean(immediate));
  const [error, setError] = useState(null);
  const timerRef = useRef(null);
  const abortRef = useRef(null);

  async function fetchOnce() {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    setError(null);
    try {
      const p = await getSolPriceUSD(abortRef.current.signal);
      if (p === null) {
        setError("SOL price could not be fetched.");
      }
      setPrice(p);
    } catch (e) {
      setError(e?.message || "Failed to fetch SOL price.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (immediate) fetchOnce();

    if (refreshMs > 0) {
      timerRef.current = setInterval(fetchOnce, refreshMs);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshMs, immediate]);

  return { price, loading, error, refetch: fetchOnce };
}
