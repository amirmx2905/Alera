import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

type ContextItem = Record<string, unknown>;

type HabitRecord = {
  id: string;
  name: string;
  type: string;
  unit: string | null;
  status: string;
};

export async function buildContext(supabase: SupabaseClient, userId: string) {
  const now = new Date();
  const todayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const todayEnd = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      23,
      59,
      59,
      999,
    ),
  );
  const last7DaysStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last3MonthsStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 3, now.getUTCDate()),
  );

  const metricsTodayQuery = supabase
    .from("metrics")
    .select("habit_id, metric_type, value, date")
    .eq("user_id", userId)
    .eq("granularity", "daily")
    .gte("date", todayStart.toISOString().slice(0, 10))
    .lte("date", todayEnd.toISOString().slice(0, 10))
    .order("date", { ascending: false });

  const metricsLast7DaysQuery = supabase
    .from("metrics")
    .select("habit_id, metric_type, value, date")
    .eq("user_id", userId)
    .eq("granularity", "daily")
    .gte("date", last7DaysStart.toISOString().slice(0, 10))
    .order("date", { ascending: false });

  const metricsLast3MonthsQuery = supabase
    .from("metrics")
    .select("habit_id, metric_type, value, date")
    .eq("user_id", userId)
    .eq("granularity", "daily")
    .gte("date", last3MonthsStart.toISOString().slice(0, 10))
    .order("date", { ascending: false });

  const habitsQuery = supabase
    .from("habits")
    .select("id, name, type, unit, status")
    .eq("user_id", userId);

  const conversationsQuery = supabase
    .from("ai_conversations")
    .select("message, role, created_at")
    .eq("user_id", userId)
    .gte("created_at", last7DaysStart.toISOString())
    .order("created_at", { ascending: false });

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
