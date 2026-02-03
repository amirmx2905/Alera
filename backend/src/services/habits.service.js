const { supabase } = require("../db/supabase");
const { createError } = require("../middleware/error");

// NOTE: Servicio de hábitos. Separa lógica de negocio del controlador.

/**
 * Crea un hábito para el usuario.
 * Valida conflictos por nombre único por usuario.
 */
async function createHabit(userId, payload) {
  const { data, error } = await supabase
    .from("habits")
    .insert({
      user_id: userId,
      name: payload.name,
      type: payload.type,
      unit: payload.unit || null,
    })
    .select()
    .single();

  if (error && error.code === "23505") {
    throw createError(409, "conflict", "Ya existe un hábito con ese nombre");
  }
  if (error) throw error;
  return data;
}

/**
 * Lista hábitos del usuario (ordenados por creación desc).
 */
async function listHabits(userId) {
  const { data, error } = await supabase
    .from("habits")
    .select("id, name, type, unit, created_at, updated_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Actualiza un hábito existente.
 * Maneja conflicto de nombre y not-found.
 */
async function updateHabit(userId, habitId, payload) {
  const updates = {
    ...(payload.name ? { name: payload.name } : {}),
    ...(payload.type ? { type: payload.type } : {}),
    ...(payload.unit !== undefined ? { unit: payload.unit } : {}),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("habits")
    .update(updates)
    .eq("id", habitId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error && error.code === "23505") {
    throw createError(409, "conflict", "Ya existe un hábito con ese nombre");
  }
  if (error && error.code === "PGRST116") {
    throw createError(404, "not_found", "Hábito no encontrado");
  }
  if (error) throw error;
  return data;
}

/**
 * Elimina un hábito por id.
 */
async function deleteHabit(userId, habitId) {
  const { error } = await supabase
    .from("habits")
    .delete()
    .eq("id", habitId)
    .eq("user_id", userId);

  if (error) throw error;
}

/**
 * Obtiene un hábito por id.
 */
async function getHabit(userId, habitId) {
  const { data, error } = await supabase
    .from("habits")
    .select("id, name, type, unit")
    .eq("id", habitId)
    .eq("user_id", userId)
    .single();

  if (error && error.code === "PGRST116") {
    throw createError(404, "not_found", "Hábito no encontrado");
  }

  if (error) throw error;
  return data;
}

/**
 * Busca un hábito por nombre (para upsert de goals).
 */
async function findHabitByName(userId, name) {
  const { data, error } = await supabase
    .from("habits")
    .select("id, name, type, unit")
    .eq("user_id", userId)
    .eq("name", name)
    .single();

  if (error && error.code === "PGRST116") {
    return null;
  }
  if (error) throw error;
  return data;
}

module.exports = {
  createHabit,
  listHabits,
  updateHabit,
  deleteHabit,
  getHabit,
  findHabitByName,
};
