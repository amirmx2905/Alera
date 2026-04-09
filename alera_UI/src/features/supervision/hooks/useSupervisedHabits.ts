import { useCallback, useEffect, useState } from "react";
import { listHabits, type HabitRow } from "../../habits/services/habits";
import { listLogsForHabits } from "../../habits/services/logs";
import { listHabitCategories } from "../../habits/services/habitCategories";
import { calculateLocalStreak } from "../../habits/utils/habitStreaks";
import type { Habit } from "../../habits/types";

type HabitCategory = { id: string; name: string };

function mapRowsToHabits(rows: HabitRow[]): Habit[] {
  return rows.map((row) => {
    const goal = Array.isArray(row.user_goals)
      ? row.user_goals[0]
      : row.user_goals;
    const goalValue = goal?.target_value;
    const parsed =
      goalValue === undefined || goalValue === null ? 0 : Number(goalValue);

    return {
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      category: row.category?.name ?? "Other",
      createdAt: row.created_at,
      unit: row.unit ?? "",
      goalAmount: Number.isNaN(parsed) ? 0 : parsed,
      goalType: goal?.goal_type ?? "daily",
      type: row.type ?? "numeric",
      entries: [],
      archived: row.status === "archived",
    };
  });
}

export function useSupervisedHabits(profileId: string) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [streaksByHabitId, setStreaksByHabitId] = useState<
    Record<string, number>
  >({});
  const [categories, setCategories] = useState<HabitCategory[]>([]);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(true);
  const [categoryMap, setCategoryMap] = useState<Record<string, string>>({});

  const refreshHabits = useCallback(async () => {
    setIsLoading(true);
    try {
      const rows = await listHabits(profileId);
      let mapped = mapRowsToHabits(rows);

      if (mapped.length > 0) {
        const logs = await listLogsForHabits(
          mapped.map((h) => h.id),
          undefined,
          undefined,
          profileId,
        );
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
        mapped = mapped.map((h) => ({ ...h, entries: grouped[h.id] ?? [] }));
      }

      setHabits(mapped);

      // Compute streaks
      const streaks: Record<string, number> = {};
      mapped
        .filter((h) => !h.archived)
        .forEach((h) => {
          streaks[h.id] = calculateLocalStreak(
            h.entries,
            h.goalType,
            h.goalAmount,
          );
        });
      setStreaksByHabitId(streaks);
    } catch (err) {
      console.error("[useSupervisedHabits] load error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    refreshHabits();
  }, [refreshHabits]);

  useEffect(() => {
    listHabitCategories()
      .then((items) => {
        setCategories(items.map((c) => ({ id: c.id, name: c.name })));
        setCategoryMap(
          items.reduce<Record<string, string>>((acc, c) => {
            acc[c.name] = c.id;
            return acc;
          }, {}),
        );
      })
      .catch(() => {})
      .finally(() => setIsCategoriesLoading(false));
  }, []);

  return {
    habits,
    isLoading,
    streaksByHabitId,
    categories,
    isCategoriesLoading,
    categoryMap,
    refreshHabits,
  };
}
