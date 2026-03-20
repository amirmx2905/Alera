import { useEffect, useState } from "react";
import { getProfile, type Profile } from "../../../services/profile";

type UseCurrentProfileResult = {
  profile: Profile | null;
  isLoading: boolean;
};

export function useCurrentProfile(userId?: string): UseCurrentProfileResult {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(userId));

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

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
  }, [userId]);

  return {
    profile,
    isLoading,
  };
}
