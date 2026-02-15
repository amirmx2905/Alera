import React, {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useMemo,
  useState,
} from "react";
import type { Habit } from "../types/habits";
import { listHabitCategories } from "../services/habitCategories";
import {
  createHabit,
  deleteHabit,
  listHabits,
  updateHabit,
} from "../services/habits";
import { upsertGoal } from "../services/goals";

type HabitsContextValue = {
  habits: Habit[];
  isLoading: boolean;
  categories: { id: string; name: string }[];
  isCategoriesLoading: boolean;
  refreshHabits: () => Promise<void>;
  createHabitWithGoal: (payload: {
    name: string;
    description?: string;
    category: string;
    unit: string;
    goalAmount: number;
    goalType: "daily" | "weekly" | "monthly";
  }) => Promise<void>;
  toggleArchive: (id: string) => Promise<void>;
  removeHabit: (id: string) => Promise<void>;
};

const HabitsContext = createContext<HabitsContextValue | null>(null);

export function HabitsProvider({ children }: { children: React.ReactNode }) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [categoryMap, setCategoryMap] = useState<Record<string, string>>({});
  const [categories, setCategories] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setIsCategoriesLoading(true);
    listHabitCategories()
      .then((categories) => {
        if (!isMounted) return;
        setCategories(
          categories.map((category) => ({
            id: category.id,
            name: category.name,
          })),
        );
        setCategoryMap(
          categories.reduce<Record<string, string>>((acc, category) => {
            acc[category.name] = category.id;
            return acc;
          }, {}),
        );
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
  }, []);

  useEffect(() => {
    let isMounted = true;
    refreshHabits().catch(() => {
      // ignore initial load failures here; UI can retry later
    });
    return () => {
      isMounted = false;
    };
  }, [refreshHabits]);

  const refreshHabits = useCallback(async () => {
    setIsLoading(true);
    try {
      const rows = await listHabits();
      const mapped = rows.map<Habit>((row) => {
        const goal = row.user_goals?.[0];
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
          entries: [],
          archived: row.status === "archived",
        };
      });
      setHabits(mapped);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createHabitWithGoal = useCallback(
    async (payload: {
      name: string;
      description?: string;
      category: string;
      unit: string;
      goalAmount: number;
      goalType: "daily" | "weekly" | "monthly";
    }) => {
      let categoryId = categoryMap[payload.category] ?? null;
      if (!categoryId) {
        const refreshed = await listHabitCategories();
        const refreshedMap = refreshed.reduce<Record<string, string>>(
          (acc, category) => {
            acc[category.name] = category.id;
            return acc;
          },
          {},
        );
        setCategoryMap(refreshedMap);
        setCategories(
          refreshed.map((category) => ({
            id: category.id,
            name: category.name,
          })),
        );
        categoryId = refreshedMap[payload.category] ?? null;
      }
      const habit = await createHabit({
        category_id: categoryId,
        name: payload.name,
        description: payload.description ?? "",
        type: "numeric",
        unit: payload.unit,
        status: "active",
      });

      await upsertGoal(habit.id, payload.goalAmount, payload.goalType);

      setHabits((prev) => [
        {
          id: habit.id,
          name: habit.name,
          description: habit.description || undefined,
          category: payload.category,
          unit: payload.unit,
          goalAmount: payload.goalAmount,
          goalType: payload.goalType,
          entries: [],
          archived: false,
        },
        ...prev,
      ]);
    },
    [categoryMap],
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
      categories,
      isCategoriesLoading,
      refreshHabits,
      createHabitWithGoal,
      toggleArchive,
      removeHabit,
    }),
    [
      habits,
      isLoading,
      categories,
      isCategoriesLoading,
      refreshHabits,
      createHabitWithGoal,
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
