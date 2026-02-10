import type { SupabaseClient } from "@supabase/supabase-js";
import { TIMEZONE } from "./datetime.ts";

type ContextItem = Record<string, unknown>;

type HabitRecord = {
  id: string;
  name: string;
  type: string;
  unit: string | null;
  status: string;
};

/**
 * Get today's date in CDMX timezone (YYYY-MM-DD format)
 */
function getTodayInCDMX(): string {
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: TIMEZONE }),
  );
  return now.toISOString().split("T")[0];
}

/**
 * Get date N days ago in CDMX timezone
 */
function getDaysAgoInCDMX(daysAgo: number): string {
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: TIMEZONE }),
  );
  now.setDate(now.getDate() - daysAgo);
  return now.toISOString().split("T")[0];
}

export async function buildContext(supabase: SupabaseClient, userId: string) {
  // All dates in CDMX timezone
  const today = getTodayInCDMX();
  const last7DaysStart = getDaysAgoInCDMX(7);
  const last3MonthsStart = getDaysAgoInCDMX(90);

  const metricsTodayQuery = supabase
    .from("metrics")
    .select("habit_id, metric_type, value, date")
    .eq("user_id", userId)
    .eq("granularity", "daily")
    .eq("date", today)
    .order("date", { ascending: false });

  const metricsLast7DaysQuery = supabase
    .from("metrics")
    .select("habit_id, metric_type, value, date")
    .eq("user_id", userId)
    .eq("granularity", "daily")
    .gte("date", last7DaysStart)
    .order("date", { ascending: false });

  const metricsLast3MonthsQuery = supabase
    .from("metrics")
    .select("habit_id, metric_type, value, date")
    .eq("user_id", userId)
    .eq("granularity", "daily")
    .gte("date", last3MonthsStart)
    .order("date", { ascending: false });

  const habitsQuery = supabase
    .from("habits")
    .select("id, name, type, unit, status")
    .eq("user_id", userId);

  const conversationsQuery = supabase
    .from("ai_conversations")
    .select("message, role, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  const goalsQuery = supabase
    .from("user_goals")
    .select("habit_id, target_value, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  const profileQuery = supabase
    .from("profiles")
    .select("id, username")
    .eq("id", userId)
    .maybeSingle();

  const [
    { data: metricsToday, error: metricsTodayError },
    { data: metricsLast7Days, error: metricsLast7DaysError },
    { data: metricsLast3Months, error: metricsLast3MonthsError },
    { data: conversations, error: convError },
    { data: goals, error: goalsError },
    { data: habits, error: habitsError },
    { data: profile, error: profileError },
  ] = await Promise.all([
    metricsTodayQuery,
    metricsLast7DaysQuery,
    metricsLast3MonthsQuery,
    conversationsQuery,
    goalsQuery,
    habitsQuery,
    profileQuery,
  ]);

  if (metricsTodayError) throw metricsTodayError;
  if (metricsLast7DaysError) throw metricsLast7DaysError;
  if (metricsLast3MonthsError) throw metricsLast3MonthsError;
  if (convError) throw convError;
  if (goalsError) throw goalsError;
  if (habitsError) throw habitsError;
  if (profileError) throw profileError;

  const habitMap = new Map(
    (habits || []).map((habit: HabitRecord) => [habit.id, habit]),
  );
  const attachHabit = (items: ContextItem[]) =>
    (items || []).map((item) => ({
      ...item,
      habit: habitMap.get(item.habit_id as string) || null,
    }));

  return {
    metrics_today: attachHabit(metricsToday ?? []),
    metrics_last_7_days: attachHabit(metricsLast7Days ?? []),
    metrics_last_3_months: attachHabit(metricsLast3Months ?? []),
    conversations: conversations ?? [],
    goals: (goals ?? []).map((goal: ContextItem) => ({
      ...goal,
      habit: habitMap.get(goal.habit_id as string) || null,
    })),
    habits: habits ?? [],
    profile: profile ? { id: profile.id, username: profile.username } : null,
  };
}
