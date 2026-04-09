import { useCallback } from "react";
import { createHabit } from "../../habits/services/habits";
import { updateHabit, deleteHabit } from "../../habits/services/habits";
import { upsertGoal } from "../../habits/services/goals";
import { recalculateProfileMetrics } from "../../habits/services/metrics";
import type { Habit } from "../../habits/types";

type UseSupervisedActionsParams = {
  profileId: string;
  refreshHabits: () => Promise<void>;
  categoryMap: Record<string, string>;
};

export function useSupervisedActions({
  profileId,
  refreshHabits,
  categoryMap,
}: UseSupervisedActionsParams) {
  const createHabitWithGoal = useCallback(
    async (payload: {
      name: string;
      description?: string;
      category: string;
      unit: string;
      goalAmount: number;
      goalType: Habit["goalType"];
      type: Habit["type"];
    }) => {
      const resolvedUnit = payload.type === "binary" ? "Times" : payload.unit;
      const categoryId = categoryMap[payload.category] ?? null;

      const habit = await createHabit(
        {
          category_id: categoryId,
          name: payload.name,
          description: payload.description ?? "",
          type: payload.type,
          unit: resolvedUnit,
          status: "active",
        },
        profileId,
      );

      await upsertGoal(
        habit.id,
        payload.goalAmount,
        payload.goalType,
        profileId,
      );

      recalculateProfileMetrics(profileId).catch(() => {});
      await refreshHabits();
    },
    [profileId, categoryMap, refreshHabits],
  );

  const toggleArchive = useCallback(
    async (habitId: string, isCurrentlyArchived: boolean) => {
      await updateHabit(
        habitId,
        { status: isCurrentlyArchived ? "active" : "archived" },
        profileId,
      );
      await refreshHabits();
    },
    [profileId, refreshHabits],
  );

  const removeHabit = useCallback(
    async (habitId: string) => {
      await deleteHabit(habitId, profileId);
      await refreshHabits();
    },
    [profileId, refreshHabits],
  );

  return { createHabitWithGoal, toggleArchive, removeHabit };
}
