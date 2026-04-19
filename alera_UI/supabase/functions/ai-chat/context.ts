import type { SupabaseClient } from "@supabase/supabase-js";
import { TIMEZONE } from "./config.ts";

type ContextItem = Record<string, unknown>;

type HabitRecord = {
  id: string;
  name: string;
  description: string;
  type: string;
  unit: string | null;
  status: string;
  created_at: string;
};

/**
 * Get a YYYY-MM-DD date key for a given Date in the configured timezone
 */
function toDateKeyInTZ(date: Date): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date);
}

function getTodayInCDMX(): string {
  return toDateKeyInTZ(new Date());
}

function getDaysAgoInCDMX(daysAgo: number): string {
  const now = new Date();
  now.setDate(now.getDate() - daysAgo);
  return toDateKeyInTZ(now);
}

export async function buildContext(
  supabase: SupabaseClient,
  profileId: string,
) {
  const today = getTodayInCDMX();
  const last7DaysStart = getDaysAgoInCDMX(7);
  const last3MonthsStart = getDaysAgoInCDMX(90);

  // Current state: ALL granularities for today
  // (streaks, goal_progress, averages, best_streak, active_days, etc.)
  const metricsSnapshotQuery = supabase
    .from("metrics")
    .select("habit_id, metric_type, granularity, value, date, metadata")
    .eq("profile_id", profileId)
    .eq("date", today);

  // Recent daily trends (last 7 days)
  const metricsTrendsQuery = supabase
    .from("metrics")
    .select("habit_id, metric_type, value, date")
    .eq("profile_id", profileId)
    .eq("granularity", "daily")
    .gte("date", last7DaysStart)
    .order("date", { ascending: false });

  // Long-term daily totals only (3 months, limited to save tokens)
  const metricsLongTermQuery = supabase
    .from("metrics")
    .select("habit_id, value, date")
    .eq("profile_id", profileId)
    .eq("granularity", "daily")
    .eq("metric_type", "daily_total")
    .gte("date", last3MonthsStart)
    .order("date", { ascending: false });

  const habitsQuery = supabase
    .from("habits")
    .select("id, name, description, type, unit, status, created_at")
    .eq("profile_id", profileId);

  // Last 20 messages for conversation injection
  const conversationsQuery = supabase
    .from("ai_conversations")
    .select("message, role, created_at")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(20);

  const goalsQuery = supabase
    .from("user_goals")
    .select("habit_id, goal_type, target_value, updated_at")
    .eq("profile_id", profileId)
    .order("updated_at", { ascending: false });

  const profileQuery = supabase
    .from("profiles")
    .select("id, first_name, last_name")
    .eq("id", profileId)
    .maybeSingle();

  // ML predictions (recent)
  const predictionsQuery = supabase
    .from("predictions")
    .select("habit_id, prediction_type, value, date")
    .eq("profile_id", profileId)
    .gte("date", last7DaysStart)
    .order("date", { ascending: false });

  const [
    { data: metricsSnapshot, error: snapshotError },
    { data: metricsTrends, error: trendsError },
    { data: metricsLongTerm, error: longTermError },
    { data: conversations, error: convError },
    { data: goals, error: goalsError },
    { data: habits, error: habitsError },
    { data: profile, error: profileError },
    { data: predictions, error: predictionsError },
  ] = await Promise.all([
    metricsSnapshotQuery,
    metricsTrendsQuery,
    metricsLongTermQuery,
    conversationsQuery,
    goalsQuery,
    habitsQuery,
    profileQuery,
    predictionsQuery,
  ]);

  if (snapshotError) throw snapshotError;
  if (trendsError) throw trendsError;
  if (longTermError) throw longTermError;
  if (convError) throw convError;
  if (goalsError) throw goalsError;
  if (habitsError) throw habitsError;
  if (profileError) throw profileError;
  if (predictionsError) throw predictionsError;

  const habitMap = new Map(
    (habits || []).map((habit: HabitRecord) => [habit.id, habit]),
  );
  const attachHabit = (items: ContextItem[]) =>
    (items || []).map((item) => ({
      ...item,
      habit: habitMap.get(item.habit_id as string) || null,
    }));

  // Reverse to chronological order for message injection
  const chronologicalHistory = [...(conversations ?? [])].reverse();

  return {
    today,
    profile: profile
      ? {
        id: profile.id,
        first_name: profile.first_name,
        last_name: profile.last_name,
      }
      : null,
    habits: habits ?? [],
    goals: (goals ?? []).map((goal: ContextItem) => ({
      ...goal,
      habit: habitMap.get(goal.habit_id as string) || null,
    })),
    metrics_snapshot: attachHabit(metricsSnapshot ?? []),
    metrics_trends: attachHabit(metricsTrends ?? []),
    metrics_long_term: attachHabit(metricsLongTerm ?? []),
    predictions: attachHabit(predictions ?? []),
    conversation_history: chronologicalHistory,
  };
}
