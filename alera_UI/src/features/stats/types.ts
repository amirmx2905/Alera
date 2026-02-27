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
  averageValue30: number | null;
  totalEntries: number;
  calendar30Days: StatsCalendarDay[];
};

export type StatsOverviewData = {
  kpis: StatsKpi;
  trend: StatsTrendPoint[];
  habits: StatsHabitListItem[];
};

export type HabitPredictionRisk = "low" | "medium" | "high";
export type HabitTrajectory = "excellent" | "good" | "declining" | "poor";

export type StreakRiskPrediction = {
  risk: HabitPredictionRisk;
  confidence: number;
  reason: string;
};

export type TrajectoryPrediction = {
  trajectory: HabitTrajectory;
  confidence: number;
  prediction: string;
};

export type GoalEtaPrediction = {
  eta: string;
  confidence: number;
  onTrack: boolean;
};

export type HabitPredictions = {
  streakRisk: StreakRiskPrediction;
  trajectory: TrajectoryPrediction;
  goalEta: GoalEtaPrediction;
};
