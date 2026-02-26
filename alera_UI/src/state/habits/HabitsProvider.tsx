import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Habit } from "../../features/habits/types";
import { useAuth } from "../AuthContext";
import type { HabitsContextValue } from "./habits.types";
import { useHabitCategories } from "./useHabitCategories";
import { useHabitStreaks } from "./useHabitStreaks";
import { useHabitsCache } from "./useHabitsCache";
import { useHabitCrud } from "./useHabitCrud";
import { useHabitEntries } from "./useHabitEntries";

const HabitsContext = createContext<HabitsContextValue | null>(null);

export function HabitsProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const sessionUserId = session?.user.id;

  const [habits, setHabits] = useState<Habit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const habitsRef = useRef<Habit[]>([]);

  useEffect(() => {
    habitsRef.current = habits;
  }, [habits]);

  const {
    categories,
    categoryMap,
    isCategoriesLoading,
    setCategories,
    setCategoryMap,
  } = useHabitCategories();

  const {
    streaksByHabitId,
    isStreaksLoading,
    refreshStreaks,
    setStreakForHabit,
    clearStreaks,
  } = useHabitStreaks({
    sessionUserId,
    habitsRef,
  });

  const onSessionMissing = useCallback(() => {
    setHabits([]);
    setIsLoading(false);
    clearStreaks();
  }, [clearStreaks]);

  const { hasHydrated } = useHabitsCache({
    sessionUserId,
    habits,
    setHabits,
    onSessionMissing,
  });

  const { refreshHabits, createHabitWithGoal, toggleArchive, removeHabit } =
    useHabitCrud({
      sessionUserId,
      habits,
      setHabits,
      setIsLoading,
      refreshStreaks,
      categoryMap,
      setCategories,
      setCategoryMap,
    });

  const { addEntry, updateEntry, deleteEntry } = useHabitEntries({
    setHabits,
    setStreakForHabit,
  });

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
  }, [sessionUserId, hasHydrated, refreshHabits]);

  useEffect(() => {
    if (!sessionUserId || !hasHydrated) return;
    refreshStreaks().catch(() => {
      // ignore streak refresh failures here
    });
  }, [sessionUserId, hasHydrated, refreshStreaks]);

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
