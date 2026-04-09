import React, { useCallback, useMemo } from "react";
import {
  HabitsDataContext,
  HabitsActionsContext,
  type HabitsDataValue,
  type HabitsActionsValue,
} from "../../../state/HabitsStore";
import { useSupervisedHabits } from "../hooks/useSupervisedHabits";
import { useSupervisedActions } from "../hooks/useSupervisedActions";
import type { CreateHabitWithGoalPayload } from "../../habits/habitsStoreData";
import type { Entry } from "../../habits/types";

type Props = {
  profileId: string;
  children: React.ReactNode;
};

export function SupervisedHabitsProvider({ profileId, children }: Props) {
  const {
    habits,
    isLoading,
    streaksByHabitId,
    categories,
    isCategoriesLoading,
    categoryMap,
    refreshHabits,
  } = useSupervisedHabits(profileId);

  const { createHabitWithGoal, toggleArchive, removeHabit } =
    useSupervisedActions({ profileId, refreshHabits, categoryMap });

  // Supervised addEntry/updateEntry/deleteEntry are no-ops in the context
  // since the supervisor observes but the store refresh handles it.
  // For HabitDetailScreen to work, we provide stubs that call refreshHabits.
  const addEntry = useCallback(
    (_habitId: string, _entry: Entry) => {
      // Entry was already created via service; refresh to sync state
      refreshHabits().catch(() => {});
    },
    [refreshHabits],
  );

  const updateEntry = useCallback(
    (_habitId: string, _entryId: string, _amount: number) => {
      refreshHabits().catch(() => {});
    },
    [refreshHabits],
  );

  const deleteEntry = useCallback(
    (_habitId: string, _entryId: string) => {
      refreshHabits().catch(() => {});
    },
    [refreshHabits],
  );

  const wrappedToggleArchive = useCallback(
    async (id: string) => {
      const habit = habits.find((h) => h.id === id);
      await toggleArchive(id, Boolean(habit?.archived));
    },
    [habits, toggleArchive],
  );

  const refreshStreaks = useCallback(async () => {
    await refreshHabits();
  }, [refreshHabits]);

  const wrappedCreateHabitWithGoal = useCallback(
    async (payload: CreateHabitWithGoalPayload) => {
      await createHabitWithGoal({
        name: payload.name,
        description: payload.description,
        category: payload.category,
        unit: payload.unit,
        goalAmount: payload.goalAmount,
        goalType: payload.goalType,
        type: payload.type,
      });
    },
    [createHabitWithGoal],
  );

  const dataValue = useMemo<HabitsDataValue>(
    () => ({
      habits,
      isLoading,
      streaksByHabitId,
      isStreaksLoading: false,
      categories,
      isCategoriesLoading,
    }),
    [habits, isLoading, streaksByHabitId, categories, isCategoriesLoading],
  );

  const actionsValue = useMemo<HabitsActionsValue>(
    () => ({
      refreshHabits,
      refreshStreaks,
      createHabitWithGoal: wrappedCreateHabitWithGoal,
      addEntry,
      updateEntry,
      deleteEntry,
      toggleArchive: wrappedToggleArchive,
      removeHabit,
    }),
    [
      refreshHabits,
      refreshStreaks,
      wrappedCreateHabitWithGoal,
      addEntry,
      updateEntry,
      deleteEntry,
      wrappedToggleArchive,
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
