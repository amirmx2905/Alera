import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Habit } from "../../features/habits/types";
import { HABITS_CACHE_KEY } from "./habits.helpers";

type UseHabitsCacheParams = {
  sessionUserId?: string;
  habits: Habit[];
  setHabits: React.Dispatch<React.SetStateAction<Habit[]>>;
  onSessionMissing: () => void;
};

export function useHabitsCache({
  sessionUserId,
  habits,
  setHabits,
  onSessionMissing,
}: UseHabitsCacheParams) {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    if (!sessionUserId) {
      onSessionMissing();
      setHasHydrated(false);
      return () => {
        isMounted = false;
      };
    }

    setHasHydrated(false);
    const cacheKey = `${HABITS_CACHE_KEY}${sessionUserId}`;

    AsyncStorage.getItem(cacheKey)
      .then((cached) => {
        if (!isMounted || !cached) return;
        try {
          const parsed = JSON.parse(cached) as Habit[];
          if (Array.isArray(parsed)) {
            setHabits(parsed);
          }
        } catch {
          // ignore malformed cache
        }
      })
      .catch(() => {
        // ignore cache errors; network refresh will still run
      })
      .finally(() => {
        if (!isMounted) return;
        setHasHydrated(true);
      });

    return () => {
      isMounted = false;
    };
  }, [onSessionMissing, sessionUserId, setHabits]);

  useEffect(() => {
    if (!sessionUserId || !hasHydrated) return;
    const cacheKey = `${HABITS_CACHE_KEY}${sessionUserId}`;
    AsyncStorage.setItem(cacheKey, JSON.stringify(habits)).catch(() => {
      // ignore cache write failures
    });
  }, [habits, hasHydrated, sessionUserId]);

  return { hasHydrated };
}
