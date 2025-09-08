// src/hooks/useBotAnalysis.js
import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { getBotAnalysis } from "../api/bots";

export default function useBotAnalysis(botId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // fetch on screen focus
  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        setLoading(true);
        setError(null);
        try {
          const res = await getBotAnalysis(botId);
          if (active) setData(res);
        } catch (e) {
          if (active) setError(e?.message || "Failed to load");
        } finally {
          if (active) setLoading(false);
        }
      })();
      return () => { active = false; };
    }, [botId])
  );

  // pull-to-refresh (manual)
  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await getBotAnalysis(botId);
      setData(res);
      setError(null);
    } catch (e) {
      setError(e?.message || "Failed to refresh");
    } finally {
      setRefreshing(false);
    }
  }, [botId]);

  return { data, loading, error, refreshing, refresh };
}
