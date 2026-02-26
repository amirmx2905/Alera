import type { Entry, Habit } from "../../features/habits/types";

export type HabitCategory = { id: string; name: string };

export type CreateHabitWithGoalPayload = {
  name: string;
  description?: string;
  category: string;
  unit: string;
  goalAmount: number;
  goalType: "daily" | "weekly" | "monthly";
  type: Habit["type"];
};

export type HabitsContextValue = {
  habits: Habit[];
  isLoading: boolean;
  streaksByHabitId: Record<string, number>;
  isStreaksLoading: boolean;
  categories: HabitCategory[];
  isCategoriesLoading: boolean;
  refreshHabits: () => Promise<void>;
  refreshStreaks: () => Promise<void>;
  createHabitWithGoal: (payload: CreateHabitWithGoalPayload) => Promise<void>;
  addEntry: (habitId: string, entry: Entry) => void;
  updateEntry: (habitId: string, entryId: string, amount: number) => void;
  deleteEntry: (habitId: string, entryId: string) => void;
  toggleArchive: (id: string) => Promise<void>;
  removeHabit: (id: string) => Promise<void>;
};
