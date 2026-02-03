const { supabase } = require("../db/supabase");

// NOTE: Servicio de registros diarios (logs) por hábito.

/**
 * Crea un log.
 */
async function createLog(userId, habitId, payload) {
  const { data, error } = await supabase
    .from("habits_log")
    .insert({
      user_id: userId,
      habit_id: habitId,
      value: payload.value,
      metadata: payload.metadata || null,
      created_at: payload.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Lista logs por rango de fechas opcional.
 */
async function listLogs(userId, habitId, from, to) {
  let query = supabase
    .from("habits_log")
    .select("id, habit_id, value, metadata, created_at")
    .eq("user_id", userId)
    .eq("habit_id", habitId)
    .order("created_at", { ascending: false });

  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", to);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/**
 * Actualiza un log específico por id.
 */
async function updateLog(userId, habitId, logId, payload) {
  const updates = {
    ...(payload.value !== undefined ? { value: payload.value } : {}),
    ...(payload.metadata !== undefined ? { metadata: payload.metadata } : {}),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("habits_log")
    .update(updates)
    .eq("id", logId)
    .eq("habit_id", habitId)
    .eq("user_id", userId)
    .select("id, habit_id, value, metadata, created_at")
    .single();

  if (error) throw error;
  return data;
}

/**
 * Elimina un log específico por id.
 */
async function deleteLog(userId, habitId, logId) {
  const { error } = await supabase
    .from("habits_log")
    .delete()
    .eq("id", logId)
    .eq("habit_id", habitId)
    .eq("user_id", userId);

  if (error) throw error;
}

/**
 * Crea o actualiza el log del día indicado (YYYY-MM-DD).
 */
async function upsertLogByDate(userId, habitId, date, payload) {
  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(`${date}T23:59:59.999Z`);

  const { data: existing, error: findError } = await supabase
    .from("habits_log")
    .select("id, habit_id, value, metadata, created_at")
    .eq("user_id", userId)
    .eq("habit_id", habitId)
    .gte("created_at", start.toISOString())
    .lte("created_at", end.toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (findError) throw findError;

  if (existing) {
    return updateLog(userId, habitId, existing.id, payload);
  }

  return createLog(userId, habitId, {
    ...payload,
    created_at: start.toISOString(),
  });
}

module.exports = { createLog, listLogs, updateLog, deleteLog, upsertLogByDate };
