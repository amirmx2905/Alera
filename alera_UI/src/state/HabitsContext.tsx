import React, {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Entry, Habit } from "../features/habits/types";
import { listHabitCategories } from "../features/habits/services/habitCategories";
import {
  createHabit,
  deleteHabit,
  listHabits,
  updateHabit,
} from "../features/habits/services/habits";
import { listLogsForHabits } from "../features/habits/services/logs";
import { upsertGoal } from "../features/habits/services/goals";
import {
  listStreakMetrics,
  recalculateProfileMetrics,
} from "../features/habits/services/metrics";
import {
  toLocalDateKey,
  getMondayStartKey,
  getMonthStartKey,
  getMonthEndKey,
  getSundayDateKey,
  getCdmxDateKey,
} from "../features/habits/utils/dates";
import { useAuth } from "./AuthContext";

type HabitsContextValue = {
  habits: Habit[];
  isLoading: boolean;
  streaksByHabitId: Record<string, number>;
  isStreaksLoading: boolean;
  categories: { id: string; name: string }[];
  isCategoriesLoading: boolean;
  refreshHabits: () => Promise<void>;
  refreshStreaks: () => Promise<void>;
  createHabitWithGoal: (payload: {
    name: string;
    description?: string;
    category: string;
    unit: string;
    goalAmount: number;
    goalType: "daily" | "weekly" | "monthly";
    type: Habit["type"];
  }) => Promise<void>;
  addEntry: (habitId: string, entry: Entry) => void;
  updateEntry: (habitId: string, entryId: string, amount: number) => void;
  deleteEntry: (habitId: string, entryId: string) => void;
  toggleArchive: (id: string) => Promise<void>;
  removeHabit: (id: string) => Promise<void>;
};

const HabitsContext = createContext<HabitsContextValue | null>(null);
const HABITS_CACHE_KEY = "habits_cache_v1:";
const parseDateKey = (value: string) => new Date(`${value}T00:00:00`);

const getExpectedMetricDate = (
  goalType: Habit["goalType"],
  todayKey: string,
) => {
  if (goalType === "daily") return todayKey;
  if (goalType === "weekly") return getSundayDateKey(todayKey);
  return getMonthEndKey(todayKey);
};

const calculateLocalStreak = (
  entries: Entry[],
  goalType: Habit["goalType"],
  goalAmount: number,
) => {
  if (entries.length === 0) return 0;
  if (goalType !== "daily" && goalAmount <= 0) return 0;

  const totalsByDay = entries.reduce<Record<string, number>>((acc, entry) => {
    const amount = Number(entry.amount);
    if (amount <= 0) return acc;
    const dateKey = toLocalDateKey(new Date(entry.date));
    acc[dateKey] = (acc[dateKey] || 0) + amount;
    return acc;
  }, {});

  const isDayComplete = (dateKey: string) => {
    const total = totalsByDay[dateKey] ?? 0;
    return goalAmount > 0 ? total >= goalAmount : total > 0;
  };

  if (goalType === "daily") {
    const todayKey = toLocalDateKey(new Date());
    const cursor = new Date();
    if (!isDayComplete(todayKey)) {
      cursor.setDate(cursor.getDate() - 1);
    }

    let streak = 0;
    while (true) {
      const key = toLocalDateKey(cursor);
      if (!isDayComplete(key)) break;
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  const totalsByPeriod = entries.reduce<Record<string, number>>(
    (acc, entry) => {
      const amount = Number(entry.amount);
      if (amount <= 0) return acc;
      const dateKey = toLocalDateKey(new Date(entry.date));
      const periodKey =
        goalType === "weekly"
          ? getMondayStartKey(dateKey)
          : getMonthStartKey(dateKey);
      acc[periodKey] = (acc[periodKey] || 0) + amount;
      return acc;
    },
    {},
  );

  const todayKey = toLocalDateKey(new Date());
  const currentPeriodKey =
    goalType === "weekly"
      ? getMondayStartKey(todayKey)
      : getMonthStartKey(todayKey);

  if ((totalsByPeriod[currentPeriodKey] ?? 0) < goalAmount) return 0;

  let streak = 0;
  let cursorKey = currentPeriodKey;
  while (true) {
    const total = totalsByPeriod[cursorKey] ?? 0;
    if (total < goalAmount) break;
    streak += 1;

    const cursorDate = parseDateKey(cursorKey);
    if (goalType === "weekly") {
      cursorDate.setDate(cursorDate.getDate() - 7);
      cursorKey = getMondayStartKey(toLocalDateKey(cursorDate));
    } else {
      cursorDate.setMonth(cursorDate.getMonth() - 1);
      cursorKey = getMonthStartKey(toLocalDateKey(cursorDate));
    }
  }

  return streak;
};

export function HabitsProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [streaksByHabitId, setStreaksByHabitId] = useState<
    Record<string, number>
  >({});
  const [isStreaksLoading, setIsStreaksLoading] = useState(false);
  const [categoryMap, setCategoryMap] = useState<Record<string, string>>({});
  const [categories, setCategories] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(true);
  const habitsRef = useRef<Habit[]>([]);

  const buildCategoryState = useCallback(
    (items: { id: string; name: string }[]) => ({
      nextCategories: items.map((category) => ({
        id: category.id,
        name: category.name,
      })),
      nextMap: items.reduce<Record<string, string>>((acc, category) => {
        acc[category.name] = category.id;
        return acc;
      }, {}),
    }),
    [],
  );

  useEffect(() => {
    habitsRef.current = habits;
  }, [habits]);

  useEffect(() => {
    let isMounted = true;
    setIsCategoriesLoading(true);
    listHabitCategories()
      .then((rawCategories) => {
        if (!isMounted) return;
        const { nextCategories, nextMap } = buildCategoryState(rawCategories);
        setCategories(nextCategories);
        setCategoryMap(nextMap);
      })
      .catch(() => {
        if (!isMounted) return;
        setCategories([]);
        setCategoryMap({});
      })
      .finally(() => {
        if (!isMounted) return;
        setIsCategoriesLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [buildCategoryState]);

  const refreshStreaks = useCallback(async () => {
    if (!session) {
      setStreaksByHabitId({});
      setIsStreaksLoading(false);
      return;
    }
    setIsStreaksLoading(true);
    try {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - 120);
      const from = toLocalDateKey(fromDate);
      const metrics = await listStreakMetrics(from);
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

      const nextMap: Record<string, number> = {};
      for (const habit of habitsRef.current) {
        const payload = latestByHabit[habit.id];
        const expectedDate = getExpectedMetricDate(habit.goalType, todayKey);

        const localFallback = calculateLocalStreak(
          habit.entries,
          habit.goalType,
          habit.goalAmount,
        );

        if (!payload) {
          nextMap[habit.id] = localFallback;
          continue;
        }

        if (payload.date < expectedDate) {
          nextMap[habit.id] = localFallback;
          continue;
        }

        nextMap[habit.id] = payload.value;
      }
      setStreaksByHabitId(nextMap);
    } finally {
      setIsStreaksLoading(false);
    }
  }, [session]);

  useEffect(() => {
    let isMounted = true;
    if (!session) {
      setHabits([]);
      setIsLoading(false);
      setHasHydrated(false);
      setStreaksByHabitId({});
      setIsStreaksLoading(false);
      return () => {
        isMounted = false;
      };
    }

    setHasHydrated(false);
    const cacheKey = `${HABITS_CACHE_KEY}${session.user.id}`;
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
  }, [session?.user.id]);

  const refreshHabits = useCallback(async () => {
    if (!session) {
      setHabits([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const rows = await listHabits();
      const mapped = rows.map<Habit>((row) => {
        const goal = Array.isArray(row.user_goals)
          ? row.user_goals[0]
          : row.user_goals;
        const goalValue = goal?.target_value;
        const parsedGoal =
          goalValue === undefined || goalValue === null ? 0 : Number(goalValue);
        return {
          id: row.id,
          name: row.name,
          description: row.description || undefined,
          category: row.category?.name ?? "Other",
          unit: row.unit ?? "",
          goalAmount: Number.isNaN(parsedGoal) ? 0 : parsedGoal,
          goalType: goal?.goal_type ?? "daily",
          type: row.type ?? "numeric",
          entries: [],
          archived: row.status === "archived",
        };
      });
      setHabits(mapped);

      if (mapped.length > 0) {
        const logs = await listLogsForHabits(mapped.map((habit) => habit.id));
        const grouped = logs.reduce<Record<string, Entry[]>>((acc, log) => {
          if (!acc[log.habit_id]) acc[log.habit_id] = [];
          acc[log.habit_id].push({
            id: log.id,
            date: log.logged_at ?? log.created_at,
            amount: log.value,
          });
          return acc;
        }, {});

        setHabits((prev) =>
          prev.map((habit) => ({
            ...habit,
            entries: grouped[habit.id] ?? [],
          })),
        );
      }

      await recalculateProfileMetrics().catch(() => {
        // ignore metrics refresh failures
      });

      await refreshStreaks();

      setTimeout(() => {
        refreshStreaks().catch(() => {
          // ignore delayed streak refresh failures
        });
      }, 1200);
    } finally {
      setIsLoading(false);
    }
  }, [refreshStreaks, session]);

  useEffect(() => {
    if (!session) {
      setHabits([]);
      setIsLoading(false);
      return;
    }
    if (!hasHydrated) return;
    refreshHabits().catch(() => {
      // ignore initial load failures here; UI can retry later
    });
  }, [session?.user.id, hasHydrated, refreshHabits]);

  useEffect(() => {
    if (!session || !hasHydrated) return;
    refreshStreaks().catch(() => {
      // ignore streak refresh failures here
    });
  }, [session?.user.id, hasHydrated, refreshStreaks]);

  useEffect(() => {
    if (!session || !hasHydrated) return;
    const cacheKey = `${HABITS_CACHE_KEY}${session.user.id}`;
    AsyncStorage.setItem(cacheKey, JSON.stringify(habits)).catch(() => {
      // ignore cache write failures
    });
  }, [habits, hasHydrated, session?.user.id]);

  const createHabitWithGoal = useCallback(
    async (payload: {
      name: string;
      description?: string;
      category: string;
      unit: string;
      goalAmount: number;
      goalType: "daily" | "weekly" | "monthly";
      type: Habit["type"];
    }) => {
      let categoryId = categoryMap[payload.category] ?? null;
      if (!categoryId) {
        const refreshed = await listHabitCategories();
        const { nextCategories, nextMap } = buildCategoryState(refreshed);
        setCategories(nextCategories);
        setCategoryMap(nextMap);
        categoryId = nextMap[payload.category] ?? null;
      }
      const resolvedUnit = payload.type === "binary" ? "Times" : payload.unit;

      const habit = await createHabit({
        category_id: categoryId,
        name: payload.name,
        description: payload.description ?? "",
        type: payload.type,
        unit: resolvedUnit,
        status: "active",
      });

      await upsertGoal(habit.id, payload.goalAmount, payload.goalType);

      setHabits((prev) => [
        {
          id: habit.id,
          name: habit.name,
          description: habit.description || undefined,
          category: payload.category,
          unit: resolvedUnit,
          goalAmount: payload.goalAmount,
          goalType: payload.goalType,
          type: payload.type,
          entries: [],
          archived: false,
        },
        ...prev,
      ]);
    },
    [buildCategoryState, categoryMap],
  );

  const updateHabitEntriesWithStreak = useCallback(
    (habitId: string, transformEntries: (entries: Entry[]) => Entry[]) => {
      setHabits((prev) => {
        let nextStreak: number | null = null;

        const nextHabits = prev.map((habit) => {
          if (habit.id !== habitId) return habit;

          const entries = transformEntries(habit.entries);
          nextStreak = calculateLocalStreak(
            entries,
            habit.goalType,
            habit.goalAmount,
          );

          return { ...habit, entries };
        });

        if (nextStreak !== null) {
          setStreaksByHabitId((current) => ({
            ...current,
            [habitId]: nextStreak as number,
          }));
        }

        return nextHabits;
      });
    },
    [],
  );

  const addEntry = useCallback(
    (habitId: string, entry: Entry) => {
      updateHabitEntriesWithStreak(habitId, (entries) => [...entries, entry]);
    },
    [updateHabitEntriesWithStreak],
  );

  const updateEntry = useCallback(
    (habitId: string, entryId: string, amount: number) => {
      updateHabitEntriesWithStreak(habitId, (entries) =>
        entries.map((entry) =>
          entry.id === entryId ? { ...entry, amount } : entry,
        ),
      );
    },
    [updateHabitEntriesWithStreak],
  );

  const deleteEntry = useCallback(
    (habitId: string, entryId: string) => {
      updateHabitEntriesWithStreak(habitId, (entries) =>
        entries.filter((entry) => entry.id !== entryId),
      );
    },
    [updateHabitEntriesWithStreak],
  );

  const toggleArchive = useCallback(
    async (id: string) => {
      const habit = habits.find((item) => item.id === id);
      if (!habit) return;
      const nextStatus = habit.archived ? "active" : "archived";
      await updateHabit(id, { status: nextStatus });
      setHabits((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, archived: !item.archived } : item,
        ),
      );
    },
    [habits],
  );

  const removeHabit = useCallback(async (id: string) => {
    await deleteHabit(id);
    setHabits((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const value = useMemo<HabitsContextValue>(
    () => ({
      habits,
      isLoading,
      streaksByHabitId,
      isStreaksLoading,
      categories,
      isCategoriesLoading,
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
      habits,
      isLoading,
      streaksByHabitId,
      isStreaksLoading,
      categories,
      isCategoriesLoading,
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
    <HabitsContext.Provider value={value}>{children}</HabitsContext.Provider>
  );
}

export function useHabits() {
  const context = useContext(HabitsContext);
  if (!context) {
    throw new Error("useHabits must be used within HabitsProvider");
  }
  return context;
}
