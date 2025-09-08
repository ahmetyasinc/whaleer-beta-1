// src/hooks/useProfile.js
import { useCallback, useEffect, useState } from "react";
import useProfileStore from "../store/profile/profileStore";

export default function useProfile() {
  const {
    data, loading, error,
    fetchProfile, selectedApiId, setSelectedApiId,
    perfSummary, activeTab, setActiveTab
  } = useProfileStore();

  const [refreshing, setRefreshing] = useState(false);

  // Mount olduğunda sadece veri YOKSA çek
  useEffect(() => {
    if (!data && !loading && !error) {
      fetchProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, loading, error, fetchProfile]);

  // Pull-to-refresh: zorla yenile (keepSelection korunur)
  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchProfile({
        keepSelection: true,
        currentSelectedId: selectedApiId,
        force: true,               // store "force" destekliyorsa kullan, değilse yok sayılır
      });
    } finally {
      setRefreshing(false);
    }
  }, [fetchProfile, selectedApiId]);

  return {
    data, loading, error,
    selectedApiId, setSelectedApiId,
    perfSummary,
    activeTab, setActiveTab,
    refreshing, refresh,
  };
}
