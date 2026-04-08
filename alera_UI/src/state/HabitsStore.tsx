import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Alert } from "react-native";
import { useAuth } from "./AuthStore";
import { listStreakMetrics } from "../features/habits/services/metrics";
import {
  createHabitRecord,
  type CreateHabitWithGoalPayload,
  type HabitCategory,
  type HabitsContextValue,
  loadHabitCategories,
  loadHabitsData,
  refreshHabitMetrics,
  readCachedHabits,
  removeHabitRecord,
  toggleHabitArchiveStatus,
  writeCachedHabits,
} from "../features/habits/habitsStoreData";
import type { Entry, Habit } from "../features/habits/types";
import { getCdmxDateKey, toLocalDateKey } from "../features/habits/utils/dates";
import {
  calculateLocalStreak,
  getExpectedMetricDate,
} from "../features/habits/utils/habitStreaks";

// --- Split contexts ---

type HabitsDataValue = {
  habits: Habit[];
  isLoading: boolean;
  streaksByHabitId: Record<string, number>;
  isStreaksLoading: boolean;
  categories: HabitCategory[];
  isCategoriesLoading: boolean;
};

type HabitsActionsValue = {
  refreshHabits: () => Promise<void>;
  refreshStreaks: () => Promise<void>;
  createHabitWithGoal: (payload: CreateHabitWithGoalPayload) => Promise<void>;
  addEntry: (habitId: string, entry: Entry) => void;
  updateEntry: (habitId: string, entryId: string, amount: number) => void;
  deleteEntry: (habitId: string, entryId: string) => void;
  toggleArchive: (id: string) => Promise<void>;
  removeHabit: (id: string) => Promise<void>;
};

const HabitsDataContext = createContext<HabitsDataValue | null>(null);
const HabitsActionsContext = createContext<HabitsActionsValue | null>(null);

export function HabitsProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const sessionUserId = session?.user.id;
  const [habits, setHabits] = useState<Habit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<HabitCategory[]>([]);
  const [categoryMap, setCategoryMap] = useState<Record<string, string>>({});
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(true);
  const [streaksByHabitId, setStreaksByHabitId] = useState<
    Record<string, number>
  >({});
  const [isStreaksLoading, setIsStreaksLoading] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);
  const habitsRef = useRef<Habit[]>([]);

  useEffect(() => {
    habitsRef.current = habits;
  }, [habits]);

  const clearStreaks = useCallback(() => {
    setStreaksByHabitId({});
    setIsStreaksLoading(false);
  }, []);

  const onSessionMissing = useCallback(() => {
    setHabits([]);
    setIsLoading(false);
    clearStreaks();
  }, [clearStreaks]);

  const refreshCategories = useCallback(async () => {
    const { nextCategories, nextMap } = await loadHabitCategories();
    setCategories(nextCategories);
    setCategoryMap(nextMap);
    return nextMap;
  }, []);

  const refreshStreaks = useCallback(async () => {
    if (!sessionUserId) {
      clearStreaks();
      return;
    }

    setIsStreaksLoading(true);
    try {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - 120);
      const metrics = await listStreakMetrics(toLocalDateKey(fromDate));
      const latestByHabit: Record<string, { date: string; value: number }> = {};
      const todayKey = getCdmxDateKey();

      for (const metric of metrics) {
        if (!metric.habit_id) continue;
        const current = latestByHabit[metric.habit_id];
        if (!current || metric.date > current.date) {
          latestByHabit[metric.habit_id] = {
            date: metric.date,
            value: Number(metric.value ?? 0),
          };
        }
      }

      setStreaksByHabitId(
        habitsRef.current.reduce<Record<string, number>>((acc, habit) => {
          const payload = latestByHabit[habit.id];
          const expectedDate = getExpectedMetricDate(habit.goalType, todayKey);
          acc[habit.id] =
            !payload || payload.date < expectedDate
              ? calculateLocalStreak(
                  habit.entries,
                  habit.goalType,
                  habit.goalAmount,
                )
              : payload.value;
          return acc;
        }, {}),
      );
    } finally {
      setIsStreaksLoading(false);
    }
  }, [clearStreaks, sessionUserId]);

  const updateHabitEntries = useCallback(
    (habitId: string, transformEntries: (entries: Entry[]) => Entry[]) => {
      setHabits((current) =>
        current.map((habit) => {
          if (habit.id !== habitId) return habit;
          const entries = transformEntries(habit.entries);
          setStreaksByHabitId((prev) => ({
            ...prev,
            [habitId]: calculateLocalStreak(
              entries,
              habit.goalType,
              habit.goalAmount,
            ),
          }));
          return { ...habit, entries };
        }),
      );
    },
    [],
  );

  const addEntry = useCallback(
    (habitId: string, entry: Entry) =>
      updateHabitEntries(habitId, (entries) => [...entries, entry]),
    [updateHabitEntries],
  );

  const updateEntry = useCallback(
    (habitId: string, entryId: string, amount: number) =>
      updateHabitEntries(habitId, (entries) =>
        entries.map((entry) =>
          entry.id === entryId ? { ...entry, amount } : entry,
        ),
      ),
    [updateHabitEntries],
  );

  const deleteEntry = useCallback(
    (habitId: string, entryId: string) =>
      updateHabitEntries(habitId, (entries) =>
        entries.filter((entry) => entry.id !== entryId),
      ),
    [updateHabitEntries],
  );

  const refreshHabits = useCallback(async () => {
    if (!sessionUserId) {
      setHabits([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const mappedHabits = await loadHabitsData();
      setHabits(mappedHabits);
      await refreshHabitMetrics();
      await refreshStreaks();
    } finally {
      setIsLoading(false);
    }
  }, [refreshStreaks, sessionUserId]);

  const createHabitWithGoal = useCallback(
    async (payload: CreateHabitWithGoalPayload) => {
      let categoryId = categoryMap[payload.category] ?? null;
      if (!categoryId) {
        const nextMap = await refreshCategories();
        categoryId = nextMap[payload.category] ?? null;
      }

      const habit = await createHabitRecord(payload, categoryId);
      setHabits((current) => [habit, ...current]);
    },
    [categoryMap, refreshCategories],
  );

  const toggleArchive = useCallback(
    async (id: string) => {
      const habit = habitsRef.current.find((item) => item.id === id);
      if (!habit) return;

      // Optimistic update
      setHabits((current) =>
        current.map((item) =>
          item.id === id ? { ...item, archived: !item.archived } : item,
        ),
      );

      try {
        await toggleHabitArchiveStatus(id, Boolean(habit.archived));
      } catch {
        // Rollback on failure
        setHabits((current) =>
          current.map((item) =>
            item.id === id ? { ...item, archived: habit.archived } : item,
          ),
        );
        Alert.alert("Error", "Failed to update habit. Please try again.");
      }
    },
    [],
  );

  const removeHabit = useCallback(async (id: string) => {
    const previous = habitsRef.current;

    // Optimistic update
    setHabits((current) => current.filter((item) => item.id !== id));

    try {
      await removeHabitRecord(id);
    } catch {
      // Rollback on failure
      setHabits(previous);
      Alert.alert("Error", "Failed to remove habit. Please try again.");
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    setIsCategoriesLoading(true);
    refreshCategories()
      .catch(() => {
        if (!isMounted) return;
        setCategories([]);
        setCategoryMap({});
      })
      .finally(() => {
        if (isMounted) setIsCategoriesLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [refreshCategories]);

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
    readCachedHabits(sessionUserId)
      .then((cached) => {
        if (isMounted && cached) setHabits(cached);
      })
      .catch(() => {
        // ignore cache errors; network refresh will still run
      })
      .finally(() => {
        if (isMounted) setHasHydrated(true);
      });

    return () => {
      isMounted = false;
    };
  }, [onSessionMissing, sessionUserId]);

  useEffect(() => {
    if (!sessionUserId || !hasHydrated) return;
    writeCachedHabits(sessionUserId, habits).catch(() => {
      // ignore cache write failures
    });
  }, [habits, hasHydrated, sessionUserId]);

  useEffect(() => {
    if (!sessionUserId) {
      setHabits([]);
      setIsLoading(false);
      return;
    }
    if (!hasHydrated) return;
    refreshHabits().catch(() => {
      // ignore initial load failures here; UI can retry later
    });
  }, [hasHydrated, refreshHabits, sessionUserId]);

  useEffect(() => {
    if (!sessionUserId || !hasHydrated) return;
    refreshStreaks().catch(() => {
      // ignore streak refresh failures here
    });
  }, [hasHydrated, refreshStreaks, sessionUserId]);

  const dataValue = useMemo<HabitsDataValue>(
    () => ({
      habits,
      isLoading,
      streaksByHabitId,
      isStreaksLoading,
      categories,
      isCategoriesLoading,
    }),
    [habits, isLoading, streaksByHabitId, isStreaksLoading, categories, isCategoriesLoading],
  );

  const actionsValue = useMemo<HabitsActionsValue>(
    () => ({
      refreshHabits,
      refreshStreaks,
      createHabitWithGoal,
      addEntry,
      updateEntry,
      deleteEntry,
      toggleArchive,
      removeHabit,
    }),
    [
      refreshHabits,
      refreshStreaks,
      createHabitWithGoal,
      addEntry,
      updateEntry,
      deleteEntry,
      toggleArchive,
      removeHabit,
    ],
  );

  return (
    <HabitsDataContext.Provider value={dataValue}>
      <HabitsActionsContext.Provider value={actionsValue}>
        {children}
      </HabitsActionsContext.Provider>
    </HabitsDataContext.Provider>
  );
}

/** Read-only data — re-renders only when habits/streaks/categories change */
export function useHabitsData() {
  const context = useContext(HabitsDataContext);
  if (!context) {
    throw new Error("useHabitsData must be used within HabitsProvider");
  }
  return context;
}

/** Stable action callbacks — almost never triggers a re-render */
export function useHabitsActions() {
  const context = useContext(HabitsActionsContext);
  if (!context) {
    throw new Error("useHabitsActions must be used within HabitsProvider");
  }
  return context;
}

/** Combined hook — backwards-compatible, re-renders on any change */
export function useHabits(): HabitsContextValue {
  const data = useHabitsData();
  const actions = useHabitsActions();
  return useMemo(() => ({ ...data, ...actions }), [data, actions]);
}
