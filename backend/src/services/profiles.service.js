const { supabase } = require("../db/supabase");
const { createError } = require("../middleware/error");

// NOTE: Servicio de perfiles (username único por usuario).

/**
 * Crea perfil para el usuario actual.
 */
async function createProfile(userId, username) {
  const { data, error } = await supabase
    .from("profiles")
    .insert({
      id: userId,
      username,
    })
    .select("id, username, created_at")
    .single();

  if (error && error.code === "23505") {
    throw createError(409, "conflict", "Username ya existe");
  }
  if (error) throw error;
  return data;
}

/**
 * Obtiene perfil del usuario actual.
 */
async function getProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, created_at")
    .eq("id", userId)
    .single();

  if (error && error.code === "PGRST116") {
    return null;
  }
  if (error) throw error;
  return data;
}

/**
 * Actualiza username del perfil del usuario actual.
 */
async function updateProfile(userId, username) {
  const { data, error } = await supabase
    .from("profiles")
    .update({
      username,
    })
    .eq("id", userId)
    .select("id, username, created_at")
    .single();

  if (error && error.code === "23505") {
    throw createError(409, "conflict", "Username ya existe");
  }
  if (error && error.code === "PGRST116") {
    throw createError(404, "not_found", "Perfil no encontrado");
  }
  if (error) throw error;
  return data;
}

module.exports = { createProfile, getProfile, updateProfile };
