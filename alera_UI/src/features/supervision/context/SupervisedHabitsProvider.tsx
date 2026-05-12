import React, { useCallback, useMemo } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  HabitsContext,
  type HabitsContextValue,
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
    refreshCategories,
    refreshHabits,
  } = useSupervisedHabits(profileId);

  const { createHabitWithGoal, toggleArchive, removeHabit } =
    useSupervisedActions({ profileId, refreshHabits, categoryMap });

  useFocusEffect(
    useCallback(() => {
      refreshHabits();
    }, [refreshHabits]),
  );

  // Entry mutations are no-ops for supervised view — supervisor observes only.
  const addEntry = useCallback(
    (_habitId: string, _entry: Entry) => {
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

  const contextValue = useMemo<HabitsContextValue>(
    () => ({
      habits,
      isLoading,
      streaksByHabitId,
      isStreaksLoading: false,
      categories,
      isCategoriesLoading,
      refreshCategories,
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
      habits,
      isLoading,
      streaksByHabitId,
      categories,
      isCategoriesLoading,
      refreshCategories,
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
    <HabitsContext.Provider value={contextValue}>
      {children}
    </HabitsContext.Provider>
  );
}
