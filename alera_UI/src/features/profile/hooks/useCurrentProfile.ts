import { useCallback, useEffect, useState } from "react";
import { getProfile, type Profile } from "../../../services/profile";

type UseCurrentProfileResult = {
  profile: Profile | null;
  isLoading: boolean;
  refetch: () => void;
};

export function useCurrentProfile(userId?: string): UseCurrentProfileResult {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(userId));
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    const isInitialLoad = !profile;
    if (isInitialLoad) setIsLoading(true);

    getProfile()
      .then((nextProfile) => {
        if (!isMounted) return;
        setProfile(nextProfile);
      })
      .catch(() => {
        if (!isMounted) return;
        setProfile(null);
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [userId, refreshKey]);

  return {
    profile,
    isLoading,
    refetch,
  };
}
