import type { Habit } from "../habits/types";

export type StatsGranularity = "daily" | "weekly" | "monthly";

export type StatsKpi = {
  totalHabits: number;
  completionRate: number;
  completedCount: number;
  totalPossible: number;
  activeDays30: number;
  bestStreak: number;
  bestStreakHabit: string;
};

export type StatsTrendPoint = {
  dateKey: string;
  label: string;
  totalEntries: number;
};

export type StatsHabitListItem = {
  habitId: string;
  name: string;
  category: string;
  completionCount: number;
  completionWindowTotal: number;
  completionUnit: "days" | "weeks" | "months";
  streak: number;
  totalEntries: number;
  entriesInSelectedPeriod: number;
};

export type StatsCalendarDay = {
  dateKey: string;
  dayLabel: string;
  dayNumber: string;
  completed: boolean;
  amount: number;
  isToday: boolean;
};

export type StatsHabitDetail = {
  habit: Habit;
  streak: number;
  completionCountWindow: number;
  completionWindowTotal: number;
  completionUnit: "days" | "weeks" | "months";
  activeDays30: number;
  averageValue30: number | null;
  totalAmount30: number;
  totalAmountAllTime: number;
  totalEntries: number;
  calendar30Days: StatsCalendarDay[];
};

export type StatsOverviewData = {
  kpis: StatsKpi;
  trend: StatsTrendPoint[];
  habits: StatsHabitListItem[];
};
