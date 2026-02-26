import { useCallback } from "react";
import type { Habit } from "../../features/habits/types";
import {
  createHabit,
  deleteHabit,
  listHabits,
  updateHabit,
} from "../../features/habits/services/habits";
import { listLogsForHabits } from "../../features/habits/services/logs";
import { upsertGoal } from "../../features/habits/services/goals";
import { recalculateProfileMetrics } from "../../features/habits/services/metrics";
import { listHabitCategories } from "../../features/habits/services/habitCategories";
import { buildCategoryState } from "./habits.helpers";
import type { CreateHabitWithGoalPayload, HabitCategory } from "./habits.types";

type UseHabitCrudParams = {
  sessionUserId?: string;
  habits: Habit[];
  setHabits: React.Dispatch<React.SetStateAction<Habit[]>>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  refreshStreaks: () => Promise<void>;
  categoryMap: Record<string, string>;
  setCategories: React.Dispatch<React.SetStateAction<HabitCategory[]>>;
  setCategoryMap: React.Dispatch<React.SetStateAction<Record<string, string>>>;
};

export function useHabitCrud({
  sessionUserId,
  habits,
  setHabits,
  setIsLoading,
  refreshStreaks,
  categoryMap,
  setCategories,
  setCategoryMap,
}: UseHabitCrudParams) {
  const refreshHabits = useCallback(async () => {
    if (!sessionUserId) {
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
        const grouped = logs.reduce<Record<string, Habit["entries"]>>(
          (acc, log) => {
            if (!acc[log.habit_id]) acc[log.habit_id] = [];
            acc[log.habit_id].push({
              id: log.id,
              date: log.logged_at ?? log.created_at,
              amount: log.value,
            });
            return acc;
          },
          {},
        );

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
  }, [refreshStreaks, sessionUserId, setHabits, setIsLoading]);

  const createHabitWithGoal = useCallback(
    async (payload: CreateHabitWithGoalPayload) => {
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
    [categoryMap, setCategories, setCategoryMap, setHabits],
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
    [habits, setHabits],
  );

  const removeHabit = useCallback(
    async (id: string) => {
      await deleteHabit(id);
      setHabits((prev) => prev.filter((item) => item.id !== id));
    },
    [setHabits],
  );

  return {
    refreshHabits,
    createHabitWithGoal,
    toggleArchive,
    removeHabit,
  };
}
