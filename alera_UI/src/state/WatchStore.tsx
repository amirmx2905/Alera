import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "./AuthStore";
import { useHabits } from "./HabitsStore";
import {
  onWatchLogReceived,
  onWatchUnlogReceived,
  pushHabitsToWatch,
  subscribeToWatchStatus,
  type WatchHabit,
  type WatchStatus,
} from "../services/watchBridge";
import { createLog, deleteLog } from "../features/habits/services/logs";
import { toLocalDateKey } from "../features/habits/utils/dates";
import type { Habit } from "../features/habits/types";

type WatchContextValue = {
  status: WatchStatus;
  syncNow: () => void;
};

const DEFAULT_STATUS: WatchStatus = {
  isPaired: false,
  isInstalled: false,
  isReachable: false,
};

const WatchContext = createContext<WatchContextValue | null>(null);

function entryDateKey(rawDate: string): string {
  if (rawDate.length >= 10) return rawDate.slice(0, 10);
  return rawDate;
}

export function WatchStoreProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const { habits, addEntry, deleteEntry } = useHabits();
  const [status, setStatus] = useState<WatchStatus>(DEFAULT_STATUS);

  const habitsRef = useRef<Habit[]>(habits);
  useEffect(() => {
    habitsRef.current = habits;
  }, [habits]);

  useEffect(() => {
    const unsubscribe = subscribeToWatchStatus(setStatus);
    return unsubscribe;
  }, []);

  const watchHabits = useMemo<WatchHabit[]>(() => {
    const todayKey = toLocalDateKey(new Date());
    return habits
      .filter((habit) => !habit.archived)
      .map((habit) => {
        const todayValue = habit.entries.reduce((acc, entry) => {
          return entryDateKey(entry.date) === todayKey ? acc + entry.amount : acc;
        }, 0);
        return {
          id: habit.id,
          name: habit.name,
          type: habit.type,
          unit: habit.unit,
          goalAmount: habit.goalAmount,
          todayValue,
        };
      });
  }, [habits]);

  useEffect(() => {
    if (!status.isPaired) return;
    void pushHabitsToWatch(watchHabits);
  }, [status.isPaired, watchHabits]);

  useEffect(() => {
    if (!session?.user) return;

    const unsubscribeLog = onWatchLogReceived(async (message) => {
      try {
        const log = await createLog(message.habitId, {
          value: message.value,
          source: "watch",
        });
        addEntry(message.habitId, {
          id: log.id,
          date: log.logged_at ?? log.created_at,
          amount: log.value,
        });
      } catch (err) {
        console.warn("Failed to create log from watch:", err);
      }
    });

    const unsubscribeUnlog = onWatchUnlogReceived(async (message) => {
      try {
        const todayKey = toLocalDateKey(new Date());
        const habit = habitsRef.current.find((h) => h.id === message.habitId);
        if (!habit) return;
        const todayEntries = habit.entries.filter(
          (entry) => entryDateKey(entry.date) === todayKey,
        );
        if (todayEntries.length === 0) return;
        await Promise.all(
          todayEntries.map((entry) => deleteLog(message.habitId, entry.id)),
        );
        todayEntries.forEach((entry) => deleteEntry(message.habitId, entry.id));
      } catch (err) {
        console.warn("Failed to unlog habit from watch:", err);
      }
    });

    return () => {
      unsubscribeLog();
      unsubscribeUnlog();
    };
  }, [session?.user, addEntry, deleteEntry]);

  const syncNow = useCallback(() => {
    void pushHabitsToWatch(watchHabits);
  }, [watchHabits]);

  const value = useMemo<WatchContextValue>(
    () => ({ status, syncNow }),
    [status, syncNow],
  );

  return <WatchContext.Provider value={value}>{children}</WatchContext.Provider>;
}

export function useWatch(): WatchContextValue {
  const ctx = useContext(WatchContext);
  if (!ctx) throw new Error("useWatch must be used within WatchStoreProvider");
  return ctx;
}
