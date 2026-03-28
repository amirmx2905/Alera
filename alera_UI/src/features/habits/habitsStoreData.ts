import AsyncStorage from "@react-native-async-storage/async-storage";
import { upsertGoal } from "./services/goals";
import {
  createHabit,
  deleteHabit,
  listHabits,
  updateHabit,
} from "./services/habits";
import { listHabitCategories } from "./services/habitCategories";
import { listLogsForHabits } from "./services/logs";
import { recalculateProfileMetrics } from "./services/metrics";
import type { Habit } from "./types";

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
  addEntry: (habitId: string, entry: Habit["entries"][number]) => void;
  updateEntry: (habitId: string, entryId: string, amount: number) => void;
  deleteEntry: (habitId: string, entryId: string) => void;
  toggleArchive: (id: string) => Promise<void>;
  removeHabit: (id: string) => Promise<void>;
};

const HABITS_CACHE_KEY = "habits_cache_v1:";

export const loadHabitCategories = async () => {
  const items = await listHabitCategories();
  return {
    nextCategories: items.map((category) => ({
      id: category.id,
      name: category.name,
    })),
    nextMap: items.reduce<Record<string, string>>((acc, category) => {
      acc[category.name] = category.id;
      return acc;
    }, {}),
  };
};

export const loadHabitsData = async () => {
  const rows = await listHabits();
  const habits = rows.map<Habit>((row) => {
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
      createdAt: row.created_at,
      unit: row.unit ?? "",
      goalAmount: Number.isNaN(parsedGoal) ? 0 : parsedGoal,
      goalType: goal?.goal_type ?? "daily",
      type: row.type ?? "numeric",
      entries: [],
      archived: row.status === "archived",
    };
  });

  if (habits.length === 0) return habits;

  const logs = await listLogsForHabits(habits.map((habit) => habit.id));
  const grouped = logs.reduce<Record<string, Habit["entries"]>>((acc, log) => {
    if (!acc[log.habit_id]) acc[log.habit_id] = [];
    acc[log.habit_id].push({
      id: log.id,
      date: log.logged_at ?? log.created_at,
      amount: log.value,
    });
    return acc;
  }, {});

  return habits.map((habit) => ({
    ...habit,
    entries: grouped[habit.id] ?? [],
  }));
};

export const createHabitRecord = async (
  payload: CreateHabitWithGoalPayload,
  categoryId: string | null,
) => {
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

  return {
    id: habit.id,
    name: habit.name,
    description: habit.description || undefined,
    category: payload.category,
    createdAt: habit.created_at,
    unit: resolvedUnit,
    goalAmount: payload.goalAmount,
    goalType: payload.goalType,
    type: payload.type,
    entries: [],
    archived: false,
  } satisfies Habit;
};

export const toggleHabitArchiveStatus = async (
  id: string,
  isArchived: boolean,
) => {
  await updateHabit(id, { status: isArchived ? "active" : "archived" });
};

export const removeHabitRecord = async (id: string) => {
  await deleteHabit(id);
};

export const refreshHabitMetrics = async () => {
  await recalculateProfileMetrics().catch(() => {
    // ignore metrics refresh failures
  });
};

export const readCachedHabits = async (sessionUserId: string) => {
  const cached = await AsyncStorage.getItem(
    `${HABITS_CACHE_KEY}${sessionUserId}`,
  );
  if (!cached) return null;

  try {
    const parsed = JSON.parse(cached) as Habit[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const writeCachedHabits = async (
  sessionUserId: string,
  habits: Habit[],
) => {
  await AsyncStorage.setItem(
    `${HABITS_CACHE_KEY}${sessionUserId}`,
    JSON.stringify(habits),
  );
};
