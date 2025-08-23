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

  useEffect(() => {
    (async () => {
      fetchProfile();
    })();
  }, [fetchProfile]);

  const refresh = useCallback(async () => {

    setRefreshing(true);
    try {

      await fetchProfile({ keepSelection: true, currentSelectedId: selectedApiId });

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
