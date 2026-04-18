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
  bestStreakUnit: "days" | "weeks" | "months";
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

// ---------------------------------------------------------------------------
// Predictions
// ---------------------------------------------------------------------------

export type PredictionTier = "locked" | "basic" | "full";

export type StreakRiskPrediction = {
  risk_score: number;
  risk_label: "low" | "medium" | "high";
  top_factors?: string[];
};

export type TrajectoryPrediction = {
  direction: "improving" | "declining" | "stable";
  rate_7d: number;
  predicted_rate_next_7d: number;
  confidence?: number;
  forecast?: number[];
  value_forecast?: number[];
  avg_hit_value?: number;
  avg_miss_value?: number;
  /** Rolling average of logged values over the last ~4 periods (numeric habits only). */
  recent_avg_value?: number;
};

export type GoalEtaPrediction = {
  estimated_days: number | null;
  on_track: boolean;
  projected_completion_rate: number;
};

export type BestReminderPrediction = {
  best_hour: number;
  best_period: "morning" | "afternoon" | "evening" | "night";
  distribution: number[];
};

export type HabitPredictions = {
  tier: PredictionTier;
  /** Calendar days elapsed since the habit was created. */
  uniqueDays: number;
  /** Distinct periods (days/weeks/months) that have at least one log entry. */
  loggedPeriods?: number;
  daysToNextTier: number;
  streakRisk: StreakRiskPrediction | null;
  trajectory: TrajectoryPrediction | null;
  goalEta: GoalEtaPrediction | null;
  bestReminder: BestReminderPrediction | null;
};

export type GoalProjectionPoint = {
  label: string;
  dateKey: string;
  value: number;
  isActual: boolean;
  isCurrent: boolean;
};
