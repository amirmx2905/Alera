const { supabase } = require("../db/supabase");

// NOTE: Servicio de objetivos (1 objetivo por hábito).

/**
 * Crea o actualiza un objetivo para un hábito.
 */
async function upsertGoal(userId, habitId, targetValue) {
  const { data, error } = await supabase
    .from("user_goals")
    .upsert(
      {
        user_id: userId,
        habit_id: habitId,
        target_value: targetValue,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "habit_id" },
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Obtiene el objetivo por hábito.
 */
async function getGoal(userId, habitId) {
  const { data, error } = await supabase
    .from("user_goals")
    .select("id, habit_id, target_value, created_at")
    .eq("user_id", userId)
    .eq("habit_id", habitId)
    .single();

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  return data || null;
}

/**
 * Elimina el objetivo por hábito.
 */
async function deleteGoal(userId, habitId) {
  const { error } = await supabase
    .from("user_goals")
    .delete()
    .eq("user_id", userId)
    .eq("habit_id", habitId);

  if (error) throw error;
}

module.exports = { upsertGoal, getGoal, deleteGoal };
