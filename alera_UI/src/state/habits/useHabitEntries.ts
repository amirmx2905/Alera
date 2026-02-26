import { useCallback } from "react";
import type { Entry, Habit } from "../../features/habits/types";
import { calculateLocalStreak } from "./habits.helpers";

type UseHabitEntriesParams = {
  setHabits: React.Dispatch<React.SetStateAction<Habit[]>>;
  setStreakForHabit: (habitId: string, streak: number) => void;
};

export function useHabitEntries({
  setHabits,
  setStreakForHabit,
}: UseHabitEntriesParams) {
  const updateHabitEntriesWithStreak = useCallback(
    (habitId: string, transformEntries: (entries: Entry[]) => Entry[]) => {
      setHabits((prev) => {
        let nextStreak: number | undefined;

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

        if (nextStreak !== undefined) {
          setStreakForHabit(habitId, nextStreak);
        }

        return nextHabits;
      });
    },
    [setHabits, setStreakForHabit],
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

  return {
    addEntry,
    updateEntry,
    deleteEntry,
  };
}
